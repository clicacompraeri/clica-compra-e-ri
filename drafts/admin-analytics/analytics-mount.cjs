"use strict";
// Explicit opt-in mount. Safe to import: with feature flag off, installs nothing.
const {createAnalyticsHandler}=require("./analytics-http-candidate.cjs");
const {createSupabaseAnalyticsStore}=require("./supabase-analytics-store.cjs");
function startAnalyticsRetention(store,{schedule=setInterval,intervalMs=24*60*60*1000}={}){
 if(!store||typeof store.purge!=="function")throw Error("Private retention store missing");
 const purge=()=>Promise.resolve().then(()=>store.purge()).catch(()=>{ /* Retry on the next interval */ });
 void purge();
 const task=schedule(purge,intervalMs);
 if(task&&typeof task.unref==="function")task.unref();
 return task;
}
async function checkAnalyticsStorage(store){
 if(!store||typeof store.report!=="function"||typeof store.isRevoked!=="function")throw Error("Invalid analytics store");
 const report=await store.report(1);
 if(!report||report.simulation!==false||report.days!==1||!report.metrics||!Array.isArray(report.daily))
  throw Error("Analytics database report not ready");
 // The administrative revocation table must also exist and be readable.
 const probe="not-a-valid-session-token-storage-probe";
 if(await store.isRevoked(probe))throw Error("Unexpected revoked probe");
 return true;
}
function startAnalyticsReadiness(store,{schedule=setTimeout,retryMs=60*1000,healthyMs=5*60*1000,onFirstReady=()=>{}}={}){
 if(!Number.isSafeInteger(retryMs)||retryMs<1||!Number.isSafeInteger(healthyMs)||healthyMs<1)
  throw Error("Analytics retry interval invalid");
 let ready=false,started=false;
 const check=async()=>{
  try{
   await checkAnalyticsStorage(store);
   ready=true;
   if(!started){started=true;try{onFirstReady();}catch{/* Do not bypass readiness or break reports */}}
  }catch{ready=false;}
  const task=schedule(()=>{void check();},ready?healthyMs:retryMs);
  if(task&&typeof task.unref==="function")task.unref();
 };
 void check();
 return Object.freeze({isReady:()=>ready});
}
function attachAnalyticsIfEnabled(app,env=process.env){
 if(env.CCR_ANALYTICS_ENABLED!=="true")return false;
 const required=[
  "CCR_ANALYTICS_PUBLIC_ORIGIN","CCR_ANALYTICS_ADMIN_EMAIL",
  "CCR_ANALYTICS_ADMIN_PASSWORD_HASH","CCR_ANALYTICS_SIGNING_KEY",
  "CCR_ANALYTICS_SUPABASE_URL","CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY"
 ];
 const missing=required.filter(k=>!env[k]);
 if(missing.length)throw Error("Incomplete isolated analytics configuration: "+missing.join(","));
 const store=createSupabaseAnalyticsStore({
  baseUrl:env.CCR_ANALYTICS_SUPABASE_URL,
  serviceRoleKey:env.CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY
 });
 const handler=createAnalyticsHandler({
  publicOrigin:env.CCR_ANALYTICS_PUBLIC_ORIGIN,
  adminEmail:env.CCR_ANALYTICS_ADMIN_EMAIL,
  passwordHash:env.CCR_ANALYTICS_ADMIN_PASSWORD_HASH,
  signingKey:env.CCR_ANALYTICS_SIGNING_KEY,
  store
 });
 const readiness=startAnalyticsReadiness(store,{onFirstReady:()=>{startAnalyticsRetention(store);}});
 app.use((req,res,next)=>{
  const path=(req.originalUrl||req.url||"").split("?")[0];
  if(!["/admin","/admin/login","/admin/report","/admin/logout","/api/analytics/event"].includes(path))return next();
  // Coleta é uma segunda autorização, independente do login administrativo.
  // Nunca receber eventos no primeiro rollout privado por padrão.
  if(path==="/api/analytics/event"&&env.CCR_ANALYTICS_COLLECTION_ENABLED!=="true")
   return res.status(404).set("Cache-Control","no-store").send("Não encontrado");
  if(!readiness.isReady())return res.status(503).set("Cache-Control","no-store").send("Analytics indisponível");
  return handler(req,res,next);
 });
 return true;
}
module.exports={attachAnalyticsIfEnabled,startAnalyticsRetention,checkAnalyticsStorage,startAnalyticsReadiness};
