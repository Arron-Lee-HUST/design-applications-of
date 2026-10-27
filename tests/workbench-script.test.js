"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("workbench inline JavaScript parses successfully", () => {
  const match = html.match(/<script>([\\s\\S]*?)<\\/script>/i);
  assert.ok(match, "index.html should contain its workbench script");
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: "index.html" }));
});

test("project manager exposes create, switch, duplicate, rename, and delete controls", () => {
  for (const id of ["projectSelect", "newProject", "duplicateProject", "renameProject", "deleteProject"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /const PROJECTS_KEY="design-studio-projects"/);
  assert.match(html, /localStorage\\.setItem\\(PROJECTS_KEY/);
  assert.match(html, /projectStore\\.projects\\.length>=20/);
});

test("project manager retains a migration path from the earlier single-draft key", () => {
  assert.match(html, /localStorage\\.getItem\\("design-studio-draft"\\)/);
});
