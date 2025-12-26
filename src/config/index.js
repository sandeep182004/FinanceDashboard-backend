const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isNaN(n) ? def : n;
};

module.exports = {
  port: toInt(process.env.PORT, 4001),
  alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  finnhubKey: process.env.FINNHUB_API_KEY || '',
  cacheTtlSeconds: toInt(process.env.CACHE_TTL_SECONDS, 300),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toInt(process.env.RATE_LIMIT_MAX, 600)
};
