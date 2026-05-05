/**
 * ============================================================
 * AUTH MODULE — Isolated Authentication Layer
 * ============================================================
 *
 * PURPOSE:
 *   This module is the single place where all authentication
 *   logic for the upstream BD Number Lookup API lives.
 *   It is intentionally decoupled from the proxy routes so
 *   it can be swapped without touching any other file.
 *
 * CURRENT STATUS:
 *   The BD Number Lookup public API (bd-num-lookup.vercel.app)
 *   does NOT require an API key for standard lookups.
 *   This module is a documented stub ready for credentials.
 *
 * HOW TO ACTIVATE REAL AUTHENTICATION:
 *   If the API owner (gajarbotol) provides official credentials
 *   (e.g. an API key, HMAC secret, or session token flow),
 *   implement it here and set the env vars in your .env file.
 *
 *   Common patterns to implement:
 *     1. Bearer Token:   headers['Authorization'] = `Bearer ${API_KEY}`
 *     2. HMAC Signature: sign(timestamp + number + SECRET) → 'sig' param
 *     3. Session Cookie: POST /auth → cookie → attach to each request
 *
 * ENVIRONMENT VARIABLES (set in .env):
 *   BD_API_KEY      — Official API key, if/when issued
 *   BD_API_SECRET   — HMAC signing secret, if required
 *   BD_API_REFERER  — Allowed referer header, if required
 * ============================================================
 */

const API_KEY    = process.env.BD_API_KEY    || null;
const API_SECRET = process.env.BD_API_SECRET || null;
const REFERER    = process.env.BD_API_REFERER || 'https://bd-num-lookup.vercel.app';

/**
 * buildHeaders()
 * Returns the HTTP headers to attach to every upstream request.
 * Extend this function when official credentials are obtained.
 *
 * @param {object} context  - Optional context (number, timestamp, etc.)
 * @returns {object}          Headers object
 */
function buildHeaders(context = {}) {
  const headers = {
    'Accept':          'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent':      'BDLookupProxy/1.0 (self-hosted intermediary)',
    // Referer is set to the legitimate origin so the API
    // can verify requests come from an approved surface.
    'Referer':         REFERER,
    'Origin':          new URL(REFERER).origin,
  };

  // ── Slot 1: Bearer token ─────────────────────────────────
  // Uncomment and adapt when an official API key is issued:
  //
  // if (API_KEY) {
  //   headers['Authorization'] = `Bearer ${API_KEY}`;
  //   headers['X-Api-Key'] = API_KEY;
  // }

  // ── Slot 2: HMAC / Signature ─────────────────────────────
  // Example: sign the lookup number + timestamp with HMAC-SHA256:
  //
  // if (API_SECRET && context.number) {
  //   const crypto = require('crypto');
  //   const ts  = Date.now();
  //   const sig = crypto
  //     .createHmac('sha256', API_SECRET)
  //     .update(`${context.number}:${ts}`)
  //     .digest('hex');
  //   headers['X-Timestamp'] = String(ts);
  //   headers['X-Signature']  = sig;
  // }

  return headers;
}

/**
 * buildQueryParams()
 * Returns additional query-string params for the upstream URL.
 * Add token/fp/sig params here if the API requires them.
 *
 * @param {object} context  - Optional context
 * @returns {object}          Key-value pairs to append to the URL
 */
function buildQueryParams(context = {}) {
  const params = {};

  // ── Slot 3: Query-string auth params ─────────────────────
  // Example (only if officially documented):
  //
  // if (API_KEY) {
  //   params.token = API_KEY;
  //   params.ts    = Date.now();
  // }

  return params;
}

/**
 * isConfigured()
 * Returns true when real credentials are present.
 * Used by the proxy to log a warning at startup.
 */
function isConfigured() {
  return Boolean(API_KEY || API_SECRET);
}

module.exports = { buildHeaders, buildQueryParams, isConfigured };
