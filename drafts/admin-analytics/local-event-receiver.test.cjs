"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createLocalEventReceiver}=require("./local-event-receiver.cjs");
const {createFileStore}=require("./file-event-store.cjs");
test("receptor local rejeita sem chave, aceita evento anonimo e nao registra dados pessoais",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-receiver-"));
 const secret="segredo-de-laboratorio-sem-uso-em-producao-1234";
 const server=http.createServer(createLocalEventReceiver({directory,secret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const send=(key,payload)=>new Promise((resolve,reject)=>{
  const body=JSON.stringify(payload);
  const req=http.request({hostname:"127.0.0.1",port:server.address().port,method:"POST",path:"/lab/events",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body),"x-lab-secret":key}},res=>{
   res.resume();res.on("end",()=>resolve(res.statusCode));
  });req.on("error",reject);req.end(body);
 });
 try{
  const event={type:"affiliate_outbound",store:"amazon",product:"Livro de teste",source:"google",at:new Date().toISOString(),email:"teste@example.invalid",ip:"192.0.2.10",url:"https://example.invalid/private"};
  assert.equal(await send("chave-errada",event),401);
  assert.equal(await send(secret,event),202);
  assert.equal(await send(secret,{type:"not_allowed",at:new Date().toISOString()}),422);
  const raw=fs.readFileSync(path.join(directory,"events.jsonl"),"utf8");
  assert.doesNotMatch(raw,/teste@example.invalid|192\.0\.2\.10|example\.invalid\/private/);
  assert.equal(createFileStore({directory}).read({days:7}).length,1);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
