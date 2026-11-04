const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Core=require('../lib/planner-core.cjs');
function fixture(raw){
 const data=new Map([['mine',raw],['other','unchanged']]),nodes=[],handlers={},events=[];
 const document={createElement(tag){const n={tag,textContent:'',style:{},append(...children){this.children=children;},setAttribute(){},showModal(){},close(){}};nodes.push(n);return n;},body:{append(){}},addEventListener(name,fn){handlers[name]=fn;}};
 const context={document,TextEncoder,structuredClone,HaruCore:Core,ToDoAccount:{userId:'local',storageKey:'mine'},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},window:{dispatchEvent:e=>events.push(e)},StorageEvent:class{constructor(type,fields){Object.assign(this,fields)}},fetch(){throw Error('Local checks must never use a server');}};
 vm.runInNewContext(fs.readFileSync('public/planner/maintenance.js','utf8'),context);
 return {data,nodes,events,async check(){const button={disabled:false};await handlers.click({target:{closest:()=>button}});assert.equal(button.disabled,false);}};
}
test('local maintenance checks only current browser storage without contacting any server',async()=>{
 const state={version:1,tasks:[],projects:[],trash:[],notes:{'2026-11-04':'keep'}};
 const h=fixture(JSON.stringify(state,null,2));await h.check();
 assert.deepEqual(JSON.parse(h.data.get('mine')),state);assert.equal(h.data.get('other'),'unchanged');assert.equal(h.events.length,1);assert.match(h.nodes[3].textContent,/검사 완료/);
});
test('invalid local records remain untouched and report a validation error',async()=>{
 const h=fixture('{broken');await h.check();assert.equal(h.data.get('mine'),'{broken');assert.equal(h.events.length,0);assert.match(h.nodes[3].textContent,/이상을 발견/);
});
