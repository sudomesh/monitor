const noCheckInMessage = 'No, the exit node has not checked in during the last 2 minutes.';
/**
 * Compute cache value from update data pushed from exit node.
 */
module.exports.processUpdate = function(req) {
  let jsonResults = {
    numberOfGateways: processParameter(req.query.numberOfGateways),
    numberOfRoutes: processParameter(req.query.numberOfRoutes)
  };
  return JSON.stringify(jsonResults);
}

/**
 * Process query strings into numbers, defaulting to "n/a".
 */
module.exports.processParameter = function(s) {
  let na = 'n/a';

  if (s === null) {
    return na;
  }
  if (s.match('0+')) {
    return 0;
  }

  let n = Number(s);
  if (isNaN(n) || n <= 0) {
    return na;
  }
  return n;
}

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
    return noCheckInMessage;
  }
}
