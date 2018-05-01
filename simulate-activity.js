var request = require('request');
var env = require('node-env-file');

env(__dirname + '/.env');

var exitnodeIp = '45.34.140.42';
var options = {
  url: `http://localhost:${process.env.PORT}/api/v0/monitor`,
  // the server authenticates the request by looking at
  // its source ip or x-forwarded-for header
  headers: {
    'x-forwarded-for': exitnodeIp,
    'content-type': 'application/json'
  },
  body: '{ "numberOfGateways": 15, "numberOfRoutes": 21 }'
};

console.log(`POST ${options.url}`);
request.post(options, (error, response) => {
  if (!error && response.statusCode == 200) {
    console.log('success');
  } else {
    console.log(error);
  }
});
