"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { searchPexels, importPexelsImage } = require("../packages/assets/pexels");

test("Pexels search requires a query and server-side API key", async () => {
  await assert.rejects(() => searchPexels(""), error => error.code === "INVALID_ASSET_QUERY");
  await assert.rejects(() => searchPexels("mountains", {}), error => error.code === "ASSET_SEARCH_NOT_CONFIGURED" && error.statusCode === 503);
});

test("Pexels search normalizes results and sends the API key only server-side", async () => {
  let request;
  const fakeFetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        total_results: 1,
        photos: [{ id: 42, alt: "Mountain at sunrise", photographer: "A. Photographer", url: "https://www.pexels.com/photo/example/", src: { medium: "https://images.pexels.com/photos/42/example.jpeg" } }]
      })
    };
  };
  const result = await searchPexels("mountain sunrise", { PEXELS_API_KEY: "server-secret" }, fakeFetch);
  assert.match(request.url, /query=mountain%20sunrise/);
  assert.equal(request.options.headers.Authorization, "server-secret");
  assert.equal(result.photos[0].id, "42");
  assert.equal(result.photos[0].photographer, "A. Photographer");
});

test("Pexels import rejects non-Pexels image hosts", async () => {
  await assert.rejects(
    () => importPexelsImage({ imageUrl: "https://example.com/image.jpg", pageUrl: "https://www.pexels.com/photo/example/" }, async () => { throw new Error("must not fetch"); }),
    error => error.code === "INVALID_ASSET_URL" && error.statusCode === 400
  );
});

test("Pexels import returns a bounded data URL and photographer credit", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: name => name === "content-type" ? "image/jpeg" : name === "content-length" ? "3" : null },
    arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer
  });
  const result = await importPexelsImage({
    imageUrl: "https://images.pexels.com/photos/42/example.jpeg",
    pageUrl: "https://www.pexels.com/photo/example/",
    photographer: "A. Photographer",
    alt: "Mountain"
  }, fakeFetch);
  assert.equal(result.imageData, "data:image/jpeg;base64,AQID");
  assert.equal(result.imageAlt, "Mountain");
  assert.match(result.imageSource, /A\. Photographer on Pexels/);
});

test("Pexels import rejects unsupported content types", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: name => name === "content-type" ? "text/html" : null },
    arrayBuffer: async () => new ArrayBuffer(0)
  });
  await assert.rejects(
    () => importPexelsImage({
      imageUrl: "https://images.pexels.com/photos/42/example.jpeg",
      pageUrl: "https://www.pexels.com/photo/example/"
    }, fakeFetch),
    error => error.code === "INVALID_ASSET_TYPE" && error.statusCode === 415
  );
});
