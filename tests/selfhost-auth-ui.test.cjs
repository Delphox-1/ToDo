const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function fixture(user = null, options = {}) {
  const nodes = new Map(); const listeners = {}; const requests = []; const redirects = [];
  let now = 1000;
  const timers = [];
  function node(s) {
    if (!nodes.has(s)) nodes.set(s, {value:'', selectionStart:0, selectionEnd:0, listeners:{},
      setAttribute(){}, removeAttribute(){}, focus(){},
      setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;},
      addEventListener(type,fn){this.listeners[type]=fn;}});
    return nodes.get(s);
  }
  vm.runInNewContext(fs.readFileSync('self-hosted/public/auth-ui/app.js','utf8'), {
    ToDoI18n: require('./helpers/locale.cjs').create(options.language || 'ko'),
    Date: class extends Date { static now() { return now; } },
    setTimeout: (fn, delay) => timers.push({ fn, at: now + delay }),
    document:{querySelector:node, querySelectorAll:()=>[]},
    location:{search:'', origin:'http://localhost', replace:p=>redirects.push(p), assign:p=>redirects.push(p)},
    window:{addEventListener:(type,fn)=>listeners[type]=fn}, URLSearchParams, URL,
    ToDoAccountRules:require('./helpers/rules.cjs'),
    fetch:async (path,requestOptions)=>{requests.push({path,options:requestOptions});return !path.endsWith('/me') && options.response ? options.response : {ok:true,json:async()=>({user,googleEnabled:true})};}
  });
  return {node,listeners,requests,redirects,advance(ms) { now += ms; for (const timer of timers.splice(0)) { if (timer.at <= now) timer.fn(); else timers.push(timer); } }};
}
test('saved login URL resumes an authenticated session, including restored pages', async()=>{
  const f=fixture({userId:'account:test'});
  await new Promise(setImmediate);
  assert.deepEqual(f.redirects,['/']);
  f.listeners.pageshow({persisted:true});
  await new Promise(setImmediate);
  assert.deepEqual(f.redirects,['/','/']);
  assert.equal(f.requests[0].options.cache,'no-store');
});
test('anonymous saved login URL stays on the login form', async()=>{
  const f=fixture(); await new Promise(setImmediate);
  assert.deepEqual(f.redirects,[]);
});
test('all credential fields block space keys and remove pasted/mobile whitespace without breaking IME',()=>{
  const f=fixture();
  for (const id of ['username','password','passwordConfirm','name']) {
    const input=f.node('#'+id); let blocked=false;
    input.listeners.keydown({key:' ',preventDefault(){blocked=true;}}); assert.ok(blocked);
    input.value='가 나\t다\u3000라';input.selectionStart=input.selectionEnd=input.value.length;
    input.listeners.input({isComposing:false});assert.equal(input.value,'가나다라');assert.equal(input.selectionStart,4);
    input.value='한 글';input.listeners.input({isComposing:true});assert.equal(input.value,'한 글');
    input.listeners.compositionend();assert.equal(input.value,'한글');
  }
});
test('login explicitly requests a persistent session and strips autofill whitespace',async()=>{
  const f=fixture();f.node('#username').value=' user ';f.node('#password').value=' Strong!12345 ';
  await f.node('#account-form').onsubmit({preventDefault(){}});
  const body=JSON.parse(f.requests.find(r=>r.path.includes('sign-in/username')).options.body);
  assert.equal(body.rememberMe,true);assert.equal(body.username,'user');assert.equal(body.password,'Strong!12345');
});

test('rate-limited login displays the server wait time and prevents rapid retries', async () => {
  const f = fixture(null, { response: { ok: false, status: 429, json: async () => ({}), headers: { get: () => '2' } } });
  await new Promise(setImmediate);
  f.node('#username').value = 'testuser'; f.node('#password').value = 'TestOnly!12345';
  await f.node('#account-form').onsubmit({ preventDefault() {} });
  assert.match(f.node('#form-error').textContent, /2초/);
  assert.equal(f.node('#submit-button').disabled, true);
  assert.equal(f.node('#google-login').disabled, true);
  const count = f.requests.length;
  await f.node('#account-form').onsubmit({ preventDefault() {} });
  assert.equal(f.requests.length, count);
  f.advance(2050);
  assert.equal(f.node('#submit-button').disabled, false);
  assert.equal(f.node('#google-login').disabled, false);
});

test('non-JSON server failures remain retryable and never claim a successful login', async () => {
  const f = fixture(null, { response: { ok: false, status: 502, json: async () => { throw SyntaxError('HTML response'); } } });
  f.node('#username').value = 'testuser'; f.node('#password').value = 'TestOnly!12345';
  await f.node('#account-form').onsubmit({ preventDefault() {} });
  assert.match(f.node('#form-error').textContent, /서버 응답/);
  assert.equal(f.node('#submit-button').disabled, false);
  assert.deepEqual(f.redirects, []);
});

test('Google login rejects unexpected redirect destinations', async () => {
  const f = fixture(null, { response: { ok: true, json: async () => ({ url: 'https://untrusted.invalid/' }) } });
  await new Promise(setImmediate);
  await f.node('#google-login').onclick();
  assert.deepEqual(f.redirects, []);
  assert.match(f.node('#form-error').textContent, /Google 연결 주소/);
  assert.equal(f.node('#google-login').disabled, false);
});

test('Japanese login errors and retry countdown are localized without accepting a failed login',async()=>{
 const f=fixture(null,{language:'ja',response:{ok:false,status:429,headers:{get:()=> '3'},json:async()=>({})}});
 await new Promise(setImmediate);f.node('#username').value='testuser';f.node('#password').value='TestOnly!12345';await f.node('#account-form').onsubmit({preventDefault(){}});assert.match(f.node('#form-error').textContent,/3秒/);assert.deepEqual(f.redirects,[]);
});
