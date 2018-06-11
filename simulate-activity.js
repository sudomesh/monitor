var request = require('request');
var env = require('node-env-file');
var exitnodeIp = '45.34.140.42';

env(__dirname + '/.env');

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    })
}

async function main() {
  return Promise.all([
    simulateMonitorRequest({ "numberOfGateways": 15, "numberOfRoutes": 21 }),
    simulateRoutingTableRequest('129.0.0.0/26,129.0.0.1|127.0.0.0/26,127.0.0.1|128.0.0.0/26,128.0.0.1|127.0.0.10/26,127.0.0.1|')
  ])
}

async function simulateMonitorRequest(data) {
  const response = await monitorRequest(data)
  switch (response.statusCode) {
    case 200:
      console.info(`Successful /monitor request`)
      break;
    default:
      throw new Error(`Unexpected statusCode from simulated monitor request: ${response.statusCode}`)
  }
}

async function monitorRequest(data) {
  return new Promise((resolve, reject) => {
    var options = {
      url: `http://localhost:${process.env.PORT}/api/v0/monitor`,
      // the server authenticates the request by looking at
      // its source ip or x-forwarded-for header
      headers: {
        'x-forwarded-for': exitnodeIp,
        'content-type': 'application/json'
      },
      body: (typeof data === 'object') ? JSON.stringify(data) : data
    };
    request.post(options, (error, response) => {
      if (error) return reject(error)
      return resolve(response)
    })
  })  
}

async function simulateRoutingTableRequest(body) {
  const response = await routingTableRequest(body)
  switch (response.statusCode) {
    case 200:
      console.info(`Successful /routing-table request`)
      break;
    default:
      throw new Error(`Unexpected statusCode from simulated routing table request: ${response.statusCode}`)
  }
}

async function routingTableRequest(body) {
  return new Promise((resolve, reject) => {
    const options = {
      url: `http://localhost:${process.env.PORT}/api/v0/nodes`,
      headers: {
        'x-forwarded-for': exitnodeIp,
        'content-type': 'text/plain'
      },
      body
    }
    request.post(options, (error, response) => {
      if (error) return reject(error)
      return resolve(response)
    })
  })
}
