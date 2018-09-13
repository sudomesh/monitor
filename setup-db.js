require('dotenv').config();

var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then((client) => {
    // Store no more than 400MB. One month's worth of exitnode logs
    // is approx 21600 logs * 15KB/log = 324MB.
    let db = client.db();
    db.createCollection('routeLog', { 'capped': true, size: 400000000 })
      .then((res) => {
        console.log('Created routeLog collection.');
        client.close();
      })
      .catch((err) => console.error(err));
  })
  .catch((err) => console.error(err));
