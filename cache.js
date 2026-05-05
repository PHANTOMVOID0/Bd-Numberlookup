/**
 * cache.js — In-memory result cache
 *
 * Uses node-cache for lightweight TTL-based caching.
 * Phone number data is stable (operators rarely change),
 * so a 24-hour TTL is reasonable and reduces upstream calls.
 *
 * Cache keys:
 *   bd:{normalizedNumber}            — BD lookup result
 *   intl:{dialCode}:{localNumber}    — International lookup result
 *   stats                            — /api/lookup-stats result
 */

const NodeCache = require('node-cache');

// TTL values (seconds)
const TTL_LOOKUP = 60 * 60 * 24;   // 24 hours for number data
const TTL_STATS  = 60 * 5;         // 5 minutes for stats

const lookupCache = new NodeCache({
  stdTTL:      TTL_LOOKUP,
  checkperiod: 600,          // check for expired keys every 10 min
  maxKeys:     5000,         // cap memory usage
  useClones:   false,
});

const statsCache = new NodeCache({
  stdTTL:      TTL_STATS,
  checkperiod: 60,
  useClones:   false,
});

/**
 * @param {string} key
 * @returns {object|undefined}
 */
function getLookup(key) {
  return lookupCache.get(key);
}

/**
 * @param {string} key
 * @param {object} value
 */
function setLookup(key, value) {
  lookupCache.set(key, value);
}

function getStats(key) {
  return statsCache.get(key);
}

function setStats(key, value) {
  statsCache.set(key, value);
}

/**
 * Returns basic cache telemetry for the /health endpoint.
 */
function info() {
  return {
    lookupKeys: lookupCache.keys().length,
    lookupStats: lookupCache.getStats(),
    statsKeys: statsCache.keys().length,
  };
}

module.exports = { getLookup, setLookup, getStats, setStats, info };
