"use strict";
/*
 * Laboratório local: NÃO importar no server.js de produção.
 * Iniciar apenas em 127.0.0.1 com variáveis de teste.
 * Sem credenciais embutidas, sem dados reais, sem integração com a loja.
 */
const http=require("node:http");
const {URLSearchParams}=require("node:url");
const auth=require("./admin-auth.cjs");
const {createAttemptLimiter}=require("./attempt-limiter.cjs");
const limiter=createAttemptLimiter();
const secrets={
 email:process.env.ADMIN_TEST_EMAIL||"",
 passwordHash:process.env.ADMIN_TEST_PASSWORD_HASH||"",
 signingKey:process.env.ADMIN_TEST_SIGNING_KEY||""
};
function send(res,code,body,headers={}){
 res.writeHead(code,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
  "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",...headers});
 res.end(body);
}
function html(body){return "<!doctype html><html lang='pt-BR'><meta charset='utf-8'><title>Painel de teste</title><body>"+body+"</body></html>";}
function loginPage(){return html("<h1>Clica, Compra e Ri — laboratório</h1><p>Somente teste local. Não utilizar credenciais reais.</p><form method='post' action='/login'><label>E-mail <input name='email' type='email' required></label><label>Senha <input name='password' type='password' required></label><button>Entrar</button></form>");}
function parseCookie(req){
 const part=(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("ccr_admin="));
 return part?decodeURIComponent(part.slice("ccr_admin=".length)):"";
}
function createHandler(){
 return async(req,res)=>{
  const method=req.method||"GET",path=(req.url||"").split("?")[0];
  if(method==="GET"&&path==="/login")return send(res,200,loginPage());
  if(method==="GET"&&path==="/admin"){
   if(!auth.verifyAdminToken(parseCookie(req),secrets.signingKey))return send(res,401,html("<h1>Acesso restrito</h1>"));
   return send(res,200,html("<h1>Protótipo privado</h1><p>Dados reais ainda não conectados.</p><form method='post' action='/logout'><button>Sair</button></form>"));
  }
  if(method==="POST"&&(path==="/login"||path==="/logout")){
   // Em ambiente de teste local, exigir Host e Origin locais para POST.
   const host=req.headers.host||"",origin=req.headers.origin||"";
   if(!/^127\.0\.0\.1:[0-9]+$/.test(host)||origin!=="http://"+host)return send(res,403,"Proibido");
   if(path==="/logout")return send(res,303,"",{"Location":"/login","Set-Cookie":auth.clearAdminCookie()});
   const key="login-local";
   if(!limiter.check(key).allowed)return send(res,429,html("<p>Tentativas excessivas. Aguarde.</p>"));
   let body="";for await(const chunk of req){body+=chunk;if(body.length>4096)return send(res,413,"Limite excedido");}
   const form=new URLSearchParams(body);
   const ok=form.get("email")===secrets.email&&auth.verifyPassword(form.get("password")||"",secrets.passwordHash);
   if(!ok){limiter.fail(key);return send(res,401,html("<p>Credenciais inválidas</p>"));}
   limiter.success(key);
   return send(res,303,"",{"Location":"/admin","Set-Cookie":auth.cookieForAdmin(auth.createAdminToken(secrets.signingKey))});
  }
  return send(res,404,"Não encontrado");
 };
}
function run(){
 if(!secrets.email||!secrets.passwordHash||secrets.signingKey.length<32)throw Error("Credenciais de teste não configuradas");
 const port=Number(process.env.ADMIN_TEST_PORT||49183);
 const server=http.createServer(createHandler());
 server.listen(port,"127.0.0.1",()=>console.log("Laboratório disponível somente em 127.0.0.1:"+port));
 return server;
}
if(require.main===module)run();
module.exports={createHandler,run};
