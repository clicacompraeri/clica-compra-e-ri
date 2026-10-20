"use strict";
// Full Express 5 integration: same parser/middleware interface as production.
// No external network, no checkout calls and no real credentials or visitor data.
const test=require("node:test"),assert=require("node:assert/strict");
const express=require("express");
const {createServer}=require("node:http");
const {createHash}=require("node:crypto");
const {hashPassword}=require("./admin-auth.cjs");
const {attachAnalyticsIfEnabled}=require("./analytics-mount.cjs");

function listen(app){
 return new Promise(resolve=>{
  const server=createServer(app);
  server.listen(0,"127.0.0.1",()=>resolve(server));
 });
}
async function request(port,route,{method="GET",origin,cookie,body,contentType="application/x-www-form-urlencoded"}={}){
 const headers={};
 if(origin)headers.Origin=origin;
 if(cookie)headers.Cookie=cookie;
 if(method==="POST"){
  headers["Content-Type"]=contentType;
 }
 const result=await fetch("http://127.0.0.1:"+port+route,{
  method,headers,body,redirect:"manual"
 });
 return {status:result.status,text:await result.text(),headers:result.headers};
}
function appWithStorefront(){
 const app=express();
 app.use(express.urlencoded({extended:false}));
 app.use(express.json());
 return app;
}
function fallback(app){
 app.use((req,res)=>res.status(200).send("STORE FRONT UNCHANGED"));
}
test("Express 5: analytics disabled means no new handler or event ingestion",async()=>{
 const app=appWithStorefront();
 assert.equal(attachAnalyticsIfEnabled(app,{CCR_ANALYTICS_ENABLED:"false"}),false);
 fallback(app);
 const server=await listen(app),port=server.address().port;
 try{
  for(const path of ["/","/clica-do-zero/","/admin","/admin/report","/api/analytics/event"]){
   const res=await request(port,path);
   assert.equal(res.status,200,path);
   assert.equal(res.text,"STORE FRONT UNCHANGED",path);
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test("Express 5: opt-in login, protected report, events, revocation, routes untouched",async()=>{
 const app=appWithStorefront();
 const server=await listen(app),port=server.address().port;
 const origin="https://127.0.0.1:"+port;
 const oldFetch=globalThis.fetch;
 const revoked=new Map(),received=[];
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);
  assert.equal(u.hostname,"test-analytics.supabase.co");
  if(u.pathname.endsWith("/rpc/ccr_analytics_purge"))
   return {ok:true,status:200,json:async()=>0};
  if(u.pathname.endsWith("/rpc/ccr_analytics_report")){
   const days=JSON.parse(options.body).p_days;
   return {ok:true,status:200,json:async()=>({simulation:false,days,metrics:{pageViews:7,productViews:3,outboundClicks:2,courseCheckoutClicks:1},daily:[{date:"2026-10-20",pageViews:7}],products:[],sources:[],stores:[]})};
  }
  if(u.pathname.endsWith("/rpc/ccr_analytics_ingest")){
   received.push(JSON.parse(options.body));
   return {ok:true,status:200,json:async()=>true};
  }
  if(u.pathname.endsWith("/ccr_analytics_revoked_sessions")){
   if(options.method==="POST"){
    const body=JSON.parse(options.body);
    assert.match(options.headers.Prefer,/return=minimal/);
    revoked.set(body.token_sha256,body.expires_at);
    // PostgREST's common no-content upsert result: 201 with return=minimal
    return {ok:true,status:201,json:async()=>{throw Error("No body");}};
   }
   const digest=u.searchParams.get("token_sha256").replace(/^eq\./,"");
   return {ok:true,status:200,json:async()=>(revoked.has(digest)?[{token_sha256:digest}]:[])};
  }
  throw Error("Unexpected database request: "+u.pathname);
 };
 try{
  const activated=attachAnalyticsIfEnabled(app,{
   CCR_ANALYTICS_ENABLED:"true",
   CCR_ANALYTICS_PUBLIC_ORIGIN:origin+"/",
   CCR_ANALYTICS_ADMIN_EMAIL:"sample-admin@example.invalid",
   CCR_ANALYTICS_ADMIN_PASSWORD_HASH:hashPassword("fake-admin-password-only-test"),
   CCR_ANALYTICS_SIGNING_KEY:"test-signing-secret-32-chars-and-beyond-only-ci",
   CCR_ANALYTICS_SUPABASE_URL:"https://test-analytics.supabase.co",
   CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY:"sb_secret_temporary_fake_key_for_local_CI_only"
  });
  assert.equal(activated,true);
  fallback(app);
  assert.equal((await request(port,"/admin")).status,401);
  assert.equal((await request(port,"/admin/report")).status,401);
  assert.equal((await request(port,"/clica-do-zero/")).text,"STORE FRONT UNCHANGED");
  assert.equal((await request(port,"/api/hotmart/webhook")).text,"STORE FRONT UNCHANGED");
  assert.equal((await request(port,"/admin/login",{method:"POST",origin:"https://evil.invalid",body:"email=x&password=y"})).status,403);
  const form="email=sample-admin%40example.invalid&password=fake-admin-password-only-test";
  const signed=await request(port,"/admin/login",{method:"POST",origin,body:form});
  assert.equal(signed.status,303);
  const setCookie=signed.headers.get("set-cookie");
  assert.match(setCookie,/Secure/);
  assert.match(setCookie,/HttpOnly/);
  assert.match(setCookie,/SameSite=Strict/);
  const cookie=setCookie.split(";")[0];
  const report=await request(port,"/admin/report?days=30",{cookie});
  assert.equal(report.status,200);
  assert.equal(JSON.parse(report.text).days,30);
  const post=await request(port,"/api/analytics/event",{method:"POST",origin,contentType:"application/json",body:JSON.stringify({
   type:"affiliate_outbound",source:"google",product:"Potes hermeticos",store:"mercado_livre",email:"no@example.invalid"
  })});
  assert.equal(post.status,202);
  assert.equal(received.length,1);
  assert.equal(JSON.stringify(received[0]).includes("no@example.invalid"),false);
  const out=await request(port,"/admin/logout",{method:"POST",origin,cookie,body:""});
  assert.equal(out.status,303);
  assert.equal(revoked.size,1);
  assert.equal((await request(port,"/admin/report?days=7",{cookie})).status,401);
 }finally{
  globalThis.fetch=oldFetch;
  await new Promise(resolve=>server.close(resolve));
 }
});
