import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const configPath = path.join(root, "self-hosted/wrangler.json");
const placeholder = "00000000-0000-4000-8000-000000000000";
async function exists(file) { try { await access(file); return true; } catch (error) { if(error.code === "ENOENT") return false; throw error; } }

export async function setupSync() {
  const directory = path.join(root, "self-hosted");
  await mkdir(directory, {recursive: true});
  if (!(await exists(configPath))) {
    await writeFile(configPath, await readFile(path.join(directory, "wrangler.example.json")), {flag: "wx"});
  }
  const secretPath = path.join(directory, ".dev.vars");
  if (!(await exists(secretPath))) {
    await writeFile(secretPath, 'TODO_AUTH_SECRET="' + randomBytes(32).toString("hex") + '"\n', {flag: "wx", mode: 0o600});
  }
}

export function validateSyncConfig(config, remote = false, deploy = false) {
  if (!config || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.name || "")) throw Error("Choose a valid Worker name in self-hosted/wrangler.json.");
  const databases = config.d1_databases || [];
  const db = databases.find(item => item.binding === "DB");
  if (!db || !db.database_name || !/^[0-9a-f-]{36}$/i.test(db.database_id || "")) throw Error("Configure the DB binding and D1 database ID.");
  if (remote && db.database_id === placeholder) throw Error("Create your own D1 database and replace the example database ID before a remote operation.");
  const origin = config.vars?.TODO_AUTH_ORIGIN;
  let parsed;
  try { parsed = new URL(origin); } catch { throw Error("Configure TODO_AUTH_ORIGIN with your app's full origin."); }
  if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash || !["https:","http:"].includes(parsed.protocol)) throw Error("TODO_AUTH_ORIGIN must be an origin without a trailing slash or path.");
  if (deploy && (parsed.protocol !== "https:" || ["localhost","127.0.0.1","[::1]"].includes(parsed.hostname))) throw Error("Set TODO_AUTH_ORIGIN to your own public HTTPS URL before deployment.");
  return config;
}

export async function readSyncConfig(remote = false, deploy = false) {
  return validateSyncConfig(JSON.parse(await readFile(configPath, "utf8")), remote, deploy);
}
