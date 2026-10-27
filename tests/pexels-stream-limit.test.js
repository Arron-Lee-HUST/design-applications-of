"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { importPexelsImage } = require("../packages/assets/pexels");

test("Pexels import stops streaming once the 500 KB limit is exceeded", async () => {
  let index = 0;
  const chunks = [new Uint8Array(300 * 1024), new Uint8Array(250 * 1024)];
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: name => name === "content-type" ? "image/jpeg" : null },
    body: {
      getReader: () => ({
        read: async () => index < chunks.length ? { done: false, value: chunks[index++] } : { done: true },
        cancel: async () => {},
        releaseLock: () => {}
      })
    }
  });
  await assert.rejects(
    () => importPexelsImage({
      imageUrl: "https://images.pexels.com/photos/42/example.jpeg",
      pageUrl: "https://www.pexels.com/photo/example/"
    }, fakeFetch),
    error => error.code === "ASSET_TOO_LARGE" && error.statusCode === 413
  );
  assert.equal(index, 2);
});
