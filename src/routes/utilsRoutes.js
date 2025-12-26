const express = require('express');
const { flatten } = require('../utils/jsonPaths');
const alphaService = require('../services/alphaService');
const finnhubService = require('../services/finnhubService');

const router = express.Router();

router.post('/flatten', (req, res) => {
  const body = req.body || {};
  const result = flatten(body);
  return res.json({ success: true, data: result });
});

router.get('/schema', async (req, res, next) => {
  try {
    const provider = (req.query.provider || '').toLowerCase();
    const symbol = (req.query.symbol || '').toUpperCase();
    const type = (req.query.type || 'quote').toLowerCase();
    if (!provider || !symbol) return res.status(400).json({ success: false, error: { message: 'Missing provider or symbol' } });

    let sample = null;
    if (provider === 'alpha') {
      sample = type === 'history' ? await alphaService.getHistoricalPrices(symbol, 5) : await alphaService.getGlobalQuote(symbol);
    } else if (provider === 'finnhub') {
      sample = type === 'history' ? await finnhubService.getHistoricalPrices(symbol, 5) : await finnhubService.getQuote(symbol);
    } else {
      return res.status(400).json({ success: false, error: { message: 'Unsupported provider' } });
    }

    const result = flatten(sample);
    return res.json({ success: true, data: result, meta: { provider, symbol, type } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
