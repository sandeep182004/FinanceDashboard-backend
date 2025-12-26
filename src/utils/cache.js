class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    this.cleanupInterval.unref && this.cleanupInterval.unref();
  }

  get(key) {
    const record = this.store.get(key);
    if (!record) return null;
    const { expiresAt, value } = record;
    if (expiresAt && Date.now() > expiresAt) {
      this.store.delete(key);
      return null;
    }
    return value;
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.store.entries()) {
      if (expiresAt && now > expiresAt) this.store.delete(key);
    }
  }
}

module.exports = new InMemoryCache();
