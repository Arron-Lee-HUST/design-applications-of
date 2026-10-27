"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("workbench inline JavaScript parses successfully", () => {
  const start = html.indexOf("<script>");
  const end = html.lastIndexOf("</script>");
  assert.ok(start >= 0 && end > start, "index.html should contain its workbench script");
  const source = html.slice(start + "<script>".length, end);
  assert.doesNotThrow(() => new vm.Script(source, { filename: "index.html" }));
});

test("project manager exposes create, switch, duplicate, rename, and delete controls", () => {
  for (const id of ["projectSelect", "newProject", "duplicateProject", "renameProject", "deleteProject"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing control: " + id);
  }
  assert.ok(html.includes('const PROJECTS_KEY="design-studio-projects"'));
  assert.ok(html.includes("localStorage.setItem(PROJECTS_KEY"));
  assert.ok(html.includes("projectStore.projects.length>=20"));
});

test("project manager retains a migration path from the earlier single-draft key", () => {
  assert.ok(html.includes('localStorage.getItem("design-studio-draft")'));
});
