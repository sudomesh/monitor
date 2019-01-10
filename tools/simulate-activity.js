var request = require('request');
var env = require('node-env-file');
var exitnodeIPs = require('../src/exitnodeIPs');

env(__dirname + '/../.env');

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
    simulateMonitorRequest({ "numberOfGateways": 15, "numberOfRoutes": 21 }, exitnodeIPs[0]),
    simulateMonitorRequest({ "numberOfGateways": 15, "numberOfRoutes": 29 }, exitnodeIPs[1]),
    simulateRoutingTableRequest('129.0.0.0/26,129.0.0.1|127.0.0.0/26,127.0.0.1|128.0.0.0/26,128.0.0.1|127.0.0.10/26,127.0.0.1|', exitnodeIPs[0]),
    simulateRoutingTableRequest('122.0.0.0/26,129.0.0.1|125.0.0.0/26,124.0.0.1|121.0.0.0/26,121.0.0.1|', exitnodeIPs[1]),
    simulateRoutingTableRequest('', exitnodeIPs[2]) // simulate an empty POST
  ])
}

async function simulateMonitorRequest(data, exitnodeIP) {
  const response = await monitorRequest(data, exitnodeIP)
  switch (response.statusCode) {
    case 200:
      console.info(`Successful /monitor request`)
      break;
    default:
      throw new Error(`Unexpected statusCode from simulated monitor request: ${response.statusCode}`)
  }
}

async function monitorRequest(data, exitnodeIP) {
  return new Promise((resolve, reject) => {
    var options = {
      url: `http://localhost:${process.env.PORT}/api/v0/monitor`,
      // the server authenticates the request by looking at
      // its source ip or x-forwarded-for header
      headers: {
        'x-forwarded-for': exitnodeIP,
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

async function simulateRoutingTableRequest(body, exitnodeIP) {
  const response = await routingTableRequest(body, exitnodeIP)
  switch (response.statusCode) {
    case 200:
      console.info(`Successful /routing-table request`)
      break;
    default:
      throw new Error(`Unexpected statusCode from simulated routing table request: ${response.statusCode}`)
  }
}

async function routingTableRequest(body, exitnodeIP) {
  return new Promise((resolve, reject) => {
    const options = {
      url: `http://localhost:${process.env.PORT}/api/v0/nodes`,
      headers: {
        'x-forwarded-for': exitnodeIP,
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
