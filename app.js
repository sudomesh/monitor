var bodyParser = require('body-parser')
var express = require('express');
var logger = require('morgan');
var path = require('path');
var winston = require('winston');
var memjs = require('memjs').Client;
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
}={}) {
  app.use(express.urlencoded());
  app.use(express.json());
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(logger('dev'));
  app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);

  /**
   * Get a data object from memcache by key
   * @param {String} key - memcache key to read
   * @returns {Object|undefined} - parsed Object from memcache. undefined if key is not in memcache 
   */
  async function getCacheData(key) {
    const { value } = await mjs.get(key)
    const data = JSON.parse(value)
    return data
  }

  async function getMonitorUpdates() {
    // map since we have to return to trigger Promise.all
    return await Promise.all(exitNodeIPs.map(async ip => {
      let d = await getCacheData(`alive-${ip}`);
      d = d ? d : { error: util.noCheckInMessage(ip) };
      d.ip = ip;
      return d;
    }));
  }

  // Home Page
  app.get('/', asyncMiddleware(async function(req, res, next) {
    let nodes = await getCacheData('nodes') || [];
    
    // Sort nodes by gateway
    nodes.sort((nodeA, nodeB) => {
      if (nodeA.gatewayIP < nodeB.gatewayIP)
        return -1;
      if (nodeA.gatewayIP > nodeB.gatewayIP)
        return 1;
      return 0;
    });

    const data = await getMonitorUpdates();

    res.render('index', {
      updates: data.map(util.messageFromCacheData),
      nodes: nodes
    });
  }));

  app.get('/api/v0/monitor', asyncMiddleware(async function(req, res, next) {
    res.json(await getMonitorUpdates());
  }));

  app.post('/api/v0/monitor', ipAuthMiddleware(exitNodeIPs), function(req, res) {
    const key = `alive-${req.IP}`;
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

  app.get('/api/v0/nodes', function(req, res) {
    mjs.get('nodes', function(err, v) {
      if (v) {
        let data = JSON.parse(v);
        res.json(data);
      } else {
        res.json({error: 'failed to retrieve node information'});
      }
    });
  });

  app.post('/api/v0/nodes', ipAuthMiddleware(exitNodeIPs), bodyParser.text(), function (req, res) {
    let routeString = req.body;
    console.log(`Received routing table update: ${routeString}`);
    
    // Trim trailing | if it exists. Consider changing post-routing-table.sh
    // to not send a trailing |?
    if (routeString.endsWith('|')) {
      routeString = routeString.slice(0,-1);
    }

    let now = new Date();
    let nodes = routeString.split('|').map((route) => {
      let [nodeIP, gatewayIP] = route.split(',');
      return {
        "timestamp": now,
        "nodeIP": nodeIP,
        "gatewayIP": gatewayIP
      };
    });
    
    let handleErr = function(err) {
      if (err) {
          console.log("Error setting key: " + err);
          return res.status(502).json({ error: 'Could not set key' });
      }
      return res.json({
          "message": "It Worked!",
          "data": nodes
      });
    };
    
    mjs.set('nodes', JSON.stringify(nodes), {}, handleErr);
  });

  /// Error Handlers
  app.use((err, req, res, next) => {
    res.status(500).render('error', {
      message: err.message,
      error: (app.get('env') === 'development') ? err : {} // only render full error in development env
    })
  })

  app.exitNodeIPs = exitNodeIPs;
  return app
}

function ipAuthMiddleware (exitNodeIPs) {
  return (req, res, next) => {
    const ip = util.getRequestIP(req);
    req.IP = ip;
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
