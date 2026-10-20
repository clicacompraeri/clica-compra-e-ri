"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createIntegratedHandler}=require("./integrated-lab.cjs");
const {createAdminToken}=require("./admin-auth.cjs");
test("registro de sessoes corrompido resulta em HTTP 503 sem encerrar servidor",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-corrupt-http-"));
 const secret="segredo-ficticio-para-testes-com-mais-de-32-caracteres";
 const server=http.createServer(createIntegratedHandler({directory,secret}));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const request=(url)=>new Promise((resolve,reject)=>http.get({
  hostname:"127.0.0.1",port:server.address().port,path:url,
  headers:{Cookie:"ccr_admin="+createAdminToken(secret)}
 },res=>{res.resume();res.on("end",()=>resolve(res.statusCode));}).on("error",reject));
 try{
  fs.writeFileSync(path.join(directory,"revoked-sessions.json"),"{invalido");
  assert.equal(await request("/admin"),503);
  assert.equal(await request("/admin/report?days=7"),503);
  assert.equal(await request("/admin"),503);
 }finally{await new Promise(ok=>server.close(ok));fs.rmSync(directory,{recursive:true,force:true});}
});
