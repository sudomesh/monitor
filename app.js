// Node.js + Express MemCachier Example
// Author: MemCachier Inc.
// License: MIT

/*jshint node: true */
/*jslint unparam: true*/

// Douglas Crockford is wrong, synchronous at startup makes sense.
/*jslint stupid: true*/

// Dependencies
var express = require('express'),
    logger = require('morgan'),
    path = require('path'),
    winston = require('winston'),
    memjs = require("memjs").Client;

// Constants / Configuration
var logFile = 'nodejs.log';
var mjs = memjs.create();

// Start Express
var app = express();
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

var exitnodes = ['45.34.140.42'];

var isAlive = function(req, res) {
  var numberOfGateways = req.query.numberOfGateways || 'n/a';
  var numberOfRoutes = req.query.numberOfRoutes || 'n/a';
  mjs.set('alive', 'Yes! Connecting [' + numberOfRoutes + '] nodes via [' + numberOfGateways + '] gateways.', {expires:120}, function(err) {
    if (err) {
      console.log("Error setting key: " + err);
      res.render('error', {
        message: err.message,
        error: err
      });
    } 
  });
}

// Routes
app.get('/', function(req, res) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('from [' + ip + ']');
  if (exitnodes.includes(ip)) {
    console.log('ip is an exitnode');
    isAlive(req, res);  
  }
  mjs.get('alive', function(err, v) {
    if (v) {
      res.render('index', {value: v.toString()});
    } else {
      res.render('index', {value: 'No, the exit node has not checked in the last 2 minutes.'});
    }
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
