import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createLocalServer } from "../scripts/local-server.mjs";

test("clean local start serves UI and assets without account or API dependencies", async t => {
  const server = createLocalServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.ok(html.includes("/planner/local-mode.js"));
  assert.ok(!html.includes("account-bootstrap"));
  assert.ok(!html.includes("cloud.js"));
  const assets = [...html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[^"]*)"/g)].map(match => match[1]);
  for (const asset of new Set(assets)) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, asset);
  }
  const js = await fetch(origin + "/planner/app.js");
  assert.match(js.headers.get("content-type"), /javascript/);
  assert.equal((await fetch(origin + "/api/account/me")).status, 404);
  assert.equal((await fetch(origin, {method: "POST"})).status, 405);
  const head = await fetch(origin, {method: "HEAD"});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  for (const file of ["/package.json", "/.env", "/.git/config", "/%2e%2e/package.json", "/%5c..%5cpackage.json"]) {
    const status = await new Promise((resolve, reject) => {
      http.get(origin + file, response => { response.resume(); resolve(response.statusCode); }).on("error", reject);
    });
    assert.ok([403, 404].includes(status), file);
  }
});
