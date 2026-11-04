const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('public/planner/app.js','utf8');
function fixture(){
 const nodes=new Map(),listeners={};
 const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',indeterminate:false});return nodes.get(s);};
 const state={trash:[{id:'one',label:'첫 일정',deletedAt:new Date().toISOString(),tasks:[{}],projects:[]},{id:'two',label:'둘째 일정',deletedAt:new Date().toISOString(),tasks:[],projects:[{}]}]};
 const context={state,query:'',document:{querySelector:node,addEventListener:(name,fn)=>listeners[name]=fn},$:node,
  $$:()=>[...node('#main').innerHTML.matchAll(/data-trash-select="([^"]+)"/g)].map(x=>({dataset:{trashSelect:x[1]}})),
  ToDoI18n:require('./helpers/locale.cjs').create('ko'),heading:x=>`<h1>${x}</h1>`,empty:x=>x,
  esc:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('public/planner/trash-view.js','utf8'),context);
 vm.runInContext(app.slice(app.indexOf('  const trashView ='),app.indexOf('  function toggleTask')),context);
 const start=app.indexOf('  document.addEventListener("change", (e) => {',app.indexOf('  const trashView'));
 vm.runInContext(app.slice(start,app.indexOf('  document.addEventListener("input", (e) => {',start)),context);
 return {state,node,context,render:()=>vm.runInContext('renderTrash()',context),change:target=>listeners.change({target}),html:()=>node('#main').innerHTML};
}
test('trash selection supports individual choices, select all and clearing all',()=>{
 const f=fixture();f.render();assert.match(f.html(),/선택 영구 삭제<\/button>/);assert.match(f.html(),/data-action="delete-selected-trash" disabled/);
 f.change({dataset:{trashSelect:'one'},checked:true});assert.equal(f.node('#trash-select-all').indeterminate,true);assert.match(f.html(),/1개 선택/);
 f.change({id:'trash-select-all',dataset:{},checked:true});assert.equal(f.node('#trash-select-all').indeterminate,false);assert.match(f.html(),/2개 선택/);
 f.change({id:'trash-select-all',dataset:{},checked:false});assert.match(f.html(),/0개 선택/);assert.match(f.html(),/data-action="restore-selected" disabled/);
});
test('search removes hidden selections so deletion never silently includes hidden rows',()=>{
 const f=fixture();f.render();f.change({id:'trash-select-all',dataset:{},checked:true});
 f.context.query='첫';f.render();assert.match(f.html(),/1개 선택/);assert.equal(f.html().includes('data-trash-select="two"'),false);
 f.context.query='없음';f.render();assert.match(f.html(),/0개 선택/);assert.match(f.html(),/삭제한 항목이 없습니다/);
});
test('item labels are escaped in checkbox attributes and rendered text',()=>{
 const f=fixture();f.state.trash[0].label='<img src=x onerror="alert(1)">';f.render();
 assert.equal(f.html().includes('<img'),false);assert.match(f.html(),/&lt;img/);
});

test('shared schedule labels escape user titles and completed tasks cannot display a stale failure',()=>{
 const context={Core:require('../lib/planner-core.cjs'),ToDoI18n:require('./helpers/locale.cjs').create('ko'),esc:s=>s.replace(/</g,'&lt;').replace(/>/g,'&gt;')};
 vm.createContext(context);
 vm.runInContext(app.slice(app.indexOf('  const scheduledTitle ='),app.indexOf('  function weekCard')),context);
 for(const [status,outcome,label,style] of [['todo','failed','면접 (실패)','done'],['done','failed','면접','done'],['todo','deferred','면접','']]) {
  context.task={title:'면접',status,missedOutcome:outcome};
  assert.equal(vm.runInContext('scheduledTitle(task)',context),label);
  assert.equal(vm.runInContext('scheduledClass(task)',context),style);
 }
 context.task={title:'<script>',status:'todo',missedOutcome:'failed'};
 assert.equal(vm.runInContext('scheduledTitle(task)',context),'&lt;script&gt; (실패)');
});
