const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { port } = require('./config');
const http = require('http');
const { Server } = require('socket.io');
const alphaService = require('./services/alphaService');
const finnhubService = require('./services/finnhubService');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use(helmet());
app.use(cors());
// Ensure CORS preflight (OPTIONS) is handled for all routes
app.options('*', cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimiter);

// Swagger UI - API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not Found' } });
});

// Error handler
app.use(errorHandler);

const server = http.createServer(app);

// Socket.IO for live data
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      '*'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
  upgradeTimeout: 10000
});

io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  const timers = new Map();

  socket.on('subscribe', async ({ symbol, provider = 'alpha', intervalMs = 10000 }) => {
    const key = `${provider}:${(symbol || '').toUpperCase()}`;
    if (!symbol) return;
    if (timers.has(key)) clearInterval(timers.get(key));

    const fetchOnce = async () => {
      try {
        const isAlpha = (provider || '').toLowerCase() === 'alpha';
        let raw;
        let actualProvider = isAlpha ? 'alpha' : 'finnhub';

        // Try primary provider first
        try {
          raw = isAlpha
            ? await alphaService.getGlobalQuote(symbol.toUpperCase())
            : await finnhubService.getQuote(symbol.toUpperCase());
          
          console.log(`[Socket] ${symbol} raw data from ${actualProvider}:`, JSON.stringify(raw));
        } catch (primaryErr) {
          // Fallback to alternate provider if rate-limited
          console.warn(`[Socket] ${actualProvider} failed for ${symbol}, trying fallback:`, primaryErr.message);
          
          if (isAlpha) {
            raw = await finnhubService.getQuote(symbol.toUpperCase());
            actualProvider = 'finnhub';
          } else {
            raw = await alphaService.getGlobalQuote(symbol.toUpperCase());
            actualProvider = 'alpha';
          }
          console.log(`[Socket] ${symbol} fallback data from ${actualProvider}:`, JSON.stringify(raw));
        }

        const price = raw.price != null ? Number(raw.price) : (raw.current != null ? Number(raw.current) : 0);
        const change = raw.change != null ? Number(raw.change) : null;
        const changePercent = raw.changePercent != null ? Number(raw.changePercent) : null;

        // Skip emitting if price is 0 or invalid
        if (price === 0 || !price) {
          console.warn(`[Socket] Invalid price (${price}) for ${symbol}, skipping emit`);
          socket.emit('error', { 
            message: `No valid data available for ${symbol}`, 
            provider: actualProvider, 
            symbol 
          });
          return;
        }

        const payload = {
          provider: actualProvider,
          symbol: (raw.symbol || symbol || '').toUpperCase(),
          price,
          change,
          changePercent,
          timestamp: raw.timestamp != null ? Number(raw.timestamp) : Date.now()
        };

        console.log(`[Socket] Emitting quote for ${symbol}:`, payload);
        socket.emit('quote', payload);
      } catch (err) {
        console.error(`[Socket] Error fetching ${symbol}:`, err);
        socket.emit('error', { message: err.message || 'fetch error', provider, symbol });
      }
    };

    await fetchOnce();
    const t = setInterval(fetchOnce, Math.max(3000, Number(intervalMs) || 10000));
    timers.set(key, t);
  });

  socket.on('unsubscribe', ({ symbol, provider = 'alpha' }) => {
    const key = `${provider}:${(symbol || '').toUpperCase()}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
    }
  });

  socket.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    timers.forEach((t) => clearInterval(t));
    timers.clear();
  });
});

// Listen on both IPv4 and IPv6 by omitting host
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port} (http://localhost:${port})`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

module.exports = app;
