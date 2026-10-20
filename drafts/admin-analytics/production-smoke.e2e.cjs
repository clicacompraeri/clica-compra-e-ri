"use strict";
// Public production smoke checks; no real credentials, personal data or purchases.
// Explicitly rejects unauthorized webhook. Never calls real checkout POSTs.
const {strict:assert}=require("node:assert");
const origin="https://clica-compra-e-ri-production.up.railway.app";
async function check(path,init={}){
 let last;
 for(let i=0;i<3;i++){
  try {
   const r=await fetch(origin+path,{...init,redirect:"manual",signal:AbortSignal.timeout(12000),
    headers:{"user-agent":"CCR-analytics-safe-deploy-smoke/1.0",...(init.headers||{})}});
   return {status:r.status,location:r.headers.get("location")||"",body:(await r.text()).slice(0,130000),type:r.headers.get("content-type")||""};
  }catch(e){last=e;if(i<2)await new Promise(r=>setTimeout(r,800));}
 }
 throw new Error("Public smoke network failure on "+path+": "+String(last?.message||last));
}
async function run(){
 const routes=[
  {name:"storefront",path:"/",status:200,contains:"Clica, Compra e Ri"},
  {name:"free-preview",path:"/clica-do-zero/previa-gratuita.html",status:200,contains:"pay.hotmart.com/D108063505L"},
  {name:"student-login",path:"/clica-do-zero/aluno-login.html",status:200,contains:"Clica do Zero"},
  {name:"student-protected",path:"/clica-do-zero/aluno/",status:302,location:"/clica-do-zero/aluno-login.html"},
  {name:"support-api-protected",path:"/api/suporte/mensagens",status:401,contains:"ok"},
  {name:"webhook-rejects-unauthorized",path:"/api/hotmart/webhook",status:401,method:"POST",
   body:'{"event":"PURCHASE_APPROVED"}',contains:"Unauthorized"}
 ];
 for(const row of routes){
  const r=await check(row.path,row.method?{method:row.method,headers:{"content-type":"application/json"},body:row.body}:{});
  assert.equal(r.status,row.status,row.name+": unexpected status "+r.status);
  if(row.contains)assert.ok(r.body.includes(row.contains),row.name+": expected content missing");
  if(row.location)assert.ok(r.location.startsWith(row.location),row.name+": unexpected redirect");
  console.log("PASS",row.name,r.status);
 }
 console.log("PASS all 6 public production smoke checks");
}
run().catch(e=>{console.error(String(e));process.exitCode=1;});
