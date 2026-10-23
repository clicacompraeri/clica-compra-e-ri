"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createPrivateDemoServer}=require("./private-demo-server.cjs");
const {hashPassword}=require("./admin-auth.cjs");
test("standalone demo requires collection off and isolates synthetic authenticated reports",async()=>{
 const origin="https://demo.example.invalid",password="fictitious-demo-password-2026";
 const env={CCR_ANALYTICS_COLLECTION_ENABLED:"false",CCR_DEMO_PUBLIC_ORIGIN:origin,CCR_DEMO_ADMIN_EMAIL:"admin@example.invalid",CCR_DEMO_PASSWORD_HASH:hashPassword(password)};
 assert.throws(()=>createPrivateDemoServer({...env,CCR_ANALYTICS_COLLECTION_ENABLED:"true"}));
 assert.throws(()=>createPrivateDemoServer({...env,CCR_ANALYTICS_COLLECTION_ENABLED:undefined}));
 const server=createPrivateDemoServer(env);
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url="http://127.0.0.1:"+server.address().port;
 const request=(path,options={})=>new Promise((resolve,reject)=>{
  const req=require("node:http").request(url+path,{method:options.method||"GET",headers:{host:"demo.example.invalid",origin,...options.headers}},res=>{
   let body="";res.on("data",chunk=>body+=chunk);res.on("end",()=>resolve({status:res.statusCode,headers:{get:name=>Array.isArray(res.headers[name])?res.headers[name][0]:res.headers[name]},json:async()=>JSON.parse(body)}));
  });req.on("error",reject);req.end(options.body?String(options.body):undefined);
 });
 try{
  for(const path of ["/","/api/analytics/event","/api/hotmart/webhook","/clica-do-zero/aluno/"])assert.equal((await request(path,{method:"POST"})).status,404);
  assert.equal((await request("/admin/report")).status,401);
  const login=await request("/admin/login",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({email:env.CCR_DEMO_ADMIN_EMAIL,password})});
  assert.equal(login.status,303);
  const cookie=login.headers.get("set-cookie").split(";")[0];
  const report=await (await request("/admin/report?days=7",{headers:{cookie}})).json();
  assert.equal(report.simulation,true);
  assert.deepEqual(report.metrics,{pageViews:14,productViews:14,outboundClicks:14,courseCheckoutClicks:7});
  assert.equal((await request("/admin/logout",{method:"POST",headers:{cookie}})).status,303);
  assert.equal((await request("/admin/report",{headers:{cookie}})).status,401);
 }finally{await new Promise(r=>server.close(r));}
});
