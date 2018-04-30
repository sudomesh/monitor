const noCheckInMessage = 'No, the exit node has not checked in during the last 2 minutes.';

/**
 * Compute cache value from update data pushed from exit node.
 */
module.exports.processUpdate = function(req) {
  let gateways = nonzeroOrNA(req.body.numberOfGateways);
  let routes = nonzeroOrNA(req.body.numberOfRoutes);
  if (gateways === 'n/a' || routes === 'n/a') {
    return { error: 'Bad request' };
  }
  let jsonResults = {
    numberOfGateways: nonzeroOrNA(req.body.numberOfGateways),
    numberOfRoutes: nonzeroOrNA(req.body.numberOfRoutes)
  };
  return jsonResults;
}

/**
 * Returns n/a for any input that isn't a nonnegative number, otherwise returns the number.
 */
let nonzeroOrNA = function(n) {
  if (typeof n == 'number' && n >= 0) {
    return n;
  }
  return 'n/a';
}

module.exports.processParameter = nonzeroOrNA;

/**
 * Computes message for Jade template from data returned from memcache.
 */
module.exports.messageFromCacheData = function(v) {
  //TODO differentiate null v, non-json v, etc.
  if (v) {
    //TODO What happens when parse fails?
    let d = JSON.parse(v);
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
}
