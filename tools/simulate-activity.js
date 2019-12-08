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
  await Promise.all([
    simulateRoutingTableRequest('134.0.0.0/26,134.0.0.1|132.0.0.0/26,132.0.0.1|131.0.0.0/26,131.0.0.1|129.0.0.0/26,129.0.0.1|127.0.0.0/26,127.0.0.1|128.0.0.0/26,128.0.0.1|127.0.0.10/26,127.0.0.1|', exitnodeIPs[0]),
    simulateRoutingTableRequest('134.0.0.0/26,134.0.0.1|132.0.0.0/26,132.0.0.1|131.0.0.0/26,131.0.0.1|125.0.0.0/26,124.0.0.1|121.0.0.0/26,121.0.0.1|123.0.0.0/26,123.0.0.1', exitnodeIPs[1]),
    simulateRoutingTableRequest('', exitnodeIPs[2]) // simulate an empty POST
  ])
  return new Promise(resolve => {
    setTimeout(async () => {
      // omit one routing table request to simulate a delay between posts
      await Promise.all([
        simulateRoutingTableRequest('134.0.0.0/26,134.0.0.1|132.0.0.0/26,132.0.0.1|131.0.0.0/26,131.0.0.1|129.0.0.0/26,129.0.0.1|127.0.0.0/26,127.0.0.1|128.0.0.0/26,128.0.0.1|127.0.0.10/26,127.0.0.1|', exitnodeIPs[0]),
        simulateRoutingTableRequest('', exitnodeIPs[2]) // simulate an empty POST
      ])
      resolve()
    }, 1000)
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

