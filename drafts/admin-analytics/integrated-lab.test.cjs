"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {hashPassword}=require("./admin-auth.cjs");
process.env.ADMIN_TEST_EMAIL="demo@example.invalid";
process.env.ADMIN_TEST_PASSWORD_HASH=hashPassword("senha ficticia longa de teste 2026");
process.env.ADMIN_TEST_SIGNING_KEY="chave-ficticia-de-laboratorio-painel-2026-12345";
const {createIntegratedHandler}=require("./integrated-lab.cjs");
function request(port,p,method="GET",body="",cookie=""){
 return new Promise((resolve,reject)=>{
  const headers={};
  if(cookie)headers.Cookie=cookie;
  if(method==="POST"){headers.Origin="http://127.0.0.1:"+port;headers["Content-Type"]="application/x-www-form-urlencoded";headers["Content-Length"]=Buffer.byteLength(body);}
  const q=http.request({hostname:"127.0.0.1",port,path:p,method,headers},r=>{
   let output="";r.on("data",x=>output+=x);r.on("end",()=>resolve({status:r.statusCode,body:output,cookie:r.headers["set-cookie"]?.[0]||""}));
  });q.on("error",reject);q.end(body);
 });
}
test("laboratorio integrado: login, painel, relatorio e logout",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-integrado-"));
 const server=http.createServer(createIntegratedHandler({directory:dir,secret:process.env.ADMIN_TEST_SIGNING_KEY}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 try{
  assert.equal((await request(port,"/admin")).status,401);
  assert.equal((await request(port,"/admin/report")).status,401);
  const bad=await request(port,"/login","POST","email=demo%40example.invalid&password=errada");
  assert.equal(bad.status,401);
  const form="email=demo%40example.invalid&password="+encodeURIComponent("senha ficticia longa de teste 2026");
  const login=await request(port,"/login","POST",form);
  assert.equal(login.status,303);
  const cookie=login.cookie.split(";")[0];
  assert.equal((await request(port,"/admin","GET","",cookie)).status,200);
  assert.equal((await request(port,"/admin/report","GET","",cookie)).status,200);
  const logout=await request(port,"/admin/logout","POST","",cookie);
  assert.equal(logout.status,303);
  assert.equal((await request(port,"/admin","GET","",logout.cookie.split(";")[0])).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
