"use strict";
// Candidate only. Importing this module does not enable any routes or data collection.
const {URLSearchParams}=require("node:url");
const {verifyPassword,createAdminToken,verifyAdminToken,cookieForAdmin,clearAdminCookie}=require("./admin-auth.cjs");
const {normalizeEvent}=require("./event-model.cjs");
const {createDemoDashboard}=require("./build-dashboard.cjs");
const {createAttemptLimiter}=require("./attempt-limiter.cjs");
function createAnalyticsHandler({publicOrigin,adminEmail,passwordHash,signingKey,store}={}){
 const expected=new URL(publicOrigin);
 if(expected.protocol!=="https:"||expected.username||expected.password||expected.pathname!=="/"||expected.search)throw Error("An HTTPS origin is required");
 if(!adminEmail||!passwordHash||typeof signingKey!=="string"||signingKey.length<32||!store)throw Error("Private analytics credentials and persistent store required");
 const loginLimiter=createAttemptLimiter({maxAttempts:8,windowMs:15*60*1000,blockMs:15*60*1000});
 const eventLimiter=createAttemptLimiter({maxAttempts:100,windowMs:60*1000,blockMs:60*1000});
 function headers(type="text/plain; charset=utf-8"){return {"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex,nofollow","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'; form-action 'self'"};}
 function send(res,status,body="",type){res.writeHead(status,headers(type));res.end(body);}
 function redirect(res,url,cookie){res.writeHead(303,{...headers(),Location:url,...(cookie?{"Set-Cookie":cookie}:{})});res.end();}
 function goodOrigin(req){return req.headers.host===expected.host&&req.headers.origin===expected.origin;}
 function cookieToken(req){const raw=String(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("ccr_admin="));try{return raw?decodeURIComponent(raw.slice("ccr_admin=".length)):"";}catch{return "";}}
 async function authenticated(req){const token=cookieToken(req);if(!verifyAdminToken(token,signingKey))return null;if(await store.isRevoked(token))return null;return token;}
 async function parseBody(req,maxBytes){
  const contentLength=Number(req.headers["content-length"]||0);
  if(!Number.isFinite(contentLength)||contentLength>maxBytes)throw Error("Body too large");
  if(req.body&&typeof req.body==="object"&&!Array.isArray(req.body)){
   if(Buffer.byteLength(JSON.stringify(req.body))>maxBytes)throw Error("Body too large");
   return req.body;
  }
  let input="",length=0;
  for await(const chunk of req){length+=chunk.length;if(length>maxBytes)throw Error("Body too large");input+=chunk.toString("utf8");}
  if(String(req.headers["content-type"]||"").startsWith("application/x-www-form-urlencoded"))return Object.fromEntries(new URLSearchParams(input));
  if(String(req.headers["content-type"]||"").startsWith("application/json"))return JSON.parse(input);
  throw Error("Unsupported content type");
 }
 function loginHtml(){return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Central de Análises — Login</title><style>body{font:16px system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f8;color:#202a35}main{background:white;width:min(420px,calc(100vw - 36px));padding:28px;border:1px solid #dce2e7;border-radius:16px;box-sizing:border-box}input,button{display:block;width:100%;box-sizing:border-box;padding:12px;margin:9px 0 19px;font:inherit}button{background:#263d52;color:white;border:0;border-radius:9px;cursor:pointer}label{font-weight:700}small{color:#526475}</style></head><body><main><strong>Clica, Compra e Ri</strong><h1>Central de Análises</h1><p>Acesso reservado ao administrador.</p><form method="post" action="/admin/login"><label for="email">E-mail</label><input id="email" name="email" type="email" maxlength="120" required autocomplete="username"><label for="password">Senha</label><input id="password" name="password" type="password" required autocomplete="current-password"><button>Entrar</button></form><small>Relatórios de cliques e visitas, não de vendas confirmadas.</small></main></body></html>';}
 let lastPurge=0;
 return async function analytics(req,res,next){
  let pathname;
  try{pathname=new URL(req.originalUrl||req.url||"/",expected.origin).pathname;}catch{return send(res,400,"Endereço inválido");}
  const isAdmin=["/admin","/admin/login","/admin/report","/admin/logout"].includes(pathname);
  const isEvent=pathname==="/api/analytics/event";
  if(!isAdmin&&!isEvent)return typeof next==="function"?next():send(res,404,"Não encontrado");
  try{
   if(isEvent){
    if(req.method!=="POST")return send(res,404,"Não encontrado");
    if(!goodOrigin(req))return send(res,403,"Origem não permitida");
    if(req.headers["sec-gpc"]==="1"||req.headers.dnt==="1")return send(res,204);
    if(!String(req.headers["content-type"]||"").startsWith("application/json"))return send(res,415,"Formato inválido");
    if(!eventLimiter.check("collect").allowed)return send(res,429,"Muitas solicitações");
    let data;try{data=await parseBody(req,1024);}catch{return send(res,400,"Evento inválido");}
    const event=normalizeEvent({type:data.type,source:data.source,product:data.product,store:data.store,at:new Date().toISOString()});
    if(!event||/@|https?:|www\.|\/|\\/.test(event.product))return send(res,422,"Evento inválido");
    eventLimiter.fail("collect");
    const accepted=await store.ingest(event);
    if(!accepted)return send(res,429,"Capacidade diária atingida");
    if(Date.now()-lastPurge>86400000){try{await store.purge();lastPurge=Date.now();}catch{ /* Retry later without losing recorded event */ }}
    return send(res,202,"");
   }
   if(pathname==="/admin/login"){
    if(req.method==="GET"){
     const h=headers("text/html; charset=utf-8");h["Content-Security-Policy"]="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'";
     res.writeHead(200,h);return res.end(loginHtml());
    }
    if(req.method!=="POST")return send(res,405,"Método não permitido");
    if(!goodOrigin(req))return send(res,403,"Origem não permitida");
    if(!loginLimiter.check("admin-global").allowed)return send(res,429,"Aguarde antes de tentar novamente");
    let form;try{form=await parseBody(req,2048);}catch{return send(res,400,"Formulário inválido");}
    if(form.email!==adminEmail||!verifyPassword(form.password||"",passwordHash)){
     loginLimiter.fail("admin-global");return send(res,401,"Credenciais inválidas");
    }
    loginLimiter.success("admin-global");
    return redirect(res,"/admin",cookieForAdmin(createAdminToken(signingKey)));
   }
   const token=await authenticated(req);
   if(!token)return send(res,401,"Acesso restrito");
   if(pathname==="/admin/logout"){
    if(req.method!=="POST")return send(res,405,"Método não permitido");
    if(!goodOrigin(req))return send(res,403,"Origem não permitida");
    if(!await store.revoke(token))return send(res,503,"Saída não confirmada");
    return redirect(res,"/admin/login",clearAdminCookie());
   }
   if(req.method!=="GET")return send(res,405,"Método não permitido");
   if(pathname==="/admin/report"){
    const search=new URL(req.originalUrl||req.url,expected.origin).searchParams;
    const raw=search.get("days"),days=raw===null?7:Number(raw);
    if(![1,7,30].includes(days))return send(res,400,"Período inválido");
    const report=await store.report(days);
    return send(res,200,JSON.stringify(report),"application/json; charset=utf-8");
   }
   const report=await store.report(7),html=createDemoDashboard(report);
   const h=headers("text/html; charset=utf-8");h["Content-Security-Policy"]="default-src 'self' 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'";
   res.writeHead(200,h);return res.end(html);
  }catch{return send(res,503,"Serviço de análises temporariamente indisponível");}
 };
}
module.exports={createAnalyticsHandler};
