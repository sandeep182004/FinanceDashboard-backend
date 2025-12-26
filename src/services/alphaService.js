const http = require('../utils/httpClient');
const { alphaVantageKey } = require('../config');

/**
 * Fetch historical intraday prices from Alpha Vantage
 * Uses function=TIME_SERIES_INTRADAY to fetch prices over a period
 */
async function getHistoricalPrices(symbol, days = 30) {
  if (!alphaVantageKey) {
    const err = new Error('Alpha Vantage API key is not configured');
    err.status = 500;
    throw err;
  }

  const url = 'https://www.alphavantage.co/query';
  const params = {
    function: 'TIME_SERIES_INTRADAY',
    symbol,
    interval: '60min',
    apikey: alphaVantageKey
  };

  const resp = await http.get(url, { params });

  const payload = resp.data || {};
  if (payload.Note || payload['Error Message']) {
    const err = new Error(payload.Note || payload['Error Message'] || 'Alpha Vantage error');
    err.status = resp.status || 429;
    throw err;
  }

  const timeSeries = payload['Time Series (60min)'] || {};
  const now = Date.now();
  const daysMs = days * 24 * 60 * 60 * 1000;
  const cutoffTime = now - daysMs;

  const prices = Object.entries(timeSeries)
    .map(([dateStr, data]) => {
      const timestamp = new Date(dateStr).getTime();
      return {
        timestamp,
        price: parseFloat(data['4. close']) || 0
      };
    })
    .filter(item => item.timestamp >= cutoffTime)
    .sort((a, b) => a.timestamp - b.timestamp);

  return prices;
}

/**
 * Fetch global quote from Alpha Vantage
 * Uses function=GLOBAL_QUOTE to fetch latest price for a symbol
 */
async function getGlobalQuote(symbol) {
  if (!alphaVantageKey) {
    const err = new Error('Alpha Vantage API key is not configured');
    err.status = 500;
    throw err;
  }

  const url = 'https://www.alphavantage.co/query';
  const params = {
    function: 'GLOBAL_QUOTE',
    symbol,
    apikey: alphaVantageKey
  };

  const resp = await http.get(url, { params });

  // Alpha Vantage returns data under 'Global Quote'
  const payload = resp.data || {};
  if (payload.Note || payload['Error Message']) {
    const err = new Error(payload.Note || payload['Error Message'] || 'Alpha Vantage error');
    err.status = resp.status || 429;
    throw err;
  }

  const quote = payload['Global Quote'] || {};
  const price = parseFloat(quote['05. price']) || 0;
  const change = parseFloat(quote['09. change']) || 0;
  const changePercent = parseFloat(quote['10. change percent']) || 0;
  
  return {
    symbol: quote['01. symbol'] || symbol,
    price,
    change,
    changePercent,
    timestamp: Date.now()
  };
}

module.exports = { getGlobalQuote, getHistoricalPrices };
