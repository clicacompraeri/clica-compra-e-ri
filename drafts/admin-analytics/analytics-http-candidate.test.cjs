"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http");
const {hashPassword}=require("./admin-auth.cjs");
const {createAnalyticsHandler}=require("./analytics-http-candidate.cjs");
function request(port,path,{method="GET",origin="https://site.example",cookie="",body="",contentType="application/x-www-form-urlencoded"}={}){
 return new Promise((resolve,reject)=>{
  const headers={Host:"site.example",Origin:origin};
  if(cookie)headers.Cookie=cookie;
  if(method==="POST"){headers["Content-Type"]=contentType;headers["Content-Length"]=Buffer.byteLength(body);}
  const req=http.request({hostname:"127.0.0.1",port,path,method,headers},res=>{
   let text="";res.on("data",chunk=>text+=chunk);res.on("end",()=>resolve({status:res.statusCode,body:text,cookie:res.headers["set-cookie"]?.[0]||""}));
  });req.on("error",reject);req.end(body);
 });
}
test("rotas privadas: login, relatorio real agregado, logout e bloqueio do token",async()=>{
 const revoked=new Set(),ingested=[];
 const store={
  async isRevoked(token){return revoked.has(token);},
  async revoke(token){revoked.add(token);return true;},
  async report(days){return {simulation:false,days,metrics:{pageViews:5,productViews:2,outboundClicks:1,courseCheckoutClicks:0},daily:[{date:"2026-10-20",pageViews:5}],sources:[],products:[],stores:[]};},
  async ingest(event){ingested.push(event);return true;},
  async purge(){return 0;}
 };
 const server=http.createServer(createAnalyticsHandler({
  publicOrigin:"https://site.example/",adminEmail:"admin@example.invalid",
  passwordHash:hashPassword("senha-ficticia-forte-do-painel-2026"),
  signingKey:"secret-test-analytics-2026-with-more-than-32-characters",store
 }));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 try{
  const port=server.address().port;
  assert.equal((await request(port,"/admin")).status,401);
  assert.equal((await request(port,"/admin/report?days=7")).status,401);
  assert.equal((await request(port,"/admin/login")).status,200);
  const form="email=admin%40example.invalid&password="+encodeURIComponent("senha-ficticia-forte-do-painel-2026");
  assert.equal((await request(port,"/admin/login",{method:"POST",origin:"http://site.example",body:form})).status,403);
  assert.equal((await request(port,"/admin/login",{method:"POST",body:"email=admin%40example.invalid&password=wrong"})).status,401);
  const login=await request(port,"/admin/login",{method:"POST",body:form});
  assert.equal(login.status,303);assert.match(login.cookie,/HttpOnly/);assert.match(login.cookie,/Secure/);
  const cookie=login.cookie.split(";")[0];
  const report=await request(port,"/admin/report?days=30",{cookie});
  assert.equal(report.status,200);assert.equal(JSON.parse(report.body).days,30);
  assert.equal((await request(port,"/admin",{cookie})).status,200);
  assert.equal((await request(port,"/admin/report?days=99",{cookie})).status,400);
  assert.equal((await request(port,"/api/analytics/event",{method:"POST",origin:"http://site.example",body:"{}",
   contentType:"application/json"})).status,403);
  const event={type:"affiliate_outbound",source:"google",product:"Potes hermeticos",store:"mercado_livre",email:"ignored@example.invalid",url:"https://example.invalid/private"};
  assert.equal((await request(port,"/api/analytics/event",{method:"POST",body:JSON.stringify(event),contentType:"application/json"})).status,202);
  assert.equal(ingested.length,1);
  assert.equal(Object.hasOwn(ingested[0],"email"),false);
  assert.equal(Object.hasOwn(ingested[0],"url"),false);
  assert.equal((await request(port,"/api/analytics/event",{method:"POST",body:JSON.stringify({...event,product:"person@example.invalid"}),contentType:"application/json"})).status,422);
  assert.equal((await request(port,"/admin/logout",{method:"POST",cookie})).status,303);
  assert.equal((await request(port,"/admin/report?days=7",{cookie})).status,401);
 }finally{await new Promise(ok=>server.close(ok));}
});
test("falha da base privada nega acesso sem vazar detalhes",async()=>{
 const secret="secret-test-analytics-2026-with-more-than-32-characters";
 const {createAdminToken}=require("./admin-auth.cjs");
 const store={async isRevoked(){throw Error("sensitive database error")}};
 const server=http.createServer(createAnalyticsHandler({
  publicOrigin:"https://site.example/",adminEmail:"admin@example.invalid",
  passwordHash:hashPassword("senha-ficticia-forte-do-painel-2026"),signingKey:secret,store
 }));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 try{
  const res=await request(server.address().port,"/admin/report",{cookie:"ccr_admin="+createAdminToken(secret)});
  assert.equal(res.status,503);assert.doesNotMatch(res.body,/sensitive database error/);
 }finally{await new Promise(ok=>server.close(ok));}
});
