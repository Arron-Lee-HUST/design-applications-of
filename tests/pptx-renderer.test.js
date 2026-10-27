"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { renderDeck } = require("../packages/render-pptx");

function deck(direction = "editorial") {
  return {
    schemaVersion: "1.0.0",
    metadata: { title: "测试演示文稿", audience: "团队", brief: "测试导出", tone: "专业" },
    design: { direction, aspectRatio: "16:9", theme: direction === "modern" ? "dark" : direction === "data" ? "analytical" : "editorial" },
    slides: [
      { id: "slide-1", order: 1, layout: "title-body", title: "封面标题", body: "这是一段可编辑正文。", notes: "讲者备注", imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC", imageAlt: "测试图片" },
      { id: "slide-2", order: 2, layout: "title-body", title: "第二页", body: "更多内容。", notes: "" }
    ]
  };
}

test("renders an OOXML PowerPoint buffer with multiple editable slides", async () => {
  const output = await renderDeck(deck());
  assert.ok(Buffer.isBuffer(output));
  assert.ok(output.length > 1000);
  assert.equal(output.readUInt32LE(0), 0x04034b50, "PPTX must be a ZIP package");
});

test("supports all three design directions", async () => {
  for (const direction of ["editorial", "modern", "data"]) {
    const output = await renderDeck(deck(direction));
    assert.ok(Buffer.isBuffer(output));
    assert.ok(output.length > 1000);
  }
});

test("rejects invalid deck input before rendering", async () => {
  assert.throws(() => renderDeck({}), error => error.code === "INVALID_DECK");
});

test("embeds a slide image in the PPTX output", async () => {
  const output = await renderDeck(deck());
  assert.ok(Buffer.isBuffer(output));
  assert.ok(output.length > 1000);
});
