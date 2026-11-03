const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Locale=require('./helpers/locale.cjs');
const Core=require('../lib/planner-core.cjs'),Merge=require('../lib/planner-merge.cjs');
const key='haru-planner-v1',state=()=>({version:1,tasks:[],projects:[],trash:[],notes:{}});
const task=id=>({id,title:id,date:'2026-11-02',time:'',status:'todo',priority:'low',repeat:'none',project:'',notes:'',star:false});
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function harness(initial,fetch,base,language='ko'){
 const data=new Map(initial?[[key,JSON.stringify(initial)]]:[]),timers=new Map();let sequence=0;
 if(base)data.set(key+'.cloud-base',JSON.stringify(base));
 const events=[],context={ToDoI18n:Locale.create(language),HaruCore:Core,ToDoMerge:Merge,AbortSignal,fetch,Promise,JSON,console,
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
  window:{dispatchEvent:e=>events.push(e),addEventListener:()=>{}},document:{hidden:false,addEventListener:()=>{}},
  CustomEvent:class{constructor(type){this.type=type;}},StorageEvent:class{constructor(type,detail){this.type=type;Object.assign(this,detail);}},
  setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id),setInterval:()=>{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../self-hosted/public/planner/cloud.js'),'utf8'),context);
 return {cloud:context.HaruCloud,data,events,read:()=>JSON.parse(data.get(key)),write:value=>data.set(key,JSON.stringify(value)),
  async timers(){const jobs=[...timers.values()];timers.clear();for(const job of jobs)await job();await flush();}};
}

test('stored records become usable before a slow initial network request finishes',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),initial=state();initial.tasks=[task('existing')];
 const h=harness(initial,async()=>{await gate;return response({state:initial,revision:1});});
 await h.cloud.ready;assert.equal(h.read().tasks[0].id,'existing');
 release();await flush();assert.equal(h.cloud.status,'모든 기기 동기화 완료');
});

test('changes made during an upload are retained and uploaded on the next sync',async()=>{
 const initial=state();initial.tasks=[task('first')];let release,puts=0,server=state(),rev=0;
 const gate=new Promise(resolve=>release=resolve);
 const h=harness(initial,async(_url,options)=>{if(options.method==='GET')return response({state:rev?server:null,revision:rev});const payload=JSON.parse(options.body);puts++;if(puts===1)await gate;server=payload.state;return response({revision:++rev});});
 await flush();assert.equal(puts,1);const latest=h.read();latest.tasks.push(task('during upload'));h.write(latest);h.cloud.changed();
 release();await flush();assert.equal(h.read().tasks.length,2);await h.timers();
 assert.equal(server.tasks.length,2);assert.equal(h.cloud.status,'모든 기기 동기화 완료');
});

test('revision conflicts pull and preserve another device changes before retrying',async()=>{
 const initial=state();initial.tasks=[task('mine')];const remote=state();remote.tasks=[task('theirs')];let puts=0;
 const h=harness(initial,async(_url,options)=>options.method==='GET'?response({state:puts?remote:null,revision:puts?1:0}):++puts===1?response({},409):response({revision:2}));
 await flush();assert.equal(puts,2);assert.deepEqual(h.read().tasks.map(t=>t.id).sort(),['mine','theirs']);
});

test('network failures retain local records and a manual retry recovers',async()=>{
 const initial=state();initial.tasks=[task('offline')];let online=false;
 const h=harness(initial,async()=>{if(!online)throw Error('offline');return response({state:initial,revision:1});});
 await flush();assert.equal(h.read().tasks[0].id,'offline');assert.match(h.cloud.status,/연결 대기/);
 online=true;await h.cloud.sync();assert.equal(h.cloud.status,'모든 기기 동기화 완료');
});

test('malformed local records remain untouched for recovery',async()=>{
 const h=harness(null,async()=>response({state:state(),revision:1}));h.data.set(key,'broken original');
 await flush();assert.equal(h.data.get(key),'broken original');assert.match(h.cloud.status,/연결 대기/);
});

test('tested model and merge copies match the deployed browser code',()=>{
 for(const [publicName,libName]of [['core.js','planner-core.cjs'],['merge.js','planner-merge.cjs']])assert.equal(fs.readFileSync(path.join(__dirname,'../public/planner/',publicName),'utf8'),fs.readFileSync(path.join(__dirname,'../lib/',libName),'utf8'));
});
test('Japanese sync status is localized while failed network requests preserve original user data',async()=>{
 const initial=state();initial.tasks=[{...task('ja'),title:'오늘의 할 일 日本語'}];
 const h=harness(initial,async()=>{throw Error('offline');},undefined,'ja');
 await h.cloud.ready;await flush();
 assert.equal(h.read().tasks[0].title,'오늘의 할 일 日本語');
 assert.ok(!/[가-힣]/.test(h.cloud.status),h.cloud.status);
});

test('Japanese sync successfully reads remote data without translating titles',async()=>{
 const remote=state();remote.tasks=[{...task('ja-remote'),title:'프로젝트'}];
 const h=harness(null,async()=>response({state:remote,revision:1}),undefined,'ja');
 await h.cloud.ready;await flush();
 assert.equal(h.read().tasks[0].title,'프로젝트');
 assert.ok(!/[가-힣]/.test(h.cloud.status),h.cloud.status);
});
