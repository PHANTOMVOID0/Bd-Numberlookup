# 📡 BD Signal — Phone Number Lookup Proxy

A clean, production-style intermediary web app that lets users look up Bangladesh and international phone numbers through your own interface. The upstream API URL is **completely hidden** from client-side code.

---

## Architecture

```
Browser
  │
  │  GET /api/proxy/lookup?number=…
  ▼
Express Server (server.js)
  │  ├─ helmet (security headers)
  │  ├─ rate-limiter (60 req / 15 min per IP)
  │  └─ routes.js
  │       ├─ validators.js   → input validation
  │       ├─ cache.js        → node-cache TTL store
  │       └─ apiClient.js    → HTTP client for upstream
  │            └─ auth.js    ← isolated auth layer
  │
  ▼
https://bd-num-lookup.vercel.app/api/lookup   ← NEVER exposed to browser
```

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18 (uses native `AbortController`)
- npm

### 2. Clone / download and install
```bash
cd bd-signal-proxy
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env if you need to change the port (default: 3000)
```

### 4. Run
```bash
# Production
npm start

# Development (auto-restart on file changes — Node 18+)
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Project Structure

```
bd-signal-proxy/
├── server.js           Main Express app, middleware, startup
├── src/
│   ├── auth.js         ← Authentication layer (isolated stub)
│   ├── apiClient.js    Upstream HTTP client
│   ├── routes.js       Proxy route handlers
│   ├── cache.js        In-memory TTL cache
│   └── validators.js   Phone number validation
├── public/
│   └── index.html      Frontend UI (calls /api/proxy/* only)
├── .env.example        Environment variable template
└── package.json
```

---

## API Endpoints (Your Proxy)

All endpoints are on YOUR server. The browser never knows about the upstream.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/proxy/lookup?number=01700000000` | BD number lookup |
| `GET` | `/api/proxy/lookup-international?dialCode=1&number=2125551234` | International (split) |
| `GET` | `/api/proxy/lookup-international?e164=+14155552671` | International (E.164) |
| `GET` | `/api/proxy/stats` | Service statistics |
| `GET` | `/health` | Server health + cache info |

### Example response (BD lookup)
```json
{
  "success": true,
  "number": "01700000000",
  "name": null,
  "carrier": "Grameenphone",
  "country": "Bangladesh",
  "international_format": "+8801700000000",
  "type": "mobile",
  "_cache": false
}
```

---

## Authentication Layer (`src/auth.js`)

The auth module is intentionally isolated so you can plug in real credentials without touching any other file.

**Current state:** The BD Number Lookup public API requires no authentication for standard requests. The stub is ready.

**To activate real credentials** when the API owner provides them:
1. Add your credentials to `.env`
2. Open `src/auth.js`
3. Uncomment and adapt the relevant slot (Bearer token, HMAC, or query-string param)

```
BD_API_KEY=your-key-here      → Slot 1 (Bearer / X-Api-Key)
BD_API_SECRET=your-secret     → Slot 2 (HMAC-SHA256 signature)
```

---

## Rate Limiting

- **Window:** 15 minutes
- **Max requests:** 60 per IP per window
- **Scope:** `/api/*` only (health check is exempt)
- **Response on exceed:** `429 Too Many Requests` with JSON error

---

## Caching

| Data | TTL |
|------|-----|
| Number lookups | 24 hours |
| Stats | 5 minutes |
| Max keys | 5,000 |

Cached results include `"_cache": true` in the response.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `BD_API_KEY` | *(none)* | Official API key (stub) |
| `BD_API_SECRET` | *(none)* | HMAC secret (stub) |
| `BD_API_REFERER` | upstream site | Referer header override |

---

## Security Features

- **Helmet** — sets 15+ security HTTP headers
- **CSP** — `connect-src 'self'` prevents the browser from calling the upstream directly
- **Rate limiting** — prevents abuse of the external service
- **Input sanitisation** — all user input validated before hitting upstream
- **No secrets in client** — the upstream URL never appears in HTML/JS
- **Isolated auth** — credential logic in one file, easily auditable

---

## Credits

Upstream data provided by [BD Number Lookup](https://bd-num-lookup.vercel.app/) by [gajarbotol](https://t.me/Gajarbotol). This proxy is an independent intermediary and is not affiliated with or endorsed by the upstream service.
