const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const TEMPLATES_PATH = path.resolve(process.cwd(), 'data', 'templates.json');

router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(TEMPLATES_PATH, 'utf8');
    const list = JSON.parse(raw || '[]');
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Unable to load templates' } });
  }
});

module.exports = router;
