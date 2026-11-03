import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateSyncConfig} from "../scripts/sync-config.mjs";
const example=JSON.parse(await readFile(new URL("../self-hosted/wrangler.example.json",import.meta.url),"utf8"));

test("local sync works without a cloud account but remote operations require a real database and HTTPS origin",()=>{
  assert.equal(validateSyncConfig(example).name,"todo-self-hosted");
  assert.throws(()=>validateSyncConfig(example,true),/database ID/);
  const own=structuredClone(example);
  own.d1_databases[0].database_id="11111111-2222-4333-8444-555555555555";
  assert.throws(()=>validateSyncConfig(own,true,true),/HTTPS/);
  own.vars.TODO_AUTH_ORIGIN="https://my-todo.example.com";
  assert.equal(validateSyncConfig(own,true,true).vars.TODO_AUTH_ORIGIN,"https://my-todo.example.com");
  own.vars.TODO_AUTH_ORIGIN="https://my-todo.example.com/path";
  assert.throws(()=>validateSyncConfig(own,true,true),/origin/);
});
