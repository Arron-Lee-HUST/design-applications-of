"use strict";

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createRateLimiter(options = {}) {
  const limit = positiveInteger(options.limit, 60);
  const windowMs = positiveInteger(options.windowMs, 60_000);
  const now = typeof options.now === "function" ? options.now : Date.now;
  const maxKeys = positiveInteger(options.maxKeys, 10_000);
  const entries = new Map();

  function prune(currentTime) {
    if (entries.size <= maxKeys) return;
    for (const [key, entry] of entries) {
      if (currentTime - entry.startedAt >= windowMs) entries.delete(key);
      if (entries.size <= maxKeys) break;
    }
    while (entries.size > maxKeys) entries.delete(entries.keys().next().value);
  }

  return {
    check(key) {
      const currentTime = now();
      const normalizedKey = String(key || "unknown").slice(0, 200);
      let entry = entries.get(normalizedKey);
      if (!entry || currentTime - entry.startedAt >= windowMs) {
        entry = { startedAt: currentTime, count: 0 };
        entries.set(normalizedKey, entry);
      }
      prune(currentTime);
      if (entry.count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterMs: Math.max(1, windowMs - (currentTime - entry.startedAt))
        };
      }
      entry.count += 1;
      return { allowed: true, limit, remaining: limit - entry.count, retryAfterMs: 0 };
    },
    clear() {
      entries.clear();
    }
  };
}

module.exports = { createRateLimiter, positiveInteger };
