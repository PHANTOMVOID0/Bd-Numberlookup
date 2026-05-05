/**
 * apiClient.js — Upstream API client
 *
 * ALL HTTP calls to bd-num-lookup.vercel.app originate from
 * this file. The frontend never touches the upstream directly.
 *
 * Auth headers/params are injected from src/auth.js so this
 * file stays clean when credentials change.
 */

const fetch   = require('node-fetch');
const auth    = require('./auth');

// Base URL is ONLY in this backend file — never sent to the client
const BASE_URL = 'https://bd-num-lookup.vercel.app';

// Request timeout (ms)
const TIMEOUT_MS = 8000;

/**
 * Generic fetcher with timeout, auth injection, and error normalisation.
 *
 * @param {string} path      — API path, e.g. '/api/lookup'
 * @param {object} params    — Query parameters
 * @param {object} context   — Passed to auth.buildHeaders() for signing
 * @returns {Promise<object>}
 */
async function upstreamGet(path, params = {}, context = {}) {
  // Merge developer-supplied query params with any auth params
  const authParams  = auth.buildQueryParams(context);
  const allParams   = { ...params, ...authParams };

  const url = new URL(path, BASE_URL);
  Object.entries(allParams).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = auth.buildHeaders(context);

  // AbortController gives us a clean timeout without extra deps
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), {
      method:  'GET',
      headers,
      signal:  controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'Upstream API timed out. Try again.');
    }
    throw new ApiError(502, `Network error reaching upstream API: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  // Parse JSON (upstream always returns JSON)
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(502, 'Upstream API returned non-JSON response.');
  }

  // Treat non-2xx as API-level errors
  if (!response.ok) {
    const msg = body?.message || body?.error || `Upstream returned ${response.status}`;
    throw new ApiError(response.status >= 500 ? 502 : response.status, msg);
  }

  return body;
}

// ─────────────────────────────────────────────────────────────
// Public lookup methods
// ─────────────────────────────────────────────────────────────

/**
 * Bangladesh number lookup
 * Endpoint: GET /api/lookup?number=01XXXXXXXXX
 *
 * @param {string} number — normalised 01XXXXXXXXX
 * @returns {Promise<object>}
 */
async function lookupBD(number) {
  return upstreamGet('/api/lookup', { number }, { number });
}

/**
 * International number lookup via E.164
 * Endpoint: GET /api/lookup-international?e164=+14155552671
 *
 * @param {string} e164
 * @returns {Promise<object>}
 */
async function lookupIntlE164(e164) {
  return upstreamGet('/api/lookup-international', { e164 }, { number: e164 });
}

/**
 * International number lookup via dial code + local number
 * Endpoint: GET /api/lookup-international?dialCode=1&number=2125551234
 *
 * @param {string} dialCode
 * @param {string} number
 * @returns {Promise<object>}
 */
async function lookupIntlSplit(dialCode, number) {
  return upstreamGet(
    '/api/lookup-international',
    { dialCode, number },
    { number: `+${dialCode}${number}` }
  );
}

/**
 * Fetch service statistics
 * Endpoint: GET /api/lookup-stats
 *
 * @returns {Promise<object>}
 */
async function fetchStats() {
  return upstreamGet('/api/lookup-stats', {}, {});
}

// ─────────────────────────────────────────────────────────────
// Custom error class
// ─────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

module.exports = { lookupBD, lookupIntlE164, lookupIntlSplit, fetchStats, ApiError };
