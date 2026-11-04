const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function load(name){const context={module:{exports:{}}};require('node:vm').runInNewContext(fs.readFileSync('public/planner/'+name+'.js','utf8'),context);return context.module.exports;}
const Dates=load('date-tools'),Locale=require('./helpers/locale.cjs');
test('date tools preserve leap days, month boundaries, Monday weeks and locale-specific labels',()=>{
 const ko=Dates.create(Locale.create('ko')),ja=Dates.create(Locale.create('ja'));
 assert.equal(ko.addDays('2024-02-28',1),'2024-02-29');assert.equal(ko.addDays('2024-12-31',1),'2025-01-01');
 assert.equal(ko.weekStart('2026-11-08'),'2026-11-02');assert.match(ko.friendly('2026-11-04'),/11.4/);assert.match(ja.friendly('2026-11-04'),/11\/4/);
});
test('sample module produces valid independent records without an account',()=>{
 const dates=Dates.create(Locale.create('ko'));let id=0;
 const make=load('sample-data').create({...dates,uid:()=>String(++id)});
 const first=make(),next=make();require('../lib/planner-core.cjs').validate(first);
 assert.ok(first.tasks.length>0);assert.notEqual(first.tasks[0].id,next.tasks[0].id);
});
test('all deployment modes ship identical shared UI modules',()=>{
 for(const name of ['date-tools','sample-data','schedule-view','trash-view']){
 const local=fs.readFileSync('public/planner/'+name+'.js','utf8');
 for(const root of ['self-hosted/public/planner/','docs/planner/'])assert.equal(fs.readFileSync(root+name+'.js','utf8'),local,root+name);
 }
});
