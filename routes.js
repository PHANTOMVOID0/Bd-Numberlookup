/**
 * routes.js — Proxy API routes
 *
 * Exposes three endpoints to the frontend:
 *   GET /api/proxy/lookup?number=01XXXXXXXXX
 *   GET /api/proxy/lookup-international
 *   GET /api/proxy/stats
 *
 * The upstream API URL and auth logic are completely hidden
 * behind this proxy layer.
 */

const express    = require('express');
const router     = express.Router();
const client     = require('./apiClient');
const cache      = require('./cache');
const { validateBDNumber, validateIntlNumber } = require('./validators');

// ─────────────────────────────────────────────────────────────
// Route: BD number lookup
// GET /api/proxy/lookup?number=01XXXXXXXXX
// ─────────────────────────────────────────────────────────────
router.get('/lookup', async (req, res) => {
  const { number } = req.query;

  // 1. Validate
  const validation = validateBDNumber(number);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  const { normalized } = validation;

  // 2. Check cache
  const cacheKey = `bd:${normalized}`;
  const cached = cache.getLookup(cacheKey);
  if (cached) {
    return res.json({ ...cached, _cache: true });
  }

  // 3. Call upstream (all auth is inside apiClient)
  try {
    const data = await client.lookupBD(normalized);

    // Sanitise: only forward known fields to the frontend
    const result = {
      success:            data.success  ?? true,
      number:             data.number   || normalized,
      name:               data.name     || null,
      carrier:            data.carrier  || data.operator || null,
      country:            data.country  || 'Bangladesh',
      international_format: data.international_format || `+880${normalized.slice(1)}`,
      type:               data.type     || null,
      _cache:             false,
    };

    cache.setLookup(cacheKey, result);
    return res.json(result);

  } catch (err) {
    console.error('[lookup]', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || 'Upstream lookup failed.',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Route: International number lookup
// GET /api/proxy/lookup-international
//   ?e164=+14155552671
//   OR ?dialCode=1&number=4155552671
// ─────────────────────────────────────────────────────────────
router.get('/lookup-international', async (req, res) => {
  const { e164, dialCode, number } = req.query;

  // 1. Validate
  const validation = validateIntlNumber({ e164, dialCode, number });
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  // 2. Cache key
  let cacheKey;
  if (validation.mode === 'e164') {
    cacheKey = `intl:${validation.e164}`;
  } else {
    cacheKey = `intl:${validation.dialCode}:${validation.number}`;
  }

  const cached = cache.getLookup(cacheKey);
  if (cached) {
    return res.json({ ...cached, _cache: true });
  }

  // 3. Call upstream
  try {
    let data;
    if (validation.mode === 'e164') {
      data = await client.lookupIntlE164(validation.e164);
    } else {
      data = await client.lookupIntlSplit(validation.dialCode, validation.number);
    }

    const result = {
      success:            data.success  ?? true,
      number:             data.number   || null,
      name:               data.name     || null,
      carrier:            data.carrier  || null,
      country:            data.country  || null,
      dial_code:          data.dial_code || dialCode || null,
      international_format: data.international_format || null,
      type:               data.type     || null,
      _cache:             false,
    };

    cache.setLookup(cacheKey, result);
    return res.json(result);

  } catch (err) {
    console.error('[lookup-international]', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: err.message || 'Upstream international lookup failed.',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Route: Service stats
// GET /api/proxy/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const cached = cache.getStats('stats');
  if (cached) return res.json({ ...cached, _cache: true });

  try {
    const data = await client.fetchStats();
    cache.setStats('stats', data);
    return res.json({ ...data, _cache: false });
  } catch (err) {
    console.error('[stats]', err.message);
    return res.status(err.statusCode || 502).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
