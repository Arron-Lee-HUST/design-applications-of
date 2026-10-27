"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { readJson } = require("../server");

test("readJson parses valid JSON", async () => {
  const request = Readable.from([Buffer.from('{"ok":true}')]);
  assert.deepEqual(await readJson(request), { ok: true });
});

test("readJson returns a 413 error for oversized bodies without destroying the stream", async () => {
  const request = Readable.from([Buffer.from("123456789")]);
  await assert.rejects(
    () => readJson(request, 8),
    error => error.statusCode === 413 && /超过/.test(error.message)
  );
});

test("readJson returns a 400 error for malformed JSON", async () => {
  const request = Readable.from([Buffer.from("{not-json")]);
  await assert.rejects(
    () => readJson(request),
    error => error.statusCode === 400 && /有效 JSON/.test(error.message)
  );
});
