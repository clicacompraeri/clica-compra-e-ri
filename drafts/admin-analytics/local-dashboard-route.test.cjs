"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createDashboardHandler}=require("./local-dashboard-route.cjs");
function get(port,pathname,cookie=""){
 return new Promise((resolve,reject)=>{
  http.get({hostname:"127.0.0.1",port,path:pathname,headers:cookie?{Cookie:cookie}:{}},res=>{
   let body="";res.on("data",c=>body+=c);res.on("end",()=>resolve({status:res.statusCode,body}));
  }).on("error",reject);
 });
}
test("relatorio local exige sessao valida",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-dashboard-"));
 const secret="chave-local-de-teste-com-mais-de-32-caracteres";
 const server=http.createServer(createDashboardHandler({directory,secret}));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 try{
  const port=server.address().port;
  assert.equal((await get(port,"/admin/report")).status,401);
  assert.equal((await get(port,"/admin/report","ccr_admin=invalid")).status,401);
  const cookie="ccr_admin="+createAdminToken(secret);
  assert.equal((await get(port,"/admin/report?days=45",cookie)).status,400);
  const valid=await get(port,"/admin/report?days=7",cookie);
  assert.equal(valid.status,200);
  assert.equal(JSON.parse(valid.body).simulation,true);
 }finally{await new Promise(ok=>server.close(ok));fs.rmSync(directory,{recursive:true,force:true});}
});
