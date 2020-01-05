var bodyParser = require('body-parser')
var express = require('express');
var logger = require('morgan');
var path = require('path');
var winston = require('winston');
var memjs = require('memjs').Client;
var _ = require('underscore');

var defaultExitnodeIPs = require('./exitnodeIPs');
var util = require('./util');

const logFile = process.MONITOR_LOG_FILE || 'nodejs.log';  
// Setup log file for file uploads
winston.add(winston.transports.File, { filename: logFile });

module.exports.MonitorApp = MonitorApp;

/**
 * Create an http request listener (and express app) for the PON Monitor App
 */
function MonitorApp ({
  app=express(),
  // Only ips in this list are allowed to POST monitor updates
  exitnodeIPs=defaultExitnodeIPs,
  mjs=memjs.create(),
  db=undefined,
}={}) {

  if (!db) {
    console.error('ERROR: MonitorApp needs a db.')
    process.exit(1);
    return;
  }

  app.use(express.urlencoded());
  app.use(express.json());
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'jade');
  app.use(logger('dev'));
  app.use(require('less-middleware')({ src: path.join(__dirname, '../public') }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(app.router);

  //
  // DB Helpers
  // 

  /**
   * Get a data object from memcache by key
   * @param {String} key - memcache key to read
   * @returns {Object|undefined} - parsed Object from memcache. undefined if key is not in memcache 
   */
  async function getCacheData(key) {
    const { value } = await mjs.get(key);
    return JSON.parse(value);
  }

  function countActiveRoutesByExitnode() {
    // Report a count of unique nodes and gateways connected to exitnodes
    // If an exitnode has not checked in in the last two minutes, report an error message
    return Promise.all(exitnodeIPs.map(async ip => {
      const twoMinutesAgo = new Date(new Date() - 2 * 60 * 1000); 
      const [mostRecentLog] = await db.collection('routeLog')
        .find({ 
          exitnodeIP: ip, 
          timestamp: { $gt: twoMinutesAgo }
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (!mostRecentLog) 
        return { error: util.noCheckInMessage(ip) };
      
      return {
        exitnodeIP: ip,
        numberOfRoutes: _.unique(mostRecentLog.routes.map(r => r.nodeIP)).length,
        numberOfGateways: _.unique(mostRecentLog.routes.map(r => r.gatewayIP)).length
      };
    }));
  }

  async function getRoutingTableUpdates() {
    return await Promise.all(exitnodeIPs.map(async ip => {
      let routingTable = await getCacheData(`routing-table-${ip}`);
      if (routingTable) {
        return {
          routingTable: routingTable,
          exitnodeIP: ip
        };
      } else {
        return {
          error: util.noCheckInMessage(ip),
          exitnodeIP: ip
        };
      }
    }));
  }

  // 
  // HTML Routes
  // 

  // Home Page
  app.get('/', asyncMiddleware(async function(req, res, next) {
    const routeCounts = await countActiveRoutesByExitnode();
    const exitnodes = await getRoutingTableUpdates();
    
    exitnodes.forEach(exitnode => {
      if (exitnode.routingTable) {
        // Sort routing tables by gateway
        exitnode.routingTable = _.sortBy(exitnode.routingTable, (node) => {
          return node.gatewayIP;
        });
        
        // Sort routing tables by timestamp descending 
        exitnode.routingTable = _.sortBy(exitnode.routingTable, (node) => {
          return -1 * new Date(node.timestamp);
        });
      }
    });

    res.render('index', {
      routeCounts, 
      nodes: exitnodes,
      timeAgo: util.timeAgo
    });
  }));

  // 
  // API Routes
  // 

  app.get('/api/v0/monitor', asyncMiddleware(async function(req, res, next) {
    res.json(await countActiveRoutesByExitnode());
  }));

  app.get('/api/v0/nodes', asyncMiddleware(async function(req, res) {
    let data = await getRoutingTableUpdates();
    res.json(data);
  }));

  app.post('/api/v0/nodes', ipAuthMiddleware(exitnodeIPs), bodyParser.text(),
           asyncMiddleware(async function (req, res) {
    let exitnodeIP = util.getRequestIP(req);
    let key = `routing-table-${exitnodeIP}`;
    let routeString = req.body;
    console.log(`Received routing table update: ${routeString}`);
    
    // Trim trailing | if it exists. Consider changing post-routing-table.sh
    // to not send a trailing |?
    if (routeString.endsWith('|')) {
      routeString = routeString.slice(0,-1);
    }

    let now = new Date();
    let newRoutes = routeString.split('|')
      .map((route) => {
        let [nodeIP, gatewayIP] = route.split(',');
        return {
          "timestamp": now,
          "nodeIP": nodeIP,
          "gatewayIP": gatewayIP
        };
      })
      .filter((route) => {
        // Currently nodeIP and gatewayIP can be any non-whitespace-only strings.
        // In the future, we might want to check that they are IP-like strings.
        return route.nodeIP && 
               route.nodeIP.trim() !== '' &&
               route.gatewayIP &&
               route.gatewayIP.trim() !== '';
      });

    // Add new routes to mongo db log. Used for generating timeseries.
    db.collection('routeLog').insertOne({
      'timestamp': now,
      'exitnodeIP': exitnodeIP,
      // can omit timestamp from each route object since they're all the same
      'routes': newRoutes.map((r) => _.omit(r, 'timestamp'))
    });

    // Merge new routes with old routes (if we have any).
    // Routes are keyed on nodeIP (i.e. the route destination). This means
    // we overwrite old routes when the gateway changes, so long as the destination
    // remains the same.
    let oldRoutingTables = await getRoutingTableUpdates();
    let oldRoutingTable = oldRoutingTables.find((rt) => rt.exitnodeIP === exitnodeIP);
    if (oldRoutingTable && oldRoutingTable.routingTable) {
      let oldRoutes = oldRoutingTable.routingTable;
      for (let oldRoute of oldRoutes) {
        if (newRoutes.find((r) => r.nodeIP === oldRoute.nodeIP)) {
          continue;
        } else {
          newRoutes.push(oldRoute);
        }
      }
    }
    
    let handleErr = function(err) {
      if (err) {
          console.log("Error setting key: " + err);
          return res.status(502).json({ error: 'Could not set key' });
      }
      return res.json({
          "message": "It Worked!",
          "data": newRoutes 
      });
    };
    
    // Store in memcache db
    // TODO: deprecate memcache db. just use mongo for everything.
    mjs.set(key, JSON.stringify(newRoutes), {}, handleErr);

  }));
  
  app.get('/api/v0/numNodesTimeseries', asyncMiddleware(async function(req, res) {
    let now = new Date();
    let yesterday = new Date(now - 1000 * 60 * 60 * 24);
    let toDate = now;
    let fromDate = yesterday;
    if (req.query.from)
      fromDate = new Date(req.query.from);
    if (req.query.to)
      toDate = new Date(req.query.to);

    let exitnodes = await db.collection('routeLog')
      .aggregate([
        {
          '$match': {
            'timestamp': {
              '$lt': toDate,
              '$gte': fromDate
            }    
          }
        },
        { '$sort': { 'timestamp': 1 } },
        {
          '$group': {
            '_id': '$exitnodeIP',
            'timestamps': { $push: '$timestamp' },
            'routeLogs': { $push: '$routes' }
          }
        }
      ])
      .toArray();

    exitnodes = exitnodes.map((exitnode) => {
      return {
        label: exitnode._id,
        timestamps: exitnode.timestamps,
        // convert logs of route tables to counts of nodes/gateways
        gatewayCounts: exitnode.routeLogs.map((routeLog) => {
          return _.unique(routeLog, (route) => route.gatewayIP).length;
        }),
        nodeCounts: exitnode.routeLogs.map((routeLog) => {
          return _.unique(routeLog, (route) => route.nodeIP).length;
        })
      }
    });

    // Calculate the total number of unique nodes and gateways between all exitnodes
    const intervalMinutes = 5;
    const totals = await db.collection('routeLog')
      .aggregate([
        {
          '$match': {
            'timestamp': {
              '$lt': toDate,
              '$gte': fromDate
            }
          }
        },
        { $unwind: '$routes' },
        {
          // Group route logs into intervals of <intervalMinutes>
          $group: {
            _id: {
              // Only group together logs that share the same, year, day, hour, and interval
              year: { $year: '$timestamp' },
              day: { $dayOfYear: '$timestamp' },
              hour: { $hour: '$timestamp' },
              // <interval> is labeled with the low-end of the interval.
              // E.g. minute 31 and 34 are in interval 30. Minute 37 is in interval 35.
              interval: {
                $subtract: [
                  { $minute: '$timestamp' },
                  { $mod: [{ $minute: '$timestamp' }, intervalMinutes ] }
                ]
              }
            },
            timestamp: { $max: '$timestamp' },
            nodeIPs: { $addToSet: '$routes.nodeIP' },
            gatewayIPs: { $addToSet: '$routes.gatewayIP' }
          }
        },
        // Sort by all _id fields in time ascending order
        { $sort: { _id: 1 } },
        {
          // Collapse into a single document
          // Get counts of nodes/gateways
          $group: {
            _id: null,
            timestamps: { $push: '$timestamp' },
            nodeCounts : { $push: { $size: '$nodeIPs' } },
            gatewayCounts : { $push: { $size: '$gatewayIPs' } }
          }
        }
      ])
      .toArray();

    totals[0].label = 'total nodes';
    res.json([...exitnodes, ...totals]);
  }));

  // Error Handlers
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
      message: err.message,
      // only render full error in development env
      error: (app.get('env') === 'development') ? err : {}
    })
  })

  return app;
}

// 
// Middleware
// 

function ipAuthMiddleware (exitnodeIPs) {
  return (req, res, next) => {
    const ip = util.getRequestIP(req);
    if (exitnodeIPs.includes(ip)) {
      console.log('Received update from exit node ' + ip);
      next();
    } else {
      console.log('Received update from unfamiliar IP: [' + ip + ']');
      return res.status(403).json({ error: "You aren't an exit node." });
    }
  }
}

/**
 * wrap a function that returns promise and return an express middleware
 * @param {Function} fn - A function that accepts (req, res, next) and returns promise 
 * @returns {Function} an express middleware (request handler)
 */
function asyncMiddleware (fn) { return (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}}
