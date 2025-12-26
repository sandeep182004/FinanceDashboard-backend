function typeOf(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function flatten(obj, opts = {}) {
  const { maxItems = 3 } = opts;
  const out = [];

  function walk(value, currentPath) {
    const t = typeOf(value);
    if (t !== 'object' && t !== 'array') {
      out.push({ path: currentPath || '', type: t, example: value });
      return;
    }
    if (Array.isArray(value)) {
      const sample = value.slice(0, maxItems);
      out.push({ path: currentPath || '', type: 'array', example: sample });
      sample.forEach((item, idx) => walk(item, `${currentPath}[${idx}]`));
      return;
    }
    const keys = Object.keys(value);
    if (!keys.length) {
      out.push({ path: currentPath || '', type: 'object', example: {} });
      return;
    }
    keys.forEach((k) => walk(value[k], currentPath ? `${currentPath}.${k}` : k));
  }

  walk(obj, '');
  return out;
}

module.exports = { flatten };
