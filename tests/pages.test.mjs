import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildPages } from "../scripts/build-pages.mjs";

test("Pages assets and home-screen manifest resolve under a renamed project path", async t => {
  const output = await mkdtemp(path.join(os.tmpdir(), "todo-pages-"));
  t.after(() => rm(output, {recursive: true, force: true}));
  await buildPages(output);
  const base = new URL("https://example.github.io/renamed-planner/");
  const html = await readFile(path.join(output, "index.html"), "utf8");
  for (const [, link] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(https?:|#)/.test(link)) continue;
    const url = new URL(link, base);
    assert.ok(url.pathname.startsWith(base.pathname), link);
    await stat(path.join(output, decodeURIComponent(url.pathname.slice(base.pathname.length))));
  }
  const manifest = JSON.parse(await readFile(path.join(output, "manifest.webmanifest"), "utf8"));
  assert.equal(new URL(manifest.scope, base).pathname, base.pathname);
  assert.equal(new URL(manifest.start_url, base).pathname, base.pathname);
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, base);
    assert.ok(url.pathname.startsWith(base.pathname));
    await stat(path.join(output, url.pathname.slice(base.pathname.length)));
  }
  const install = await readFile(path.join(output, "planner/install.js"), "utf8");
  assert.ok(install.includes('new URL(".", location.href).href'));
  assert.ok(!html.includes("account-bootstrap") && !html.includes("cloud.js"));
  assert.equal(await readFile(path.join(output, ".nojekyll"), "utf8"), "");
});
