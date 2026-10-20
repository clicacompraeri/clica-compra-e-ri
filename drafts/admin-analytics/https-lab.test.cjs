"use strict";
// TLS integration test using a temporary self-signed certificate on loopback only.
// rejectUnauthorized:false is permissible ONLY for this ephemeral local test client.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const https=require("node:https");
const {spawnSync}=require("node:child_process");
const {hashPassword}=require("./admin-auth.cjs");
process.env.ADMIN_TEST_EMAIL="https-admin@example.invalid";
process.env.ADMIN_TEST_PASSWORD_HASH=hashPassword("fictitious password strong enough 2026");
process.env.ADMIN_TEST_SIGNING_KEY="secret-for-tls-lab-test-with-over-32-characters";
const {createIntegratedHandler}=require("./integrated-lab.cjs");
function request(port,route,{method="GET",body="",cookie="",origin}={}){
 return new Promise((resolve,reject)=>{
  const headers={};if(cookie)headers.Cookie=cookie;
  if(method==="POST"){
   headers.Origin=origin??("https://127.0.0.1:"+port);
   headers["Content-Type"]="application/x-www-form-urlencoded";
   headers["Content-Length"]=Buffer.byteLength(body);
  }
  const q=https.request({hostname:"127.0.0.1",port,path:route,method,headers,rejectUnauthorized:false},res=>{
   let output="";res.on("data",chunk=>output+=chunk);
   res.on("end",()=>resolve({status:res.statusCode,cookie:res.headers["set-cookie"]?.[0]||"",body:output}));
  });q.on("error",reject);q.end(body);
 });
}
test("laboratorio HTTPS: login, cookie seguro, relatorio e logout",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-tls-test-"));
 let server;
 try{
  const keyFile=path.join(dir,"key.pem"),certFile=path.join(dir,"cert.pem");
  const cert=spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",keyFile,"-out",certFile,"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],{encoding:"utf8",timeout:10000});
  assert.equal(cert.status,0,cert.stderr||String(cert.error));
  server=https.createServer({key:fs.readFileSync(keyFile),cert:fs.readFileSync(certFile)},createIntegratedHandler({directory:dir,secret:process.env.ADMIN_TEST_SIGNING_KEY}));
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const port=server.address().port;
  assert.equal((await request(port,"/admin")).status,401);
  const body="email=https-admin%40example.invalid&password="+encodeURIComponent("fictitious password strong enough 2026");
  assert.equal((await request(port,"/login",{method:"POST",body,origin:"http://127.0.0.1:"+port})).status,403);
  const login=await request(port,"/login",{method:"POST",body});
  assert.equal(login.status,303);
  assert.match(login.cookie,/HttpOnly/);
  assert.match(login.cookie,/Secure/);
  assert.match(login.cookie,/SameSite=Strict/);
  const cookie=login.cookie.split(";")[0];
  assert.equal((await request(port,"/admin",{cookie})).status,200);
  assert.equal((await request(port,"/admin/report?days=7",{cookie})).status,200);
  const logout=await request(port,"/admin/logout",{method:"POST",cookie});
  assert.equal(logout.status,303);
  assert.match(logout.cookie,/Max-Age=0/);
  assert.equal((await request(port,"/admin",{cookie})).status,401);
 } finally{
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
