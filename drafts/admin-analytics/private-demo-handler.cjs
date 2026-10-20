"use strict";
// Simulador HTTP completo e isolado. Nao usado por server.js.
const http=require("node:http");
const {URL}=require("node:url");
const {verifyAdminToken}=require("./admin-auth.cjs");
const {createDemoDashboard}=require("./build-dashboard.cjs");
const {createDashboardHandler}=require("./local-dashboard-route.cjs");
function createPrivateDemoHandler({directory,secret}){
 const api=createDashboardHandler({directory,secret});
 return (req,res)=>{
  const url=new URL(req.url,"http://localhost");
  if(req.method==="GET"&&url.pathname==="/admin/report")return api(req,res);
  if(req.method!=="GET"||url.pathname!=="/admin"){
   res.writeHead(404,{"Cache-Control":"no-store"});return res.end("Nao encontrado");
  }
  const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("ccr_admin="));
  let token="";
  try{token=raw?decodeURIComponent(raw.slice("ccr_admin=".length)):"";}catch{}
  if(!verifyAdminToken(token,secret)){
   res.writeHead(401,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"});
   return res.end("Acesso restrito");
  }
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
   "Content-Security-Policy":"default-src 'self' 'unsafe-inline'; frame-ancestors 'none'"});
  res.end(createDemoDashboard());
 };
}
module.exports={createPrivateDemoHandler};
