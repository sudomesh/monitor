require('dotenv').config({ path: __dirname + '/../.env' });

var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(async (client) => {
    let db = client.db();
    
    // Store no more than 400MB. One month's worth of exitnode logs
    // is approx 21600 logs * 15KB/log = 324MB.
    await db.createCollection('routeLog', { 'capped': true, size: 400000000 })
    console.log('Created routeLog collection.');
    
    await db.collection('routeLog').createIndex({ timestamp: 1 });
    console.log('Created routeLog collection index.');
    
    client.close();
  }).catch((err) => {
    throw err;
  });
