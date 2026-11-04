const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../lib/planner-core.cjs');
let n = 0;
const id = () => `missed-${++n}`;
const task = (patch = {}) => ({ id:id(), title:'면접 연습', date:'2026-11-03', time:'', priority:'high', project:'', status:'todo', star:false, notes:'', repeat:'none', ...patch });
const seed = () => ({ version:1, tasks:[], projects:[], notes:{}, trash:[] });
test('unfinished tasks become eligible the next day and only deferred tasks appear as carryovers', () => {
  const d=seed(), t=task(); d.tasks.push(t);
  assert.equal(C.isMissed(t,'2026-11-03'),false);
  assert.equal(C.isMissed(t,'2026-11-04'),true);
  assert.equal(C.isDeferred(t,'2026-11-04'),false);
  C.setMissedOutcome(d,t.id,'deferred','2026-11-04');
  assert.equal(C.isDeferred(t,'2026-11-04'),true);
  C.setMissedOutcome(d,t.id,'failed','2026-11-04');
  assert.equal(C.isDeferred(t,'2026-11-04'),false);
  assert.equal(t.missedOutcome,'failed');
  C.setMissedOutcome(d,t.id,'','2026-11-04');
  assert.equal(C.isDeferred(t,'2026-11-04'),false);
});
test('decisions survive saving and reloading, and old backups remain valid', () => {
  const values=new Map(), storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const s=C.createStore(storage,'planner',seed), t=task();
  s.transact(d=>d.tasks.push(t));
  s.transact(d=>C.setMissedOutcome(d,t.id,'deferred','2026-11-04'));
  const reloaded=C.createStore(storage,'planner',seed);
  assert.equal(C.isDeferred(reloaded.state.tasks[0],'2026-11-05'),true);
  assert.doesNotThrow(()=>C.validate({...seed(),tasks:[task()]}));
  assert.throws(()=>C.validate({...seed(),tasks:[task({missedOutcome:'invalid'})]}));
});
test('completed, undated, today and future tasks cannot receive missed decisions', () => {
  for (const patch of [{status:'done'},{date:''},{date:'2026-11-04'},{date:'2026-11-05'}]) {
    const d=seed(), t=task(patch);d.tasks.push(t);
    assert.equal(C.isMissed(t,'2026-11-04'),false);
    assert.throws(()=>C.setMissedOutcome(d,t.id,'failed','2026-11-04'));
  }
});
test('completion and rescheduling clear decisions', () => {
  for (const mode of ['complete','drag','edit']) {
    const d=seed(),t=task({missedOutcome:'deferred'});d.tasks.push(t);
    if(mode==='complete') C.updateTask(d,t.id,{status:'done'},id);
    if(mode==='drag') C.moveTask(d,t.id,'2026-11-04');
    if(mode==='edit') C.updateTask(d,t.id,{date:'2026-11-04'},id);
    assert.equal(t.missedOutcome,'');
    assert.equal(C.isDeferred(t,'2026-11-05'),false);
  }
});
test('recurrence decisions remain specific to one occurrence', () => {
  const d=seed(), t=task({repeat:'daily',repeatUntil:'2026-11-06'});d.tasks.push(t);
  C.setMissedOutcome(d,t.id,'failed','2026-11-04');
  C.expandRecurrences(d,'2026-11-06',id);
  assert.equal(d.tasks.length,4);
  assert.ok(d.tasks.slice(1).every(x=>!x.missedOutcome));
  const child=d.tasks[1];C.setMissedOutcome(d,child.id,'deferred','2026-11-05');
  C.updateTask(d,t.id,{title:'수정'},id);
  C.expandRecurrences(d,'2026-11-06',id);
  assert.equal(d.tasks.find(x=>x.id===child.id).missedOutcome,'deferred');
  assert.equal(d.tasks.filter(x=>x.date==='2026-11-04').length,1);
});
