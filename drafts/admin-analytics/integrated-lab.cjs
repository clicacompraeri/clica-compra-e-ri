"use strict";
// Servidor de laboratorio: apenas localhost e credenciais ficticias.
// Nao importar em server.js de producao.
const http=require("node:http");
const {createHandler}=require("./local-auth-lab.cjs");
const {createPrivateDemoHandler}=require("./private-demo-handler.cjs");
const {createPersistentSessionRegistry}=require("./persistent-session-registry.cjs");
function createIntegratedHandler({directory,secret}){
 const login=createHandler();
 const dashboard=createPrivateDemoHandler({directory,secret});
 const sessions=createPersistentSessionRegistry({directory});
 return (req,res)=>{
  const path=(req.url||"").split("?")[0];
  if(path==="/admin/logout"){
   const cookie=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("ccr_admin="));
   let token="";try{token=cookie?decodeURIComponent(cookie.slice("ccr_admin=".length)):"";}catch{}
   if(!sessions.isActive(token,secret)){res.writeHead(401,{"Cache-Control":"no-store"});return res.end("Acesso restrito");}
   if(req.method!=="POST"){res.writeHead(404,{"Cache-Control":"no-store"});return res.end("Nao encontrado");}
   const host=req.headers.host||"",origin=req.headers.origin||"";
   if(!/^127\.0\.0\.1:[0-9]+$/.test(host)||origin!=="http://"+host){res.writeHead(403,{"Cache-Control":"no-store"});return res.end("Proibido");}
   try{
    if(!sessions.revoke(token,secret)){res.writeHead(503,{"Cache-Control":"no-store"});return res.end("Saida nao confirmada");}
   }catch{res.writeHead(503,{"Cache-Control":"no-store"});return res.end("Saida nao confirmada");}
   const {clearAdminCookie}=require("./admin-auth.cjs");
   res.writeHead(303,{"Location":"/login","Set-Cookie":clearAdminCookie(),"Cache-Control":"no-store"});
   return res.end();
  }
  if(path==="/login")return login(req,res);
  if(path==="/admin"||path==="/admin/report"){
   const cookie=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("ccr_admin="));
   let token="";try{token=cookie?decodeURIComponent(cookie.slice("ccr_admin=".length)):"";}catch{}
   if(!sessions.isActive(token,secret)){res.writeHead(401,{"Cache-Control":"no-store"});return res.end("Acesso restrito");}
  }
  return dashboard(req,res);
 };
}
function run(){
 const {ADMIN_TEST_EMAIL,ADMIN_TEST_PASSWORD_HASH,ADMIN_TEST_SIGNING_KEY,ADMIN_TEST_DATA_DIR}=process.env;
 if(!ADMIN_TEST_EMAIL||!ADMIN_TEST_PASSWORD_HASH||!ADMIN_TEST_SIGNING_KEY||ADMIN_TEST_SIGNING_KEY.length<32||!ADMIN_TEST_DATA_DIR)throw Error("Variaveis locais de teste obrigatorias");
 const server=http.createServer(createIntegratedHandler({directory:ADMIN_TEST_DATA_DIR,secret:ADMIN_TEST_SIGNING_KEY}));
 server.listen(Number(process.env.ADMIN_TEST_PORT||49183),"127.0.0.1");
 return server;
}
if(require.main===module)run();
module.exports={createIntegratedHandler,run};
