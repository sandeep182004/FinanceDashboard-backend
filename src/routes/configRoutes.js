const express = require('express');
const service = require('../services/configService');

const router = express.Router();

router.get('/:id', (req, res) => {
  const cfg = service.getConfig(req.params.id);
  if (!cfg) return res.status(404).json({ success: false, error: { message: 'Config not found' } });
  return res.json({ success: true, data: cfg });
});

router.post('/:id', (req, res) => {
  const saved = service.saveConfig(req.params.id, req.body || {});
  return res.json({ success: true, data: saved });
});

router.get('/export/all', (req, res) => {
  const all = service.exportAll();
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(JSON.stringify(all, null, 2));
});

router.post('/import/merge', (req, res) => {
  const payload = req.body || {};
  const merged = service.importMerge(payload);
  return res.json({ success: true, data: merged });
});

module.exports = router;
