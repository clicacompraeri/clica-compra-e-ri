"use strict";
// Compare the exact running storefront server.js with main under a disabled flag.
// No production deployment and no external requests or credentials.
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),net=require("node:net");
const {spawn,execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"../..");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function reservePort(){
 const s=net.createServer();
 await new Promise(resolve=>s.listen(0,"127.0.0.1",resolve));
 const p=s.address().port;
 await new Promise(resolve=>s.close(resolve));
 return p;
}
async function start(file,port){
 const env={...process.env,PORT:String(port),NODE_ENV:"test"};
 for(const k of Object.keys(env))if(k.startsWith("CCR_ANALYTICS_")||k.startsWith("HOTMART_")||k.startsWith("CLICA_STUDENT_"))delete env[k];
 const child=spawn(process.execPath,[file],{cwd:root,env,stdio:["ignore","pipe","pipe"]});
 let err="";
 child.stderr.on("data",x=>{err+=String(x).slice(0,1000)});
 for(let attempt=0;attempt<80;attempt++){
  if(child.exitCode!==null)throw Error("Test server exited: "+err);
  try{const response=await fetch("http://127.0.0.1:"+port+"/",{signal:AbortSignal.timeout(500)});if(response.ok)return child;}catch{}
  await sleep(50);
 }
 child.kill("SIGTERM");
 throw Error("Storefront test server never opened: "+err);
}
async function stop(child){
 if(!child||child.exitCode!==null)return;
 await new Promise(resolve=>{
  child.once("exit",resolve);
  child.kill("SIGTERM");
  setTimeout(()=>{if(child.exitCode===null)child.kill("SIGKILL");},1200).unref();
 });
}
async function snapshot(port,p,method="GET",body){
 const h=method==="POST"?{"Content-Type":"application/json"}:{};
 const r=await fetch("http://127.0.0.1:"+port+p,{method,headers:h,body,redirect:"manual",signal:AbortSignal.timeout(3000)});
 return {status:r.status,location:r.headers.get("location")||"",contentType:(r.headers.get("content-type")||"").split(";")[0],body:await r.text()};
}
test("Storefront unchanged compared with main when analytics flag is absent",{timeout:45000},async()=>{
 const baseSource=execFileSync("git",["show","origin/backup/main-pre-analytics-2026-10-20:server.js"],{cwd:root,encoding:"utf8",timeout:5000});
 const branchSource=fs.readFileSync(path.join(root,"server.js"),"utf8");
 assert.match(branchSource,/CCR_ANALYTICS_ENABLED === "true"/);
 assert.notEqual(branchSource,baseSource);
 const baseline=path.join(root,".__analytics_baseline_"+process.pid+".cjs");
 fs.writeFileSync(baseline,baseSource,{mode:0o600});
 let baseServer,branchServer;
 try{
  const a=await reservePort(),b=await reservePort();
  baseServer=await start(baseline,a);
  branchServer=await start(path.join(root,"server.js"),b);
  const routes=[
   ["/","GET"],["/clica-do-zero/","GET"],
   ["/clica-do-zero/aluno-login.html","GET"],
   ["/clica-do-zero/previa-gratuita.html","GET"],
   ["/assets/theme-toggle.js","GET"],["/privacidade.html","GET"],
   ["/guias/","GET"],["/clica-do-zero/aluno/","GET"],
   ["/api/suporte/mensagens","GET"],["/admin","GET"],
   ["/admin/report?days=7","GET"],["/api/analytics/event","GET"],
   ["/api/hotmart/webhook","POST",'{"event":"PURCHASE_APPROVED"}']
  ];
  for(const [route,method,body] of routes){
   const expected=await snapshot(a,route,method,body);
   const actual=await snapshot(b,route,method,body);
   assert.deepEqual(actual,expected,"Unexpected storefront regression for "+method+" "+route);
  }
 }finally{
  await Promise.all([stop(baseServer),stop(branchServer)]);
  fs.rmSync(baseline,{force:true});
 }
});
