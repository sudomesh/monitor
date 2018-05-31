module.exports.noCheckInMessage = function(ip) {
  return `${ip} has not checked in during the last 2 minutes.`;
};

/**
 * Returns n/a for any input that isn't a nonnegative number, otherwise returns the number.
 */
var nonZeroOrNA = function(n) {
  if (typeof n == 'number' && n >= 0) {
    return n;
  }
  return 'n/a';
};

/**
 * Compute cache value from update data pushed from exit node.
 */
module.exports.processUpdate = function(req) {
  var gateways = nonZeroOrNA(req.body.numberOfGateways);
  var routes = nonZeroOrNA(req.body.numberOfRoutes);
  if (gateways === 'n/a' || routes === 'n/a') {
    return { error: 'Bad request' };
  } else {
    return {
      numberOfGateways: nonZeroOrNA(req.body.numberOfGateways),
      numberOfRoutes: nonZeroOrNA(req.body.numberOfRoutes)
    };
  }
};

module.exports.nonZeroOrNA = nonZeroOrNA

module.exports.getRequestIP = function(req) {
  return (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress);
};

