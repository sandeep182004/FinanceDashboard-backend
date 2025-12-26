const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIGS_PATH = path.join(DATA_DIR, 'configs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIGS_PATH)) fs.writeFileSync(CONFIGS_PATH, '{}', 'utf8');
}

function readAll() {
  ensureDataDir();
  const raw = fs.readFileSync(CONFIGS_PATH, 'utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function writeAll(obj) {
  ensureDataDir();
  fs.writeFileSync(CONFIGS_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

function getConfig(id) {
  const all = readAll();
  return all[id] || null;
}

function saveConfig(id, data) {
  const all = readAll();
  all[id] = data;
  writeAll(all);
  return all[id];
}

function exportAll() {
  return readAll();
}

function importMerge(obj) {
  const all = readAll();
  const merged = { ...all, ...obj };
  writeAll(merged);
  return merged;
}

module.exports = { getConfig, saveConfig, exportAll, importMerge };
