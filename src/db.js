require('dotenv').config();

const MongoClient = require('mongodb').MongoClient;

module.exports = async function getDBConnection() {
  // MONGODB_URI is provided by mlab in heroku. Use that if it exists. Otherwise use MONGO_URL
  // which should be provided manually in .env (see dev.env)
  let URI = process.env.MONGODB_URI ? process.env.MONGODB_URI : process.env.MONGO_URL;
  let client = await MongoClient.connect(URI, { useNewUrlParser: true });
  return client;
}