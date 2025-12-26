const axios = require('axios');

async function run() {
  const PORT = process.env.PORT || 4001;
  const base = `http://localhost:${PORT}/api`;
  try {
    const h = await axios.get(`${base}/health`);
    console.log('/api/health ->', h.data);
  } catch (e) {
    console.error('/api/health error', e.response ? e.response.data : e.message);
  }

  try {
    const a = await axios.get(`${base}/proxy/alpha/quote`, { params: { symbol: 'AAPL' } });
    console.log('/proxy/alpha/quote ->', a.data);
  } catch (e) {
    console.error('/proxy/alpha/quote error', e.response ? e.response.data : e.message);
  }

  try {
    const f = await axios.get(`${base}/proxy/finnhub/quote`, { params: { symbol: 'AAPL' } });
    console.log('/proxy/finnhub/quote ->', f.data);
  } catch (e) {
    console.error('/proxy/finnhub/quote error', e.response ? e.response.data : e.message);
  }

  // Templates
  try {
    const t = await axios.get(`${base}/templates`);
    console.log('/templates ->', t.data);
  } catch (e) {
    console.error('/templates error', e.response ? e.response.data : e.message);
  }

  // Utils flatten
  try {
    const payload = { foo: { bar: 1 }, list: [{ a: 1 }, { b: 2 }] };
    const fl = await axios.post(`${base}/utils/flatten`, payload);
    console.log('/utils/flatten ->', fl.data);
  } catch (e) {
    console.error('/utils/flatten error', e.response ? e.response.data : e.message);
  }

  // Config save/get/export
  try {
    const cfg = { widgets: [{ type: 'card', symbol: 'AAPL' }] };
    const sv = await axios.post(`${base}/config/demo`, cfg);
    console.log('/config/demo POST ->', sv.data);
    const gt = await axios.get(`${base}/config/demo`);
    console.log('/config/demo GET ->', gt.data);
    const ex = await axios.get(`${base}/config/export/all`);
    console.log('/config/export/all ->', ex.data);
  } catch (e) {
    console.error('config endpoints error', e.response ? e.response.data : e.message);
  }
}

run();
