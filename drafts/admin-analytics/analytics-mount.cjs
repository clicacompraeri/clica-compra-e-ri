"use strict";
// Explicit opt-in mount. Safe to import: with feature flag off, installs nothing.
const {createAnalyticsHandler}=require("./analytics-http-candidate.cjs");
const {createSupabaseAnalyticsStore}=require("./supabase-analytics-store.cjs");
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
 app.use(createAnalyticsHandler({
  publicOrigin:env.CCR_ANALYTICS_PUBLIC_ORIGIN,
  adminEmail:env.CCR_ANALYTICS_ADMIN_EMAIL,
  passwordHash:env.CCR_ANALYTICS_ADMIN_PASSWORD_HASH,
  signingKey:env.CCR_ANALYTICS_SIGNING_KEY,
  store
 }));
 return true;
}
module.exports={attachAnalyticsIfEnabled};
