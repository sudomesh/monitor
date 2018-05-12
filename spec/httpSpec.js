const supertest = require('supertest');
const application = require('../app');
const MonitorApp = require('../app').MonitorApp

describe('GET /', function () {
  it('should respond with html', function (done) {
    supertest(MonitorApp())
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200, done);
  });
});

describe('GET /nonexisting', function () {
  it('should respond with html', function (done) {
    supertest(MonitorApp())
        .get('/nonexisting')
        .expect('Content-Type', /html/)
        .expect(404, done);
  });
});

describe('POST /api/v0/monitor', function () {
  it('error on non-exit node', function (done) {
    supertest(MonitorApp())
        .post('/api/v0/monitor')
        .accept('Content-Type', 'application/json')
        .expect({  "error": "You aren\'t an exit node."})
        .expect(403, done);
  });
});

describe('POST /api/v0/monitor', function () {
  it('error on malformed exit node', function (done) {
    supertest(MonitorApp())
        .post('/api/v0/monitor')
        .set('x-forwarded-for', application.exitNodeIPs[0])
        .accept('Content-Type', 'application/json')
        .expect({ error: 'Bad request' })
        .expect(400, done);
  });
})
;
