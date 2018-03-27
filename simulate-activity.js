var memjs = require('memjs');
var mc = memjs.Client.create();

var numberOfRoutes = 12;
var numberOfGateways = 5;

mc.set('alive', 'Yes! Connecting [' + numberOfRoutes + '] nodes via [' + numberOfGateways + '] gateways.', {expires:120}, function(err) {
    if (err) {
       console.log("Error setting key: " + err);
    } else {
       console.log("successfully set key");
    }
});


