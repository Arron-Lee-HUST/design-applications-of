"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter, positiveInteger } = require("../packages/security/rate-limit");

test("validates positive integer configuration with safe fallbacks", () => {
  assert.equal(positiveInteger("25", 60), 25);
  assert.equal(positiveInteger("0", 60), 60);
  assert.equal(positiveInteger("not-a-number", 60), 60);
});

test("enforces a fixed-window quota and resets after the window expires", () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 2, windowMs: 500, now: () => now });
  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").remaining, 0);
  const blocked = limiter.check("client-a");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 500);
  now += 500;
  assert.equal(limiter.check("client-a").allowed, true);
});

test("keeps quotas isolated per client key", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 1000 });
  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);
  assert.equal(limiter.check("client-b").allowed, true);
});
