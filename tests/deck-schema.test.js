"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateDeck } = require("../packages/deck-schema");

function validDeck() {
  return {
    schemaVersion: "1.0.0",
    metadata: { title: "Quarterly update", audience: "Team", brief: "Share results", tone: "Clear" },
    design: { direction: "editorial", aspectRatio: "16:9", theme: "editorial" },
    slides: [{ id: "slide-1", order: 1, layout: "title-body", title: "Overview", body: "Highlights", notes: "" }]
  };
}

test("accepts a valid portable deck", () => {
  assert.deepEqual(validateDeck(validDeck()), { valid: true, errors: [] });
});

test("rejects unsupported schema versions", () => {
  const deck = validDeck();
  deck.schemaVersion = "2.0.0";
  assert.equal(validateDeck(deck).valid, false);
});

test("rejects empty and oversized slide collections", () => {
  const empty = validDeck();
  empty.slides = [];
  assert.ok(validateDeck(empty).errors.some(error => error.includes("between 1 and 100")));
  const oversized = validDeck();
  oversized.slides = Array.from({ length: 101 }, (_, i) => ({ id: "s" + i, order: i + 1, layout: "title-body", title: "", body: "", notes: "" }));
  assert.equal(validateDeck(oversized).valid, false);
});

test("rejects invalid slide fields and unsafe text sizes", () => {
  const deck = validDeck();
  deck.slides[0].layout = "unknown-layout";
  deck.slides[0].title = "x".repeat(301);
  const result = validateDeck(deck);
  assert.ok(result.errors.some(error => error.includes("layout is unsupported")));
  assert.ok(result.errors.some(error => error.includes("title exceeds 300")));
});

test("handles non-object input without throwing", () => {
  assert.equal(validateDeck(null).valid, false);
  assert.equal(validateDeck("not a deck").valid, false);
});
