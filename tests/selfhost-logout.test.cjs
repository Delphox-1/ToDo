const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
async function fixture(source, status=200, manage=false) {
  const nodes=new Map(), redirects=[], requests=[]; let signedOut=0, reloads=0, watcher;
  const node=key=>{
    if(!nodes.has(key))nodes.set(key,{value:'',textContent:'',append(){},prepend(){},replaceChildren(){}});
    return nodes.get(key);
  };
  const buttons=[];
  const document={querySelector:node,createElement:tag=>{const n={append(){}};if(tag==='button')buttons.push(n);return n;},body:{append:script=>script.onload()}};
  vm.runInNewContext(fs.readFileSync(manage?'self-hosted/public/auth-ui/manage.js':'self-hosted/public/planner/account-bootstrap.js','utf8'), {
    ToDoI18n: {...require('./helpers/locale.cjs').create('ko'), createPicker:()=>({})},
    document,localStorage:{},window:{addEventListener(){}},URLSearchParams,URL,
    location:{search:'',replace:p=>redirects.push(p),assign:p=>redirects.push(p),reload:()=>reloads++},
    ToDoSession:{storageKey:id=>id,create:()=>({watch(id,fn){watcher=fn;},announce(){},signedOut(){signedOut++;}})},
    fetch:async(path,options)=>{requests.push({path,options});return {ok:path.endsWith('/me')||status===200,status,json:async()=>({user:{source,userId:source==='account'?'account:test':'legacy',name:'test'},passwordRequired:true})};}
  });
  await new Promise(setImmediate);
  return {node,notify:event=>watcher(event),logout:manage?node('#logout'):buttons.find(b=>b.textContent==='로그아웃'),redirects,requests,get signedOut(){return signedOut;},get reloads(){return reloads;}};
}
for(const source of ['account'])test(source+' logout clears app session before platform session',async()=>{
  const f=await fixture(source);await f.logout.onclick();
  assert.equal(f.requests[1].path,'/api/account/logout');
  assert.equal(f.requests[1].options.method,'POST');
  assert.equal(f.signedOut,1);
  assert.deepEqual(f.redirects,['/login']);
});
test('account management uses the same complete logout',async()=>{
  const f=await fixture('account',200,true);await f.logout.onclick();assert.equal(f.signedOut,1);
  assert.deepEqual(f.redirects,['/login']);
});
test('failed session revocation stays retryable without claiming logout',async()=>{
  const f=await fixture('account',500);await f.logout.onclick();assert.equal(f.signedOut,0);assert.deepEqual(f.redirects,[]);assert.equal(f.logout.disabled,false);
});
test('stale account tab cannot log out a newly signed-in account',async()=>{
  const f=await fixture('account',409);await f.logout.onclick();assert.equal(f.signedOut,0);assert.equal(f.reloads,1);assert.deepEqual(f.redirects,[]);
});

test('logout in another tab clears platform identity instead of falling back',async()=>{
  for (const manage of [false,true]) {
    const f=await fixture('account',200,manage);
    f.notify({newValue:'signed-out:123'});
    assert.equal(f.reloads,0);
    assert.deepEqual(f.redirects,['/login']);
  }
});

test('account deletion clears the platform session and preserves the completion message', async()=>{
  const f=await fixture('account',200,true);
  f.node('#confirmation').value='회원탈퇴';
  await f.node('#delete-form').onsubmit({preventDefault(){}});
  assert.deepEqual(f.redirects,['/login?deleted=1']);
});
test('deletion of this account in another tab also clears platform identity', async()=>{
  for (const manage of [false,true]) {
    const f=await fixture('account',200,manage);
    f.notify({newValue:'deleted:account:test:123'});
    assert.deepEqual(f.redirects,['/login']);
  }
});
