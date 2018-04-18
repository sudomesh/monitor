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
 * Process incoming request and update memcache. Renders an error if necessary.
 */
let updateCache = function(req, res) {
  let handleErr = function(err) {
    if (err) {
      console.log("Error setting key: " + err);
      res.render('error', {
        message: err.message,
        error: err
      });
    } 
  };
  let s = util.processUpdate(req);
  mjs.set('alivejson', s, {expires: 120}, handleErr);
}

// Routes
app.get('/', function(req, res) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('from [' + ip + ']');

  //TODO Move this to a POST handler
  if (exitnodes.includes(ip)) {
    console.log('ip is an exitnode');
    updateCache(req, res);  
  }
  mjs.get('alivejson', function(err, v) {
    //TODO Handle the error!
    let msg = util.messageFromCacheData(v);
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
