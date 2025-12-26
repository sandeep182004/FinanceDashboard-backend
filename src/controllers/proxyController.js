const cache = require('../utils/cache');
const { cacheTtlSeconds } = require('../config');
const alphaService = require('../services/alphaService');
const finnhubService = require('../services/finnhubService');

function makeSuccess(data, meta = {}) {
  return { success: true, data, meta };
}

async function alphaQuote(req, res, next) {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ success: false, error: { message: 'Missing symbol query parameter' } });

    const key = `alpha:quote:${symbol}`;
    const cached = cache.get(key);
    if (cached) return res.json(makeSuccess(cached, { provider: 'alpha', cached: true }));

    // Try Alpha Vantage first
    try {
      const quote = await alphaService.getGlobalQuote(symbol);
      cache.set(key, quote, cacheTtlSeconds);
      return res.json(makeSuccess(quote, { provider: 'alpha', cached: false }));
    } catch (errAlpha) {
      // If Alpha is rate-limited, fall back to Finnhub
      if ((errAlpha.status === 429) || (errAlpha.message && errAlpha.message.includes('rate'))) {
        try {
          const fbKey = `finnhub:quote:${symbol}`;
          const cachedFb = cache.get(fbKey);
          if (cachedFb) return res.json(makeSuccess(cachedFb, { provider: 'finnhub', cached: true, fallback: true }));

          const fbRaw = await finnhubService.getQuote(symbol);

          const price = fbRaw.current != null ? Number(fbRaw.current) : 0;
          const prev = fbRaw.previous_close != null ? Number(fbRaw.previous_close) : null;
          const change = prev != null ? +(price - prev).toFixed(2) : 0;
          const changePercent = prev ? +((change / prev) * 100).toFixed(2) : 0;
          const timestamp = fbRaw.timestamp ? Number(fbRaw.timestamp) * 1000 : Date.now();

          const mapped = {
            symbol: symbol,
            price,
            change,
            changePercent,
            timestamp
          };

          cache.set(fbKey, mapped, cacheTtlSeconds);
          return res.json(makeSuccess(mapped, { provider: 'finnhub', cached: false, fallback: true }));
        } catch (errFb) {
          if (errFb.message && errFb.message.includes('rate') && !errFb.status) errFb.status = 429;
          return next(errFb);
        }
      }
      if (errAlpha.message && errAlpha.message.includes('rate') && !errAlpha.status) errAlpha.status = 429;
      return next(errAlpha);
    }
  } catch (err) {
    // Map upstream rate-limit to 429 when possible
    if (err.message && err.message.includes('rate') && !err.status) err.status = 429;
    return next(err);
  }
}

async function finnhubQuote(req, res, next) {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ success: false, error: { message: 'Missing symbol query parameter' } });

    const key = `finnhub:quote:${symbol}`;
    const cached = cache.get(key);
    if (cached) return res.json(makeSuccess(cached, { provider: 'finnhub', cached: true }));

    const quote = await finnhubService.getQuote(symbol);
    cache.set(key, quote, cacheTtlSeconds);
    return res.json(makeSuccess(quote, { provider: 'finnhub', cached: false }));
  } catch (err) {
    if (err.message && err.message.includes('rate') && !err.status) err.status = 429;
    return next(err);
  }
}

async function alphaHistory(req, res, next) {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    const days = parseInt(req.query.days, 10) || 30;

    if (!symbol) return res.status(400).json({ success: false, error: { message: 'Missing symbol query parameter' } });

    const key = `alpha:history:${symbol}:${days}`;
    const cached = cache.get(key);
    if (cached) return res.json(makeSuccess(cached, { provider: 'alpha', cached: true }));

    const history = await alphaService.getHistoricalPrices(symbol, days);
    cache.set(key, history, cacheTtlSeconds);
    return res.json(makeSuccess(history, { provider: 'alpha', cached: false }));
  } catch (err) {
    if (err.message && err.message.includes('rate') && !err.status) err.status = 429;
    return next(err);
  }
}

async function finnhubHistory(req, res, next) {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    const days = parseInt(req.query.days, 10) || 30;

    if (!symbol) return res.status(400).json({ success: false, error: { message: 'Missing symbol query parameter' } });

    const key = `finnhub:history:${symbol}:${days}`;
    const cached = cache.get(key);
    if (cached) return res.json(makeSuccess(cached, { provider: 'finnhub', cached: true }));

    const history = await finnhubService.getHistoricalPrices(symbol, days);
    cache.set(key, history, cacheTtlSeconds);
    return res.json(makeSuccess(history, { provider: 'finnhub', cached: false }));
  } catch (err) {
    if (err.message && err.message.includes('rate') && !err.status) err.status = 429;
    return next(err);
  }
}

module.exports = { alphaQuote, finnhubQuote, alphaHistory, finnhubHistory };
