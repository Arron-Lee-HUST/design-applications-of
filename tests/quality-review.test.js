"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { reviewDeck } = require("../packages/design-workflow/quality");

function sample() {
  return {
    schemaVersion: "1.0.0",
    metadata: { title: "Test", audience: "Team", brief: "Brief", tone: "Clear" },
    design: { direction: "editorial", aspectRatio: "16:9", theme: "editorial" },
    slides: [
      { id: "s1", order: 1, layout: "title-body", title: "Overview", body: "This is enough detail to explain the overview.", notes: "Opening" },
      { id: "s2", order: 2, layout: "title-body", title: "Next steps", body: "The team should review the proposal and agree on owners.", notes: "" },
      { id: "s3", order: 3, layout: "title-body", title: "Conclusion", body: "Summarize the main points and proposed next actions.", notes: "" }
    ]
  };
}

test("reports a healthy deck with no errors", () => {
  const result = reviewDeck(sample());
  assert.notEqual(result.status, "blocked");
  assert.equal(result.findings.filter(x => x.severity === "error").length, 0);
});

test("flags repeated titles and dense content", () => {
  const deck = sample();
  deck.slides[1].title = deck.slides[0].title;
  deck.slides[1].body = "x".repeat(300);
  const result = reviewDeck(deck);
  assert.ok(result.findings.some(x => x.code === "DUPLICATE_TITLE"));
  assert.ok(result.findings.some(x => x.code === "DENSE_BODY"));
});

test("blocks invalid schema input", () => {
  const result = reviewDeck({ schemaVersion: "invalid" });
  assert.equal(result.status, "blocked");
  assert.equal(result.score, 0);
});
