const supertest = require('supertest');
const application = require('../app');

describe('GET /', function() {
  it('should respond with html', function(done) {
    supertest(application)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200, done);
  });
});

describe('GET /nonexisting', function() {
  it('should respond with html', function(done) {
    supertest(application)
        .get('/nonexisting')
        .expect('Content-Type', /html/)
        .expect(404, done);
  });
});