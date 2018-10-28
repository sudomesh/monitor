const getDBConnection = require('../src/db');

getDBConnection().then(async (client) => {
  let db = client.db();

  // Store no more than 200MB. One month's worth of exitnode logs
  // is approx 21600 logs * 15KB/log = 324MB.
  // The free mlab instance seems to cap out at ~320MB of documents.
  await db.createCollection('routeLog', { 'capped': true, size: 200000000 });
  console.log('Created routeLog collection.');
  
  await db.collection('routeLog').createIndex({ timestamp: 1 });
  console.log('Created routeLog collection index.');

  client.close();
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
