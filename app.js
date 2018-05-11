var bodyParser = require('body-parser')
var express = require('express');
var logger = require('morgan');
var path = require('path');
var winston = require('winston');
var memjs = require('memjs').Client;
var util = require('./util');

const logFile = 'nodejs.log';
const mjs = memjs.create();

const app = express();
app.use(express.urlencoded());
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// Setup log file for file uploads
winston.add(winston.transports.File, { filename: logFile });

// Only ips in this list are allowed to POST monitor updates
const exitNodeIPs = ['45.34.140.42'];
const ipAuthMiddleware = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (exitNodeIPs.includes(ip)) {
    console.log('Received update from exit node ' + ip);
    next();
  } else {
    console.log('Received update from unfamiliar IP: [' + ip + ']');
    return res.status(403).json({ error: "You aren't an exit node." });
  }
};

/**
 * Get a data object from memcache by key
 * @param {String} key - memcache key to read
 * @returns {Object} - parsed Object from memcache 
 */
async function getCacheData(key) {
  const { value } = await mjs.get(key)
  const data = JSON.parse(value)
  return data
}

/**
 * wrap a function that returns promise and return an express middleware
 * @param {Function} fn - A function that accepts (req, res, next) and returns promise 
 * @returns {Function} an express middleware (request handler)
 */
const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Home Page
app.get('/', asyncMiddleware(async function(req, res, next) {
  let nodes = await getCacheData('nodes');
  
  // Sort nodes by gateway
  nodes.sort((nodeA, nodeB) => {
    if (nodeA.gatewayIP < nodeB.gatewayIP)
      return -1;
    if (nodeA.gatewayIP > nodeB.gatewayIP)
      return 1;
    return 0;
  });
  
  res.render('index', {
    value: util.messageFromCacheData(await getCacheData('alivejson')),
    nodes: nodes
  });
}));

app.get('/api/v0/monitor', function(req, res) {
  mjs.get('alivejson', function(err, v) {
    //TODO Handle the error!
    let j = util.jsonFromCacheData(v);
    res.json(j);
  });
});

app.post('/api/v0/monitor', ipAuthMiddleware, function(req, res) {
  let handleErr = function(err) {
    if (err) {
      return res.status(502).json({ error: 'Could not set key, because of ' + err + '].' });
    }
    return res.json({ message: 'Set attached values', result: processed });
  };
  const processed = util.processUpdate(req);
  if (processed.error) {
    return res.status(400).json(processed);
  } else {
    mjs.set('alivejson', JSON.stringify(processed), {expires: 120}, handleErr);
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


app.post('/routing-table', ipAuthMiddleware, bodyParser.text(), function (req, res) {
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

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.exitNodeIPs = exitNodeIPs;
module.exports = app;

