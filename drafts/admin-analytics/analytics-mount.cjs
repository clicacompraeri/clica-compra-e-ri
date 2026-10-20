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
 let ready=false;
 void checkAnalyticsStorage(store).then(()=>{
  ready=true;
  startAnalyticsRetention(store);
 }).catch(()=>{ready=false;});
 app.use((req,res,next)=>{
  const path=(req.originalUrl||req.url||"").split("?")[0];
  if(!["/admin","/admin/login","/admin/report","/admin/logout","/api/analytics/event"].includes(path))return next();
  if(!ready)return res.status(503).set("Cache-Control","no-store").send("Analytics indisponível");
  return handler(req,res,next);
 });
 return true;
}
module.exports={attachAnalyticsIfEnabled,startAnalyticsRetention,checkAnalyticsStorage};
