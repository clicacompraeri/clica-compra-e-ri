"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createDashboardHandler}=require("./local-dashboard-route.cjs");
test("API retorna erro controlado quando armazenamento falha",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-api-failure-"));
 const secret="chave-ficticia-de-teste-com-mais-de-32-caracteres";
 const server=http.createServer(createDashboardHandler({directory,secret}));
 try{
  fs.writeFileSync(path.join(directory,"events.jsonl"),"x".repeat(2*1024*1024+1));
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const response=await new Promise((resolve,reject)=>{
   http.get({hostname:"127.0.0.1",port:server.address().port,path:"/admin/report",headers:{Cookie:"ccr_admin="+createAdminToken(secret)}},res=>{
    let data="";res.on("data",c=>data+=c);res.on("end",()=>resolve({status:res.statusCode,body:data}));
   }).on("error",reject);
  });
  assert.equal(response.status,503);
  assert.doesNotMatch(response.body,/events.jsonl|Error:|node:fs/);
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(directory,{recursive:true,force:true});
 }
});
