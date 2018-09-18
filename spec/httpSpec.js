require('dotenv').config();

const MongoClient = require('mongodb').MongoClient;
const supertest = require('supertest');
const application = require('../app');
const MonitorApp = require('../app').MonitorApp

describe('HTTP tests', function() {

  let db;

  beforeAll((done) => {
    MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true })
      .then((client) => {
        db = client.db();
        done();
      });
  });

  describe('GET /', function () {
    it('should respond with html', function (done) {
      supertest(MonitorApp({db}))
          .get('/')
          .expect('Content-Type', /html/)
          .expect(200, done);
    });
  });

  describe('GET /nonexisting', function () {
    it('should respond with html', function (done) {
      supertest(MonitorApp({db}))
          .get('/nonexisting')
          .expect('Content-Type', /html/)
          .expect(404, done);
    });
  });

  describe('POST /api/v0/monitor', function () {
    it('error on non-exit node', function (done) {
      supertest(MonitorApp({db}))
          .post('/api/v0/monitor')
          .accept('Content-Type', 'application/json')
          .expect({  "error": "You aren\'t an exit node."})
          .expect(403, done);
    });
  });

  describe('POST /api/v0/monitor', function () {
    it('error on malformed exit node', function (done) {
      let app = MonitorApp({db});
      supertest(app)
          .post('/api/v0/monitor')
          .set('x-forwarded-for', app.exitNodeIPs[0])
          .accept('Content-Type', 'application/json')
          .expect({ error: 'Bad request' })
          .expect(400, done);
    });
  });

});