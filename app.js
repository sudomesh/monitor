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

const exitnodes = ['45.34.140.42'];
app.exitnodes = exitnodes;

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
  res.render('index', {
    value: util.messageFromCacheData(await getCacheData('alivejson')),
    nodes: await getCacheData('nodes')
  });
}));

app.get('/api/v0/monitor', function(req, res) {
  mjs.get('alivejson', function(err, v) {
    //TODO Handle the error!
    let j = util.jsonFromCacheData(v);
    res.json(j);
  });
});

app.post('/api/v0/monitor', function(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (exitnodes.includes(ip)) {
    console.log('Received update from exit node ' + ip);
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
  } else {
    console.log('Received update from unfamiliar IP: [' + ip + ']');
    return res.status(403).json({ error: "You aren't an exit node." });
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


app.post('/routing-table', bodyParser.text(), function (req, res) {
  let str = req.body
  let lineArray = str.split("|");
  console.log(JSON.stringify(lineArray));
  let resultArray = [];
  for(let i = 0; i < lineArray.length; i++){
    console.log(`Processing line ${i + 1}`);
    let nodeArray = lineArray[i].split(',');
    let nodeObj = {
      "timestamp": new Date(),
      "nodeIP": nodeArray[0],
      "gatewayIP": nodeArray[1]
    };
    console.log(`Line ${i + 1} Object` + nodeObj);
    resultArray.push(nodeObj);
  }
  let handleErr = function(err) {
    if (err) {
        console.log("Error setting key: " + err);
        return res.status(502).json({ error: 'Could not set key' });
    }
    return  res.json({
        "message": "It Worked!",
        "data": resultArray
    });
  };
  mjs.set('nodes', JSON.stringify(resultArray), {}, handleErr);
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

module.exports = app;

