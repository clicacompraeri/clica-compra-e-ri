"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createIntegratedHandler}=require("./integrated-lab.cjs");
const secret="chave-ficticia-de-laboratorio-painel-2026-12345";
function get(port,url,cookie){
 return new Promise((resolve,reject)=>{
  const headers=cookie?{Cookie:"ccr_admin="+cookie}:{};
  http.get({hostname:"127.0.0.1",port,path:url,headers},res=>{
   res.resume();res.on("end",()=>resolve(res.statusCode));
  }).on("error",reject);
 });
}
test("sessao expirada nao acessa painel nem relatorio via HTTP",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-expired-http-"));
 const server=http.createServer(createIntegratedHandler({directory,secret}));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 try{
  const token=createAdminToken(secret,Date.now()-31*60*1000);
  const port=server.address().port;
  assert.equal(await get(port,"/admin",token),401);
  assert.equal(await get(port,"/admin/report?days=7",token),401);
  assert.equal(await get(port,"/admin/report/../report?days=7",token),401);
 }finally{await new Promise(ok=>server.close(ok));fs.rmSync(directory,{recursive:true,force:true});}
});
