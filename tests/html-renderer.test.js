"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { renderWebsite } = require("../packages/render-html");

function deck() {
  return {
    schemaVersion: "1.0.0",
    metadata: { title: "<Launch & Learn>", audience: "Teams", brief: "A concise project overview.", tone: "Clear" },
    design: { direction: "editorial", aspectRatio: "16:9", theme: "editorial" },
    slides: [
      { id: "s1", order: 1, layout: "title-body", title: "Problem & context", body: "Explain the problem.", notes: "", imageData: "data:image/png;base64,AAAA", imageAlt: "Diagram", imageSource: "Author / CC BY 4.0" },
      { id: "s2", order: 2, layout: "title-body", title: "Solution", body: "Describe the approach.", notes: "" }
    ]
  };
}

test("renders a standalone responsive HTML page with all sections", () => {
  const html = renderWebsite(deck());
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /name="viewport"/);
  assert.match(html, /id="section-1"/);
  assert.match(html, /id="section-2"/);
  assert.match(html, /@media\(max-width:800px\)/);
});

test("escapes user-supplied title and body content", () => {
  const html = renderWebsite(deck());
  assert.match(html, /&lt;Launch &amp; Learn&gt;/);
  assert.doesNotMatch(html, /<Launch & Learn>/);
});

test("rejects invalid deck documents", () => {
  assert.throws(() => renderWebsite({}), error => error.code === "INVALID_DECK");
});

test("renders embedded images with escaped alternative text", () => {
  const html = renderWebsite(deck());
  assert.match(html, /class="story-image"/);
  assert.match(html, /src="data:image\/png;base64,AAAA"/);
  assert.match(html, /alt="Diagram"/);
  assert.match(html, /图片来源：Author \/ CC BY 4\.0/);
});

test("renders section-divider and metric-highlight website layouts", () => {
  const input = deck();
  input.slides[0].layout = "section-divider";
  input.slides[1].layout = "metric-highlight";
  input.slides[1].metricValue = "35%";
  input.slides[1].metricLabel = "Conversion < improvement";
  const html = renderWebsite(input);
  assert.match(html, /class="story layout-section-divider"/);
  assert.match(html, /class="story layout-metric-highlight"/);
  assert.match(html, /class="metric-callout"/);
  assert.match(html, /Conversion &lt; improvement/);
});
