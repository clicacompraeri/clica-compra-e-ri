"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createPrivateDemoHandler}=require("./private-demo-handler.cjs");
function request(port,route,cookie=""){
 return new Promise((resolve,reject)=>{
  http.get({hostname:"127.0.0.1",port,path:route,headers:cookie?{Cookie:cookie}:{}},res=>{
   let body="";res.setEncoding("utf8");res.on("data",chunk=>body+=chunk);
   res.on("end",()=>resolve({status:res.statusCode,body}));
  }).on("error",reject);
 });
}
test("painel visual nao aparece antes de autenticar",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-private-ui-"));
 const secret="chave-apenas-para-testes-do-painel-2026-123";
 const server=http.createServer(createPrivateDemoHandler({directory,secret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{
  const port=server.address().port;
  const denied=await request(port,"/admin");
  assert.equal(denied.status,401);
  assert.doesNotMatch(denied.body,/Central de Análises/);
  assert.equal((await request(port,"/admin","ccr_admin=invalido")).status,401);
  assert.equal((await request(port,"/admin/report")).status,401);
  const cookie="ccr_admin="+createAdminToken(secret);
  const allowed=await request(port,"/admin",cookie);
  assert.equal(allowed.status,200);
  assert.match(allowed.body,/Central de Análises/);
  assert.match(allowed.body,/DEMONSTRAÇÃO/);
  assert.match(allowed.body,/"pageViews":0/);
  assert.equal((await request(port,"/admin/report",cookie)).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});

test("relatorio corrompido nao deve produzir HTTP 200",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-private-error-"));
 const secret="chave-apenas-para-testes-do-painel-2026-123";
 fs.writeFileSync(path.join(directory,"events.jsonl"),"x".repeat(2*1024*1024+1));
 const server=http.createServer(createPrivateDemoHandler({directory,secret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{
  const response=await request(server.address().port,"/admin","ccr_admin="+createAdminToken(secret));
  assert.equal(response.status,503);
  assert.doesNotMatch(response.body,/Central de Análises/);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
