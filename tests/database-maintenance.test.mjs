import {test} from "node:test";
import assert from "node:assert/strict";
import {checkAccountDatabase} from "../lib/database-maintenance.mjs";
import Core from "../lib/planner-core.mjs";
const state=()=>({version:1,tasks:[],projects:[],trash:[],notes:{},customMetadata:"keep"});
function database(payload,conflict=false){const calls=[];return{calls,prepare(sql){return{bind(...args){calls.push({sql,args});return{async first(){return payload===null?null:{payload,revision:4};},async run(){return{meta:{changes:sql.startsWith("UPDATE")?(conflict?0:1):2}};}};}};}};}
test("inspection compacts only this user's JSON without changing any data and removes only their expired sessions",async()=>{
 const before=JSON.stringify(state(),null,2),db=database(before);
 const result=await checkAccountDatabase(db,"account:alice",Core.validate,1000);
 assert.equal(result.ok,true);assert.equal(result.compacted,true);assert.equal(result.expiredSessionsRemoved,2);
 const update=db.calls.find(c=>c.sql.startsWith("UPDATE"));
 assert.deepEqual(JSON.parse(update.args[0]),JSON.parse(before));
 assert.equal(update.args[2],"account:alice");assert.equal(update.args[3],4);assert.equal(update.args[4],before);
 const remove=db.calls.find(c=>c.sql.startsWith("DELETE"));
 assert.match(remove.sql,/WHERE user_id=\? AND expires_at < \?/);assert.deepEqual(remove.args,["alice",1000]);
});
test("invalid saved data is reported without any write or deletion",async()=>{
 const db=database('{"broken":true}');const result=await checkAccountDatabase(db,"account:alice",Core.validate);
 assert.equal(result.error,"invalid_data");assert.equal(db.calls.length,1);
});
test("concurrent changes abort compaction without overwriting data or deleting sessions",async()=>{
 const db=database(JSON.stringify(state(),null,2),true);const result=await checkAccountDatabase(db,"account:alice",Core.validate);
 assert.equal(result.error,"revision_conflict");assert.equal(db.calls.filter(c=>c.sql.startsWith("DELETE")).length,0);
});
test("already compact data is not rewritten and a platform user cannot clean another account's sessions",async()=>{
 const db=database(JSON.stringify(state()));const result=await checkAccountDatabase(db,"platform-user",Core.validate);
 assert.equal(result.ok,true);assert.equal(result.compacted,false);assert.equal(db.calls.length,1);
});
test("an account without saved planner state is valid and queries remain account scoped",async()=>{
 const db=database(null);const result=await checkAccountDatabase(db,"account:bob",Core.validate);
 assert.equal(result.ok,true);assert.equal(result.tasks,0);assert.deepEqual(db.calls[0].args,["account:bob"]);
});

test("inspection persists validated retention cleanup instead of the unvalidated original",async()=>{
 const data=state();data.trash.push({id:"expired",label:"삭제",deletedAt:new Date(Date.now()-Core.TRASH_RETENTION_MS-1000).toISOString(),tasks:[{id:"task",title:"비밀",date:"2026-01-01",time:"",priority:"low",status:"todo",project:"",repeat:"none",notes:"",star:false}],projects:[],links:[]});
 const db=database(JSON.stringify(data));const result=await checkAccountDatabase(db,"account:alice",Core.validate);
 assert.equal(result.ok,true);assert.equal(result.trash,0);
 const payload=db.calls.find(c=>c.sql.startsWith("UPDATE")).args[0];assert.equal(payload.includes("비밀"),false);assert.equal(payload.includes('"expired"'),false);
});
