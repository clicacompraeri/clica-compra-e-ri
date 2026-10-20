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
 // Readiness polls the private Supabase store; allow a short warm-up window.
 let readiness;
 for(let attempt=0;attempt<24;attempt++){
  readiness=await check("/admin/login");
  if(readiness.status===200)break;
  if(readiness.status!==503)throw Error("Unexpected admin readiness status "+readiness.status);
  await new Promise(resolve=>setTimeout(resolve,2500));
 }
 assert.equal(readiness.status,200,"Private admin storage readiness must pass before testing");
 const routes=[
  {name:"storefront",path:"/",status:200,contains:"Clica, Compra e Ri"},
  {name:"free-preview",path:"/clica-do-zero/previa-gratuita.html",status:200,contains:"pay.hotmart.com/D108063505L"},
  {name:"student-login",path:"/clica-do-zero/aluno-login.html",status:200,contains:"Clica do Zero"},
  {name:"student-protected",path:"/clica-do-zero/aluno/",status:302,location:"/clica-do-zero/aluno-login.html"},
  {name:"support-api-protected",path:"/api/suporte/mensagens",status:401,contains:"ok"},
  {name:"admin-login-private-active",path:"/admin/login",status:200,contains:"Central de Análises — Login"},
  {name:"admin-report-protected",path:"/admin/report?days=7",status:401,contains:"Acesso restrito"},
  {name:"admin-home-protected",path:"/admin",status:401,contains:"Acesso restrito"},
  {name:"visitor-event-collection-disabled",path:"/api/analytics/event",status:404,method:"POST",
   headers:{"origin":origin,"content-type":"application/json"},
   body:JSON.stringify({type:"page_view",source:"direct",product:"",store:"other"}),contains:"Não encontrado"},
  {name:"webhook-rejects-unauthorized",path:"/api/hotmart/webhook",status:401,method:"POST",
   body:'{"event":"PURCHASE_APPROVED"}',contains:"Unauthorized"}
 ];
 for(const row of routes){
  const r=await check(row.path,row.method?{method:row.method,headers:row.headers||{"content-type":"application/json"},body:row.body}:{});
  assert.equal(r.status,row.status,row.name+": unexpected status "+r.status);
  if(row.contains)assert.ok(r.body.includes(row.contains),row.name+": expected content missing");
  if(row.location)assert.ok(r.location.startsWith(row.location),row.name+": unexpected redirect");
  console.log("PASS",row.name,r.status);
 }
 console.log("PASS all 10 public production smoke checks");
}
run().catch(e=>{console.error(String(e));process.exitCode=1;});
