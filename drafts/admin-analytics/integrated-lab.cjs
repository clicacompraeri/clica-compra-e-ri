"use strict";
// Servidor de laboratorio: apenas localhost e credenciais ficticias.
// Nao importar em server.js de producao.
const http=require("node:http");
const {createHandler}=require("./local-auth-lab.cjs");
const {createPrivateDemoHandler}=require("./private-demo-handler.cjs");
function createIntegratedHandler({directory,secret}){
 const login=createHandler();
 const dashboard=createPrivateDemoHandler({directory,secret});
 return (req,res)=>{
  const path=(req.url||"").split("?")[0];
  if(path==="/login"||path==="/admin/logout")return login(req,res);
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
