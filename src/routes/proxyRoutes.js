const express = require('express');
const { alphaQuote, finnhubQuote, alphaHistory, finnhubHistory } = require('../controllers/proxyController');

const router = express.Router();

router.get('/alpha/quote', alphaQuote);
router.get('/alpha/history', alphaHistory);
router.get('/finnhub/quote', finnhubQuote);
router.get('/finnhub/history', finnhubHistory);

module.exports = router;
