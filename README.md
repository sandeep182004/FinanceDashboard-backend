# Finance Dashboard Backend

Node.js + Express backend providing a unified API and WebSocket stream for finance data via Alpha Vantage and Finnhub.

**Highlights**
- Modular structure: routes, controllers, services, utils
- API proxy with provider fallback (Alpha → Finnhub)
- In-memory caching with TTL to reduce rate-limit pressure
- Security via Helmet, rate limiting, and CORS
- WebSocket live quotes via Socket.IO
- Swagger UI docs

---

**Requirements**
- Node.js 14+ (recommended 18+)

**Setup**
- Create a `.env` file in the project root.
- Install dependencies and start the server.

```bash
npm install
npm start            # runs on port 4001 by default
# or
npm run dev          # nodemon
```

**Environment (.env)**
```env
PORT=4001
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
CACHE_TTL_SECONDS=300           # default 300 if unset
RATE_LIMIT_WINDOW_MS=60000      # 60s window
RATE_LIMIT_MAX=600              # requests per window
```

---

**Server Info**
- Base URL: `http://localhost:4001`
- API base: `http://localhost:4001/api`
- Swagger: `http://localhost:4001/api-docs`

---

**API Endpoints**
- Health
	- `GET /api/health`

- Proxy (Alpha Vantage)
	- `GET /api/proxy/alpha/quote?symbol=AAPL`
	- `GET /api/proxy/alpha/history?symbol=AAPL&days=30`

- Proxy (Finnhub)
	- `GET /api/proxy/finnhub/quote?symbol=AAPL`
	- `GET /api/proxy/finnhub/history?symbol=AAPL&days=30`

- Templates
	- `GET /api/templates`

- Config storage
	- `GET /api/config/:id`
	- `POST /api/config/:id` (JSON body)
	- `GET /api/config/export/all`
	- `POST /api/config/import/merge` (JSON body)

- Utilities
	- `POST /api/utils/flatten` (JSON body)
	- `GET /api/utils/schema?provider=alpha|finnhub&symbol=AAPL&type=quote|history`

---

**Response Formats**
- Quote
	- `{ symbol, price, change, changePercent, timestamp }`
- History
	- `[{ timestamp, price }, ... ]`
- Error
	- `{ success: false, error: { message, code? } }`

Notes:
- `changePercent` is already multiplied by 100 (e.g., 1.31 → 1.31%).
- Caching reduces upstream calls; repeated requests within TTL return cached data.

---

**WebSocket (Socket.IO)**
- URL: `ws://localhost:4001/socket.io`
- Events
	- `subscribe`: `{ symbol: 'AAPL', provider: 'alpha'|'finnhub', intervalMs?: number }`
	- `unsubscribe`: `{ symbol: 'AAPL', provider?: 'alpha' }`
	- `quote` (server → client): `{ provider, symbol, price, change, changePercent, timestamp }`
	- `error` (server → client): `{ message, provider, symbol }`

Client example (TypeScript):
```ts
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001', {
	transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
	socket.emit('subscribe', { symbol: 'AAPL', provider: 'alpha', intervalMs: 10000 });
});

socket.on('quote', (q) => {
	console.log('quote:', q);
});

socket.on('error', (e) => {
	console.warn('socket error:', e);
});
```

---

**Rate Limits & Caching**
- Alpha Vantage free tier: ~5 req/min, 500/day
- Finnhub free tier: higher limits
- Backend caches successful responses (`CACHE_TTL_SECONDS`, default 300)
- When Alpha is rate-limited, backend falls back to Finnhub automatically

Tips to avoid zeros/rate-limit stalls:
- Increase cache TTL
- Reduce auto-refresh frequency
- Prefer Finnhub for heavy, frequent reads

---

**Testing**
- Simple sanity checks
```bash
node scripts/testRequests.js
```

---

**Deployment**
- Set production `.env` with keys and a fixed `PORT`
- Restrict CORS origins to your frontend domain
- Serve behind HTTPS (Proxy/CDN)
- Use a process manager (e.g., PM2) or platform (Railway/Render)

---

**Troubleshooting (Windows)**
- Browser works but PowerShell `Invoke-WebRequest`/`curl.exe` fails:
	- Use browser or a Node script to validate service
	- Ensure `node.exe` is allowed through Windows Defender Firewall
	- The server listens on dual-stack; prefer `http://localhost:4001`
- Seeing `price: 0` or `change: 0`:
	- Alpha Vantage may be rate-limited or returning incomplete data
	- Backend will fall back to Finnhub; increase caching and reduce refresh rates

---

**License**
- Internal project documentation; no external license headers added.

