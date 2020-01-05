const supertest = require('supertest');
const MonitorApp = require('../src/app').MonitorApp;
const getDBConnection = require('../src/db');

describe('HTTP tests', function() {

  let db;

  beforeAll((done) => {
    getDBConnection().then((client) => {
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
});
