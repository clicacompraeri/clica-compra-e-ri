"use strict";
// Standalone demonstration. Never import from the storefront server.
const http=require("node:http");
const crypto=require("node:crypto");
const {createAnalyticsHandler}=require("./analytics-http-candidate.cjs");
const {buildDemoReport,syntheticEvents}=require("./dashboard-adapter.cjs");
function createPrivateDemoServer(env=process.env){
 if(env.CCR_ANALYTICS_COLLECTION_ENABLED!=="false")throw Error("Demo requires collection explicitly false");
 if(!env.CCR_DEMO_ADMIN_EMAIL||!env.CCR_DEMO_PASSWORD_HASH)throw Error("Dedicated demo credentials required");
 // A new signing key invalidates every previous session after a restart.
 const signingKey=crypto.randomBytes(48).toString("hex"),revoked=new Map();
 const digest=token=>crypto.createHash("sha256").update(token).digest("hex");
 const store={
  async report(days){return buildDemoReport(syntheticEvents(),{days});},
  async isRevoked(token){return revoked.has(digest(token));},
  async revoke(token){
   for(const [key,expiry] of revoked)if(expiry<=Date.now())revoked.delete(key);
   revoked.set(digest(token),Number(token.split(".")[0])*1000);return true;
  },
  async ingest(){throw Error("Demo collection forbidden");},
  async purge(){return 0;}
 };
 const handler=createAnalyticsHandler({publicOrigin:env.CCR_DEMO_PUBLIC_ORIGIN,adminEmail:env.CCR_DEMO_ADMIN_EMAIL,passwordHash:env.CCR_DEMO_PASSWORD_HASH,signingKey,store});
 return http.createServer((req,res)=>{
  const route=new URL(req.url,"http://localhost").pathname;
  if(route==="/healthz"){res.writeHead(200,{"Content-Type":"text/plain","Cache-Control":"no-store"});return res.end("ok");}
  // No event route, storefront, external API or production credentials.
  if(!["/admin","/admin/login","/admin/logout","/admin/report"].includes(route)){
   res.writeHead(404,{"Cache-Control":"no-store"});return res.end("Não encontrado");
  }
  return handler(req,res);
 });
}
if(require.main===module){
 const server=createPrivateDemoServer();
 server.listen(Number(process.env.PORT||49184),process.env.CCR_DEMO_BIND_HOST||"127.0.0.1");
}
module.exports={createPrivateDemoServer};
