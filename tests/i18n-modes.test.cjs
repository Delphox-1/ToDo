const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Locale=require('./helpers/locale.cjs');

test('local, Pages and self-hosted modes use the same reviewed locale dictionary',()=>{
  const source=fs.readFileSync('public/planner/i18n-core.js','utf8').replace(/\r\n/g,'\n');
  for(const file of ['docs/planner/i18n-core.js','self-hosted/public/planner/i18n-core.js'])
    assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),source,file);
  assert.equal(Locale.create('ja').t('로컬 저장 안내'),'ローカル保存について');
  assert.equal(Locale.create('ja').t('같은 ToDo 계정의 기기 간 공유'),'同じToDoアカウントのデバイス間で共有');
});

test('locale scripts load before all mode bootstraps and account pages include the language control',()=>{
  for(const file of ['public/planner/index.html','docs/index.html','self-hosted/public/index.html','self-hosted/public/auth-ui/index.html','self-hosted/public/auth-ui/manage.html']) {
    const html=fs.readFileSync(file,'utf8');
    assert.ok(html.includes('i18n.css'),file);
    const dictionary=html.indexOf('i18n-core.js'), runtime=html.indexOf('i18n.js');
    assert.ok(dictionary>=0 && runtime>dictionary,file);
    const boot=['account-bootstrap.js','auth-ui/app.js','auth-ui/manage.js','planner/app.js'].map(item=>html.indexOf(item)).filter(index=>index>=0);
    for(const index of boot)assert.ok(index>runtime,file);
  }
});

test('reviewed translations preserve saved task and project text containing markup or UI words',()=>{
  for(const language of ['ko','ja']) {
    const ui=Locale.create(language);
    const userTitle='오늘의 할 일 <img src=x onerror=alert(1)> 日本語';
    const project='프로젝트 & 仕事';
    assert.equal(ui.html`<span>할 일</span><b>${userTitle}</b><i>${project}</i>`, '<span>'+ui.t('할 일')+'</span><b>'+userTitle+'</b><i>'+project+'</i>');
  }
});

test('independent logout and deletion never redirect to platform-specific paths',()=>{
  for(const file of ['self-hosted/public/planner/account-bootstrap.js','self-hosted/public/auth-ui/manage.js']) {
    const source=fs.readFileSync(file,'utf8');
    assert.ok(!source.includes('signout-with-chatgpt'));
    assert.ok(!source.includes('/login%3F'));
  }
  assert.ok(fs.readFileSync('self-hosted/public/auth-ui/manage.js','utf8').includes('/login?deleted=1'));
});
