"use strict";
// Laboratório independente; nunca importe no servidor publicado.
const http=require("node:http");
const {URL}=require("node:url");
const {verifyAdminToken}=require("./admin-auth.cjs");
const {createProtectedReport}=require("./protected-report.cjs");
function createDashboardHandler({directory,secret}){
 const read=createProtectedReport({directory,secret});
 return (req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1");
  if(req.method!=="GET"||url.pathname!=="/admin/report"){
   res.writeHead(404,{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"});
   return res.end(JSON.stringify({error:"Nao encontrado"}));
  }
  const cookie=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("ccr_admin="));
  let token="";
  try{token=cookie?decodeURIComponent(cookie.slice(10)):"";}catch{}
  const rawDays=url.searchParams.get("days");
  const days=rawDays===null?7:Number(rawDays);
  const result=read(token,days);
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.statusCode=result.status;
  res.end(JSON.stringify(result.status===200?result.report:{error:"Acesso negado ou periodo invalido"}));
 };
}
module.exports={createDashboardHandler};
