import assert from "node:assert/strict";

const origin = process.env.TODO_TEST_ORIGIN || "http://127.0.0.1:8787";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) throw Error("This destructive fixture test only runs against a local test server.");
const suffix = Date.now().toString(36), password = "LocalFixture!12345";
function client() {
  const cookies = new Map();
  return {
    id: null,
    async call(route, body, extraHeaders = {}) {
      const response = await fetch(origin + route, {
        method: body === undefined ? "GET" : "POST",
        redirect: "manual",
        headers: { Origin: origin, ...(body === undefined ? {} : {"Content-Type":"application/json"}), ...(cookies.size ? {Cookie:[...cookies].map(([k,v])=>k+"="+v).join("; ")} : {}), ...(this.id ? {"X-ToDo-Account":this.id} : {}), ...extraHeaders },
        ...(body === undefined ? {} : {body:JSON.stringify(body)}),
      });
      for(const value of response.headers.getSetCookie()) {
        const pair=value.split(";")[0], at=pair.indexOf("=");
        const key=pair.slice(0,at), cookie=pair.slice(at+1);
        if(cookie) cookies.set(key,cookie); else cookies.delete(key);
      }
      const text=await response.text();
      let data; try { data=JSON.parse(text); } catch {data=text;}
      return {status:response.status, data, headers:response.headers};
    },
    async put(state, revision, extraHeaders = {}) {
      const response=await fetch(origin+"/api/planner", {method:"PUT",headers:{Origin:origin,"Content-Type":"application/json",Cookie:[...cookies].map(([k,v])=>k+"="+v).join("; "),"X-ToDo-Account":this.id,...extraHeaders},body:JSON.stringify({state,revision})});
      return {status:response.status,data:await response.json()};
    }
  };
}
const anonymous=client(), a=client(), phone=client(), b=client();
assert.equal((await anonymous.call("/api/health")).status,200);
assert.equal((await anonymous.call("/")).status,302);
assert.equal((await anonymous.call("/api/planner",undefined,{"oai-authenticated-user-id":"spoofed","oai-authenticated-user-email":"spoofed@example.invalid"})).status,401);
async function signup(session,username) {
  const response=await session.call("/api/auth/sign-up/email",{username,name:"LocalFixture",email:"fixture@accounts.todo.invalid",password,passwordConfirm:password});
  assert.equal(response.status,200,JSON.stringify(response.data));
  const me=await session.call("/api/account/me");
  assert.equal(me.status,200);
  session.id=me.data.user.userId;
  assert.ok(session.id.startsWith("account:"));
}
await signup(a,"fixturea"+suffix);
await signup(b,"fixtureb"+suffix);
try {
  const signedIn=await phone.call("/api/auth/sign-in/username",{username:"fixturea"+suffix,password});
  assert.equal(signedIn.status,200,JSON.stringify(signedIn.data));
  phone.id=(await phone.call("/api/account/me")).data.user.userId;
  assert.equal(phone.id,a.id,"same account on PC and phone");
  assert.equal((await a.call("/")).status,200,"authenticated app entry must not redirect in a loop");
  assert.equal((await a.call("/account")).status,200,"account page is served at its canonical route");
  assert.equal((await anonymous.call("/login")).status,200,"login page is served without an asset redirect");
  const app=await a.call("/");
  const login=await anonymous.call("/login");
  for(const page of [app.data,login.data]) {
    assert.ok(page.includes("/planner/i18n-core.js") && page.includes("/planner/i18n.js"));
    for(const [,asset] of page.matchAll(/(?:src|href)="(\/[^"#?]+\.(?:css|js))"/g)) assert.equal((await anonymous.call(asset)).status,200,asset);
  }
  for(const name of ["holidays","core","merge","cloud","trash-view","app","install","maintenance"]) assert.equal((await anonymous.call("/planner/"+name+".js")).status,200,name);
  assert.equal((await a.call("/api/account/logout",{}, {Origin:"https://untrusted.example"})).status,403,"cross-origin logout is rejected");
  assert.equal((await a.call("/api/account/logout",{}, {"X-ToDo-Account":b.id})).status,409,"stale tabs cannot log out the wrong account");
  assert.equal((await a.call("/api/auth/unlink-account",{})).status,403,"unguarded unlink requests are blocked");
  const state={version:1,tasks:[],projects:[],trash:[],notes:{"2026-11-03":"PC fixture note"}};
  const saved=await a.put(state,0);
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  let seen=await phone.call("/api/planner");
  assert.equal(seen.data.state.notes["2026-11-03"],"PC fixture note");
  state.notes["2026-11-03"]="Phone fixture note";
  const updated=await phone.put(state,seen.data.revision);
  assert.equal(updated.status,200);
  assert.equal((await a.put(state,updated.data.revision,{Origin:"https://untrusted.example"})).status,403,"cross-origin planner writes are rejected");
  assert.equal((await a.put(state,-1)).status,400,"negative revisions are rejected");
  assert.equal((await a.put({...state,tasks:[null]},updated.data.revision)).status,400,"invalid model data cannot replace saved plans");
  assert.equal((await a.call("/api/planner")).data.state.notes["2026-11-03"],"Phone fixture note");
  assert.equal((await b.call("/api/planner")).data.state,null,"other accounts cannot read the plans");
  assert.equal((await anonymous.call("/api/planner/check",{})).status,401);
  assert.equal((await a.call("/api/planner/check",{}, {Origin:"https://untrusted.example"})).status,403);
  assert.equal((await a.call("/api/planner/check",{}, {"X-ToDo-Account":b.id})).status,401);
  const inspected=await a.call("/api/planner/check",{});
  assert.equal(inspected.status,200,JSON.stringify(inspected.data));
  assert.equal(inspected.data.ok,true);assert.equal(inspected.data.notes,1);
  assert.equal((await a.call("/api/planner")).data.state.notes["2026-11-03"],"Phone fixture note");
  assert.equal((await b.call("/api/planner")).data.state,null);

  assert.equal((await a.put(state,1)).status,409,"stale writes do not overwrite newer data");
  assert.equal((await a.call("/api/planner",undefined,{"X-ToDo-Account":b.id})).status,401,"stale tabs cannot read the new account's records");
  assert.equal((await a.call("/api/auth/link-social",{provider:"google"})).status,403,"linking requires the guarded account endpoint");
  assert.equal((await phone.call("/api/account/logout",{})).status,200);
  assert.equal((await phone.call("/api/planner")).status,401,"logged-out device loses access");
  assert.equal((await a.call("/api/planner")).status,200,"other device remains signed in");
  assert.equal((await b.call("/api/account/delete",{confirmation:"회원탈퇴",password:"WrongPassword!123"})).status,400);
  assert.equal((await b.call("/api/account/delete",{confirmation:"회원탈퇴",password})).status,200);
  assert.equal((await b.call("/api/planner")).status,401,"deleted account session is revoked");
  assert.equal((await a.call("/api/planner")).data.state.notes["2026-11-03"],"Phone fixture note");
  console.log("PASS: language assets, signup, two-device login, bidirectional sync, account isolation, CSRF, malformed writes, conflict, logout and deletion.");
} finally {
  await a.call("/api/account/delete",{confirmation:"회원탈퇴",password});
  await b.call("/api/account/delete",{confirmation:"회원탈퇴",password});
}
