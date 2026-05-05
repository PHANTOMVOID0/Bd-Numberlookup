/**
 * server.js — BD Number Lookup Proxy Server
 * ==========================================
 *
 * Architecture overview:
 *
 *   Browser ──► /api/proxy/* ──► routes.js ──► apiClient.js ──► upstream
 *                                                    ▲
 *                                               auth.js (isolated)
 *                                               cache.js
 *                                               validators.js
 *
 * The upstream URL is NEVER exposed to the client.
 * All credentials live in auth.js, loaded from .env.
 */

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const cache        = require('./src/cache');
const auth         = require('./src/auth');
const proxyRoutes  = require('./src/routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],   // inline JS for simplicity
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],                        // frontend may only call OUR proxy
    },
  },
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));

// ── Rate limiting ────────────────────────────────────────────
// Window: 15 minutes, max 60 requests per IP
// Protects both our server and the upstream API from abuse.
const limiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'Too many requests — please wait a few minutes and try again.',
  },
  skip: (req) => req.path === '/health',  // don't rate-limit health checks
});
app.use('/api/', limiter);

// ── Serve static frontend ─────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Proxy routes ─────────────────────────────────────────────
app.use('/api/proxy', proxyRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:         'ok',
    authConfigured: auth.isConfigured(),
    cache:          cache.info(),
    uptime:         process.uptime(),
    timestamp:      new Date().toISOString(),
  });
});

// ── 404 for unknown API routes ────────────────────────────────
app.use('/api/*path', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// ── SPA fallback ──────────────────────────────────────────────
app.get('*path', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Only bind a port when running locally — Vercel handles this in prod
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀  BD Lookup Proxy running on http://localhost:${PORT}`);
    console.log(`🔑  Auth configured: ${auth.isConfigured() ? 'YES' : 'NO (using public endpoints)'}`);
    console.log(`📋  Health check:    http://localhost:${PORT}/health\n`);
  });
}

// Vercel needs the app exported as a module
module.exports = app;
