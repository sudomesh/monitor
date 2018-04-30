var express = require('express');
var logger = require('morgan');
var path = require('path');
var winston = require('winston');
var memjs = require('memjs').Client;
var util = require('./util');

const logFile = 'nodejs.log';
const mjs = memjs.create();

var app = express();
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
  
let handleErr = function(err) {
    if (err) {
      console.log("Error setting key: " + err);
      return res.status(502).json({ error: 'Could not set key' });
    } 
    return res.json({ message: 'Set attached values', result: processed });
  };
  mjs.set('alivejson', JSON.stringify(processed), {expires: 120}, handleErr);
};

/**
 * Process incoming request and update memcache. Returns an error if necessary.
 */
var updateCache = function(req, res) {
  let processed = util.processUpdate(req);
  if (processed.error) {
    // Couldn't get the data needed to process request => 400 - Bad Request
    return res.status(400).json(processed);
  }
};

app.get('/', function(req, res) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  mjs.get('alivejson', function(err, v) {
    //TODO Handle the error!
    let msg = util.messageFromCacheData(v);
    //TODO Might make sense to do
    // if (msg.error) { res.status(404); }
    // ...but the issue isn't that the client specified a bad URI, so...
    res.render('index', {value: msg});
  });
});

app.get('/api/v0/monitor', function(req, res) {
  mjs.get('alivejson', function(err, v) {
    //TODO Handle the error!
    let j = util.jsonFromCacheData(v);
    res.json(j);
  });
});

app.post('/api/v0/monitor', function(req, res) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (exitnodes.includes(ip)) {
    console.log('Received update from exit node ' + ip);
    updateCache(req, res);  
  } else {
    console.log('Received update from unfamiliar IP: ' + ip);
    return res.status(403).json({ error: "You aren't an exit node." });
  }

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


app.post('/routing-table', (req, res) => {
  let str = Object.keys(req.body)[0];
  // console.log("Request Body:");
  // console.log(str);
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
  // console.log('Result Array: ' + resultArray);
  mjs.set('nodes', JSON.stringify(resultArray), {}, handleErr);

  res.json({
    "message": "It Worked!",
    "data": resultArray
  });
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

