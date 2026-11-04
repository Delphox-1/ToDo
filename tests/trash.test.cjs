const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../lib/planner-core.cjs');
const M=require('../lib/planner-merge.cjs');
let seq=0;const id=()=>`trash-test-${++seq}`;
const copy=x=>JSON.parse(JSON.stringify(x));
const seed=()=>({version:1,tasks:[],projects:[],notes:{},trash:[]});
const task=(patch={})=>({id:id(),title:'삭제할 일정',date:'2026-11-02',time:'',status:'todo',priority:'medium',repeat:'none',project:'',notes:'개인 메모',star:false,...patch});
function fixture(){const d=seed(),a=task(),b=task();d.tasks.push(a,b);const first=C.moveToTrash(d,[a.id],[],'첫 항목',id),second=C.moveToTrash(d,[b.id],[],'둘째 항목',id);return {d,a,b,first,second};}
test('permanent deletion removes selected content and IDs without keeping deletion metadata',()=>{
 const {d,a,b,first,second}=fixture();assert.equal(C.permanentlyDelete(d,[first]),1);
 assert.deepEqual(d.trash.map(x=>x.id),[second]);
 assert.equal(d.purgedTrash,undefined);
 assert.equal(JSON.stringify(d).includes(a.id),false);
 assert.equal(JSON.stringify(d).includes(first),false);
 assert.throws(()=>C.restore(d,first));C.restore(d,second);assert.equal(d.tasks[0].id,b.id);
 assert.equal(C.permanentlyDelete(d,[first]),0);
});
test('emptying all trash leaves active tasks, projects and notes untouched',()=>{
 const {d}=fixture(),active=task();d.tasks.push(active);d.projects.push({id:'p',name:'유지',color:'#44876e'});d.notes['2026-11-02']='유지';
 assert.equal(C.permanentlyDelete(d,d.trash.map(x=>x.id)),2);assert.equal(d.trash.length,0);
 assert.equal(d.tasks[0].id,active.id);assert.equal(d.projects.length,1);assert.equal(d.notes['2026-11-02'],'유지');
});
test('retention expires at exactly 30 days from deletion, not the original schedule date',()=>{
 const {d,first,second}=fixture(),now=Date.now();
 d.trash[0].deletedAt=new Date(now-C.TRASH_RETENTION_MS).toISOString();
 d.trash[1].deletedAt=new Date(now-C.TRASH_RETENTION_MS+1).toISOString();
 assert.equal(C.purgeExpiredTrash(d,now),1);assert.deepEqual(d.trash.map(x=>x.id),[second]);
 assert.equal(JSON.stringify(d).includes(first),false);assert.equal(C.purgeExpiredTrash(d,now+1),1);
});
test('opening, importing and reloading persist cleanup and prevent restoring expired entries',()=>{
 const {d,first}=fixture();d.trash[0].deletedAt=new Date(Date.now()-C.TRASH_RETENTION_MS-1000).toISOString();
 const values=new Map([['planner',JSON.stringify(d)]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const store=C.createStore(storage,'planner',seed);assert.equal(store.state.trash.length,1);
 assert.equal(JSON.parse(values.get('planner')).trash.length,1);assert.throws(()=>C.restore(copy(d),first));
 const before=copy(store.state);before.trash[0].deletedAt=new Date(Date.now()-C.TRASH_RETENTION_MS-1000).toISOString();
 values.set('planner',JSON.stringify(before));assert.equal(store.reload().trash.length,0);
 store.replace(d);assert.equal(store.state.trash.length,1);
});
test('purging a recurring occurrence never recreates it but preserves subsequent occurrences',()=>{
 const d=seed(),root=task({repeat:'daily',repeatUntil:'2026-11-06'});d.tasks.push(root);C.expandRecurrences(d,'2026-11-06',id);
 const removed=d.tasks.find(t=>t.date==='2026-11-03');const trashId=C.moveToTrash(d,[removed.id],[],'하루 삭제',id);
 C.permanentlyDelete(d,[trashId]);C.expandRecurrences(d,'2026-11-06',id);
 C.updateTask(d,root.id,{status:'done'},id);C.updateTask(d,root.id,{title:'바뀐 제목'},id);C.expandRecurrences(d,'2026-11-06',id);
 assert.equal(d.tasks.some(t=>t.date==='2026-11-03'),false);assert.equal(d.tasks.length,4);assert.equal(d.tasks.at(-1).date,'2026-11-06');assert.doesNotThrow(()=>C.validate(d));
});
test('stale restore and editing against a synced baseline cannot resurrect deleted data',()=>{
 const {d,a,first}=fixture(),base=copy(d),remote=copy(d);C.permanentlyDelete(remote,[first]);
 const local=copy(base);C.restore(local,first);local.tasks[0].title='오프라인에서 수정';
 for(const [b,l,r] of [[base,local,remote],[base,remote,local]]){
  const result=C.validate(M.merge(b,l,r));assert.equal(result.tasks.some(t=>t.id===a.id),false);assert.equal(result.trash.some(x=>x.id===first),false);assert.equal(result.purgedTrash,undefined);
 }
});
test('a stale device cannot resurrect a purged project or reconnect its tasks',()=>{
 const d=seed(),p={id:'p',name:'삭제 프로젝트',color:'#44876e'},t=task({project:'p'});d.projects.push(p);d.tasks.push(t);
 const trashId=C.moveToTrash(d,[],['p'],p.name,id),base=copy(d),local=copy(d);C.restore(local,trashId);
 C.permanentlyDelete(d,[trashId]);const result=C.validate(M.merge(base,local,d));assert.equal(result.projects.length,0);assert.equal(result.tasks[0].project,'');
});

test('deleting recurrence roots and tails leaves no removed IDs and never regenerates them',()=>{
 for(const date of ['2026-11-02','2026-11-06']) {
  const d=seed(),root=task({repeat:'daily',repeatUntil:'2026-11-06'});d.tasks.push(root);C.expandRecurrences(d,'2026-11-06',id);
  const removed=d.tasks.find(t=>t.date===date),removedId=removed.id,trashId=C.moveToTrash(d,[removedId],[],'삭제',id);
  C.permanentlyDelete(d,[trashId]);C.expandRecurrences(d,'2026-11-10',id);
  assert.equal(d.tasks.length,4);assert.equal(d.tasks.some(t=>t.date===date),false);
  assert.equal(JSON.stringify(d).includes(removedId),false);assert.equal(JSON.stringify(d).includes(trashId),false);
  assert.doesNotThrow(()=>C.validate(d));
 }
});
test('permanent deletion also scrubs restored copies from the internal recovery backup',()=>{
 const {d,a,first,second}=fixture(),backup=copy(d);C.restore(backup,first);
 const values=new Map([['planner',JSON.stringify(d)],['planner.recovery',JSON.stringify(backup)]]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const store=C.createStore(storage,'planner',seed);store.transact(s=>C.permanentlyDelete(s,[first]));
 assert.equal(values.get('planner').includes(a.id),false);assert.equal(values.get('planner.recovery').includes(a.id),false);
 assert.equal(values.get('planner.recovery').includes(second),true);
});
