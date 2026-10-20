"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createServer}=require("node:http");
const {attachAnalyticsIfEnabled}=require("./analytics-mount.cjs");
const {hashPassword}=require("./admin-auth.cjs");
test("admin enabled with collection flag absent: login works but event collection stays 404",{timeout:10000},async()=>{
 const oldFetch=globalThis.fetch;
 let ingests=0,readinessChecks=0;
 const upstream=async(url,request)=>{
  if(String(url).endsWith("/rpc/ccr_analytics_report")){
   readinessChecks++;
   const days=JSON.parse(request.body).p_days;
   return {ok:true,status:200,json:async()=>({simulation:false,days,metrics:{pageViews:0,productViews:0,outboundClicks:0,courseCheckoutClicks:0},daily:[],sources:[],products:[],stores:[]})};
  }
  if(String(url).includes("/ccr_analytics_revoked_sessions?")){
   return {ok:true,status:200,json:async()=>[]};
  }
  if(String(url).endsWith("/rpc/ccr_analytics_purge"))return {ok:true,status:200,json:async()=>0};
  if(String(url).includes("ccr_analytics_ingest")){ingests++;return {ok:true,status:200,json:async()=>true};}
  throw Error("Unexpected private database request");
 };
 globalThis.fetch=upstream;
 let server;
 try{
  let handler;
  const app={use(fn){handler=fn;}};
  const good=attachAnalyticsIfEnabled(app,{
   CCR_ANALYTICS_ENABLED:"true",
   // CCR_ANALYTICS_COLLECTION_ENABLED deliberately ABSENT
   CCR_ANALYTICS_PUBLIC_ORIGIN:"https://example.test/",
   CCR_ANALYTICS_ADMIN_EMAIL:"admin@example.test",
   CCR_ANALYTICS_ADMIN_PASSWORD_HASH:hashPassword("test-password-for-isolated-admin-only"),
   CCR_ANALYTICS_SIGNING_KEY:"local-test-signing-key-at-least-32-characters",
   CCR_ANALYTICS_SUPABASE_URL:"https://ccr-test.supabase.co",
   CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY:"sb_secret_test_never_a_real_secret_123456789"
  });
  assert.equal(good,true);
  assert.equal(typeof handler,"function");
  server=createServer((req,res)=>{
   // Express response functions needed by the actual middleware under test.
   res.status=(code)=>{res.statusCode=code;return res;};
   res.set=(name,value)=>{res.setHeader(name,value);return res;};
   res.send=(body)=>{res.end(body);return res;};
   handler(req,res,()=>{res.writeHead(200);res.end("storefront")});
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  const event=await oldFetch(base+"/api/analytics/event",{
   method:"POST",headers:{origin:"https://example.test","content-type":"application/json"},
   body:JSON.stringify({type:"page_view",source:"direct",store:"other",product:""})
  });
  assert.equal(event.status,404,"Collection must remain off while admin is enabled");
  assert.equal(ingests,0);
  let login;
  for(let i=0;i<25;i++){
   login=await oldFetch(base+"/admin/login");
   if(login.status===200)break;
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(login.status,200,"Readiness must allow private login when database is ready");
  assert.ok(readinessChecks>=1);
  assert.equal(ingests,0);
  const home=await oldFetch(base+"/clica-do-zero/previa-gratuita.html");
  assert.equal(home.status,200,"Storefront remains outside analytics module");
  assert.equal(await home.text(),"storefront");
 }finally{
  globalThis.fetch=oldFetch;
  if(server){
   server.closeAllConnections();
   await Promise.race([
    new Promise(resolve=>server.close(resolve)),
    new Promise((_,reject)=>setTimeout(()=>reject(Error("Test server did not close in 3s")),3000))
   ]);
  }
 }
});
