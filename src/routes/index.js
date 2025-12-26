const express = require('express');
const proxyRoutes = require('./proxyRoutes');
const configRoutes = require('./configRoutes');
const utilsRoutes = require('./utilsRoutes');
const templateRoutes = require('./templateRoutes');

const router = express.Router();

router.use('/proxy', proxyRoutes);
router.use('/config', configRoutes);
router.use('/utils', utilsRoutes);
router.use('/templates', templateRoutes);

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

module.exports = router;
