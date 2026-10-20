"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createIntegratedHandler}=require("./integrated-lab.cjs");
const {createFileStore}=require("./file-event-store.cjs");
function post(port,key,event){
 const body=JSON.stringify(event);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:"127.0.0.1",port,path:"/lab/events",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body),"x-lab-secret":key}},res=>{res.resume();res.on("end",()=>resolve(res.statusCode));});
  req.on("error",reject);req.end(body);
 });
}
test("laboratorio exige habilitacao explicita para receber eventos",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-disabled-"));
 const secret="segredo-de-autenticacao-de-teste-1234567890";
 const server=http.createServer(createIntegratedHandler({directory:dir,secret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{
  assert.equal(await post(server.address().port,"chave-invalida",{type:"page_view",at:new Date().toISOString()}),404);
  assert.equal(fs.existsSync(path.join(dir,"events.jsonl")),false);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
test("laboratorio recebe evento somente com chave explicita",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-enabled-"));
 const secret="segredo-de-autenticacao-de-teste-1234567890";
 const eventSecret="segredo-independente-para-eventos-de-teste-987654321";
 const server=http.createServer(createIntegratedHandler({directory:dir,secret,eventSecret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{
  const event={type:"page_view",source:"direct",at:new Date().toISOString()};
  assert.equal(await post(server.address().port,"incorreto",event),401);
  assert.equal(await post(server.address().port,eventSecret,event),202);
  assert.equal(createFileStore({directory:dir}).read({days:7}).length,1);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
