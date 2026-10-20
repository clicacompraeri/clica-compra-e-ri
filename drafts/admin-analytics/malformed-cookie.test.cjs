"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http");
const {createHandler}=require("./local-auth-lab.cjs");
test("cookie invalido nao derruba handler local",async()=>{
 const server=http.createServer(createHandler());
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 try{
  const response=await new Promise((resolve,reject)=>{
   http.get({hostname:"127.0.0.1",port:server.address().port,path:"/admin",headers:{Cookie:"ccr_admin=%ZZ"}},r=>{
    r.resume();r.on("end",()=>resolve(r.statusCode));
   }).on("error",reject);
  });
  assert.equal(response,401);
 }finally{await new Promise(ok=>server.close(ok));}
});
