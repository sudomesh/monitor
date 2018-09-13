var bodyParser = require('body-parser')
var express = require('express');
var logger = require('morgan');
var path = require('path');
var winston = require('winston');
var memjs = require('memjs').Client;
var _ = require('underscore');

var util = require('./util');

const logFile = process.MONITOR_LOG_FILE || 'nodejs.log';  
// Setup log file for file uploads
winston.add(winston.transports.File, { filename: logFile });

// Continue exporting an instance for now for back compat, but consider exporting MonitorApp factory instead
module.exports = MonitorApp();
module.exports.MonitorApp = MonitorApp

/**
 * Create an http request listener (and express app) for the PON Monitor App
 */
function MonitorApp ({
  app=express(),
  // Only ips in this list are allowed to POST monitor updates
  exitNodeIPs=['45.34.140.42', '64.71.176.94'],
  mjs=memjs.create(),
  db=null,
}={}) {
  app.use(express.urlencoded());
  app.use(express.json());
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(logger('dev'));
  app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
  app.use(express.static(path.join(__dirname, 'public')));
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

  async function getMonitorUpdates() {
    return await Promise.all(exitNodeIPs.map(async ip => {
      let d = await getCacheData(`alive-${ip}`);
      d = d ? d : { error: util.noCheckInMessage(ip) };
      d.ip = ip;
      return d;
    }));
  }

  async function getRoutingTableUpdates() {
    return await Promise.all(exitNodeIPs.map(async ip => {
      let routingTable = await getCacheData(`routing-table-${ip}`);
      if (routingTable) {
        return {
          routingTable: routingTable,
          exitNodeIP: ip
        };
      } else {
        return {
          error: util.noCheckInMessage(ip),
          exitNodeIP: ip
        };
      }
    }));
  }

  // 
  // HTML Routes
  // 

  // Home Page
  app.get('/', asyncMiddleware(async function(req, res, next) {
    let updates = await getMonitorUpdates();
    let exitNodes = await getRoutingTableUpdates();
    
    exitNodes.forEach(exitNode => {
      if (exitNode.routingTable) {
        // Sort routing tables by gateway
        exitNode.routingTable = _.sortBy(exitNode.routingTable, (node) => {
          return node.gatewayIP;
        });
        
        // Sort routing tables by timestamp descending 
        exitNode.routingTable = _.sortBy(exitNode.routingTable, (node) => {
          return -1 * new Date(node.timestamp);
        });
      }
    });

    res.render('index', {
      updates: updates,
      nodes: exitNodes,
      timeAgo: util.timeAgo
    });
  }));

  // 
  // API Routes
  // 

  app.get('/api/v0/monitor', asyncMiddleware(async function(req, res, next) {
    res.json(await getMonitorUpdates());
  }));

  app.post('/api/v0/monitor', ipAuthMiddleware(exitNodeIPs), function(req, res) {
    let ip = util.getRequestIP(req);
    const key = `alive-${ip}`;
    let handleErr = function(err) {
      if (err) {
        return res.status(502).json({ error: 'Could not set key, because of [' + err + '].' });
      }
      return res.json({ message: 'Set attached values', result: processed });
    };
    const processed = util.processUpdate(req);
    if (processed.error) {
      return res.status(400).json(processed);
    } else {
      mjs.set(key, JSON.stringify(processed), {expires: 120}, handleErr);
    }
  });

  app.get('/api/v0/nodes', asyncMiddleware(async function(req, res) {
    let data = await getRoutingTableUpdates();
    res.json(data);
  }));

  app.post('/api/v0/nodes', ipAuthMiddleware(exitNodeIPs), bodyParser.text(),
           asyncMiddleware(async function (req, res) {
    let ip = util.getRequestIP(req);
    let key = `routing-table-${ip}`;
    let routeString = req.body;
    console.log(`Received routing table update: ${routeString}`);
    
    // Trim trailing | if it exists. Consider changing post-routing-table.sh
    // to not send a trailing |?
    if (routeString.endsWith('|')) {
      routeString = routeString.slice(0,-1);
    }

    let now = new Date();
    let newRoutes = routeString.split('|').map((route) => {
      let [nodeIP, gatewayIP] = route.split(',');
      return {
        "timestamp": now,
        "nodeIP": nodeIP,
        "gatewayIP": gatewayIP
      };
    });

    // Merge new routes with old routes (if we have any).
    // Routes are keyed on nodeIP (i.e. the route destination). This means
    // we overwrite old routes when the gateway changes, so long as the destination
    // remains the same.
    let oldRoutingTables = await getRoutingTableUpdates();
    let oldRoutingTable = oldRoutingTables.find((rt) => rt.exitNodeIP === ip);
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
    
    // Add new routes to mongo db log. Used for generating timeseries.
    db.collection('routeLog').insertOne({
      'timestamp': now,
      // can omit timestamp from each route object since they're all the same
      'routes': newRoutes.map((r) => _.omit(r, 'timestamp'))
    });

  }));

  app.get('/api/v0/numNodesTimeseries', asyncMiddleware(async function(req, res) {
    let numNodes = [];
    let numGateways = [];
    let timestamps = [];
    
    let now = new Date();
    let yesterday = new Date(now - 1000 * 60 * 60 * 24);
    let toDate = now;
    let fromDate = yesterday;
    if (req.query.from)
      fromDate = new Date(req.query.from);
    if (req.query.to)
      toDate = new Date(req.query.to);

    await db.collection('routeLog')
      .find({
        timestamp: {
          '$lt': toDate,
          '$gte': fromDate
        }
      })
      .forEach((routeLog) => {
        timestamps.push(routeLog.timestamp);
        numGateways.push(_.unique(routeLog.routes, (route) => route.gatewayIP).length);
        numNodes.push(_.unique(routeLog.routes, (route) => route.nodeIP).length);
      });

    res.json({ numNodes, numGateways, timestamps });
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

  app.exitNodeIPs = exitNodeIPs;
  return app
}

// 
// Middleware
// 

function ipAuthMiddleware (exitNodeIPs) {
  return (req, res, next) => {
    const ip = util.getRequestIP(req);
    if (exitNodeIPs.includes(ip)) {
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
