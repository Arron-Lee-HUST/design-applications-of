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


test("provides actionable deterministic findings for layout mismatch and missing image metadata", () => {
  const deck = sample();
  deck.slides[1] = { ...deck.slides[1], layout: "metric-highlight", metricValue: "", metricLabel: "", imageData: "data:image/png;base64,AAAA", imageAlt: "", imageSource: "" };
  const result = reviewDeck(deck);
  const metric = result.findings.find(x => x.code === "METRIC_INCOMPLETE");
  assert.ok(metric);
  assert.equal(metric.source, "rule");
  assert.match(metric.recommendation, /指标数值/);
  assert.ok(result.findings.some(x => x.code === "IMAGE_ALT_MISSING"));
  assert.ok(result.findings.some(x => x.code === "IMAGE_SOURCE_MISSING"));
});

test("flags duplicated body copy and chart label/value mismatch with slide numbers", () => {
  const deck = sample();
  deck.slides[1].body = deck.slides[0].body;
  deck.slides[2] = { ...deck.slides[2], layout: "chart", chartLabels: ["2024", "2025", "2026"], chartValues: [12, 20] };
  const result = reviewDeck(deck);
  const duplicate = result.findings.find(x => x.code === "DUPLICATE_CONTENT");
  const chart = result.findings.find(x => x.code === "CHART_DATA_MISMATCH");
  assert.equal(duplicate.slide, 2);
  assert.equal(chart.slide, 3);
  assert.match(chart.recommendation, /一一对应/);
});
