const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Locale=require('./helpers/locale.cjs');

function pickerFixture(language='ko', blocked=false) {
  const stored=new Map([['todo-ui-language',language],['saved-plan','original user data']]);
  const target={children:[],prepend(child){this.children.unshift(child);}};
  let reloads=0,document;
  function element(tag) {
    return {tag,children:[],attributes:{},hidden:false,listeners:{},textContent:'',
      setAttribute(key,value){this.attributes[key]=value;},
      getAttribute(key){return this.attributes[key];},
      append(...children){this.children.push(...children);},
      addEventListener(type,fn){this.listeners[type]=fn;},
      querySelectorAll(){return this.children.filter(child=>child.tag==='button');},
      querySelector(){return this.children.find(child=>child.attributes['aria-pressed']==='true');},
      contains(child){return child===this||this.children.some(item=>item.contains?.(child));},
      focus(){document.activeElement=this;},
      click(){this.onclick();}
    };
  }
  document={body:{},documentElement:{},title:'ToDo',activeElement:null,
    createElement:element,createTreeWalker:()=>({nextNode:()=>false}),querySelectorAll:()=>[],
    querySelector:()=>target,addEventListener(){}};
  const context={ToDoLocale:Locale,document,NodeFilter:{SHOW_TEXT:4},
    localStorage:{getItem:key=>stored.get(key)||null,setItem(key,value){if(blocked)throw Error('blocked');stored.set(key,value);}},
    location:{reload(){reloads++;}}};
  vm.runInNewContext(fs.readFileSync('public/planner/i18n.js','utf8'),context);
  const [button,menu,error]=target.children[0].children;
  return {document,stored,button,menu,error,wrapper:target.children[0],get reloads(){return reloads;}};
}

test('language choice persists without touching saved plans and reloads only when changed',()=>{
  const f=pickerFixture();f.menu.children[1].onclick();
  assert.equal(f.stored.get('todo-ui-language'),'ja');
  assert.equal(f.stored.get('saved-plan'),'original user data');
  assert.equal(f.reloads,1);
});

test('blocked storage keeps the current language and shows a Japanese error instead of reloading',()=>{
  const f=pickerFixture('ja',true);f.menu.children[0].onclick();
  assert.equal(f.stored.get('todo-ui-language'),'ja');
  assert.equal(f.reloads,0);assert.equal(f.error.hidden,false);
  assert.match(f.error.textContent,/保存できません/);
  assert.equal(f.stored.get('saved-plan'),'original user data');
});

test('language picker supports keyboard navigation and Escape returns focus to the button',()=>{
  const f=pickerFixture('ja');f.button.click();
  assert.equal(f.menu.hidden,false);assert.equal(f.document.activeElement,f.menu.children[1]);
  f.wrapper.listeners.keydown({key:'Home',preventDefault(){}});
  assert.equal(f.document.activeElement,f.menu.children[0]);
  f.wrapper.listeners.keydown({key:'Escape',preventDefault(){}});
  assert.equal(f.menu.hidden,true);assert.equal(f.document.activeElement,f.button);
  assert.equal(f.button.getAttribute('aria-expanded'),'false');
});

test('choosing the current language closes the menu without resetting any data',()=>{
  const f=pickerFixture('ko');f.button.click();f.menu.children[0].onclick();
  assert.equal(f.reloads,0);assert.equal(f.menu.hidden,true);
  assert.equal(f.stored.get('saved-plan'),'original user data');
});
