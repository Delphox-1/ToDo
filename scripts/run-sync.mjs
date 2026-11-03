import { spawnSync } from "node:child_process";
import path from "node:path";
import { setupSync, readSyncConfig, root, configPath } from "./sync-config.mjs";

const command = process.argv[2];
if (!["setup", "dev", "migrate-local", "migrate-remote", "deploy", "dry-run"].includes(command)) throw Error("Unknown sync command.");
await setupSync();
if (command === "setup") {
  console.log("Created local-only config and authentication secret (existing files preserved).\nEdit self-hosted/wrangler.json for your own deployment.");
} else {
  const config = await readSyncConfig(["migrate-remote","deploy"].includes(command), command === "deploy");
  function wrangler(args) {
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), ...args, "--config", configPath], {cwd: root, stdio:"inherit", env: {...process.env, WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS || "false"}});
    if(result.error) throw result.error;
    if(result.status !== 0) process.exit(result.status || 1);
  }
  if (["dev","migrate-local"].includes(command)) wrangler(["d1","migrations","apply","DB","--local"]);
  if (command === "dev") wrangler(["dev","--local","--port","8787","--var","TODO_AUTH_ORIGIN:http://127.0.0.1:8787"]);
  if (command === "migrate-remote") wrangler(["d1","migrations","apply","DB","--remote"]);
  if (command === "deploy") wrangler(["deploy"]);
  if (command === "dry-run") wrangler(["deploy","--dry-run","--outdir",path.join(root,"outputs/sync-dry-run")]);
}
