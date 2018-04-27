// Node.js + Express MemCachier Example
// Author: MemCachier Inc.
// License: MIT

/*jshint node: true */
/*jslint unparam: true*/

// Douglas Crockford is wrong, synchronous at startup makes sense.
/*jslint stupid: true*/

// Dependencies
const express = require('express'),
    logger = require('morgan'),
    path = require('path'),
    winston = require('winston'),
    memjs = require('memjs').Client,
    util = require('./util');

// Constants / Configuration
const logFile = 'nodejs.log';
const mjs = memjs.create();

// Start Express
let app = express();
app.configure(function () {
  app.use(express.urlencoded());
  app.use(express.json());
});

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Middleware Setup
app.use(logger('dev'));
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// Setup log file for file uploads
winston.add(winston.transports.File, { filename: logFile });

let exitnodes = ['45.34.140.42'];

/**
 * Process incoming request and update memcache. Returns an error if necessary.
 */
let updateCache = function(req, res) {
  let processed = util.processUpdate(req);
  if (processed.error) {
    // Couldn't get the data needed to process request => 400 - Bad Request
    return res.status(400).json(processed);
  }

  let handleErr = function(err) {
    if (err) {
      console.log("Error setting key: " + err);
      return res.status(502).json({ error: 'Could not set key' });
    } 
    return res.json({ message: 'Set attached values', result: processed });
  };
  mjs.set('alivejson', JSON.stringify(processed), {expires: 120}, handleErr);
};

// Routes
app.get('/', function(req, res) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

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
