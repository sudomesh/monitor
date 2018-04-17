var request = require('request');
var env = require('node-env-file');

env(__dirname + '/.env');

var exitnodeIp = '45.34.140.42';
var options = {
  url: `http://localhost:${process.env.PORT}?numberOfGateways=15&numberOfRoutes=21`,
  // the server authenticates the request by looking at
  // its source ip or x-forwarded-for header
  headers: {
    'x-forwarded-for': exitnodeIp
  }
};

console.log(`GET ${options.url}`);
request(options, (error, response) => {
  if (!error && response.statusCode == 200) {
    console.log('success');
  } else {
    console.log(error);
  }
});
