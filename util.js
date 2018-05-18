const noCheckInMessage = 'No, the exit node has not checked in during the last 2 minutes.';

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



/**
 * Computes message for Jade template from data returned from memcache.
 */
module.exports.messageFromCacheData = function(v) {
  const d = (typeof v === 'string') ? JSON.parse(v) : v
  //TODO differentiate null v, non-json v, etc.
  if (d) {
    //TODO What happens when parse fails?
    return `Yes! Connecting [${d.numberOfRoutes}] nodes via [${d.numberOfGateways}] gateways.`;
  } else {
    return noCheckInMessage;
  }
}

/**
 * Computes API response from data returned from memcache.
 */
module.exports.jsonFromCacheData = function(v) {
  //TODO differentiate null v, non-json v, etc.
  if (v) {
    //TODO What happens when parse fails?
    return JSON.parse(v);
  } else {
    return { error: noCheckInMessage };
  }
};

module.exports.getRequestIP = function(req) {
  return (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress);
};

