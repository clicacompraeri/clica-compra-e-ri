"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const http=require("node:http");
const {hashPassword}=require("./admin-auth.cjs");
process.env.ADMIN_TEST_EMAIL="teste-admin@example.invalid";
process.env.ADMIN_TEST_PASSWORD_HASH=hashPassword("senha exclusiva de laboratorio 987");
process.env.ADMIN_TEST_SIGNING_KEY="segredo-somente-testes-mais-de-32-caracteres-2026";
const {createHandler}=require("./local-auth-lab.cjs");
function request(port,path,{method="GET",body="",cookie="",origin=""}={}){
 return new Promise((resolve,reject)=>{
  const headers={Host:"127.0.0.1:"+port};
  if(cookie)headers.Cookie=cookie;
  if(origin)headers.Origin=origin;
  if(method==="POST"){headers["Content-Type"]="application/x-www-form-urlencoded";headers["Content-Length"]=Buffer.byteLength(body);}
  const req=http.request({hostname:"127.0.0.1",port,path,method,headers},res=>{
   let value="";res.setEncoding("utf8");res.on("data",s=>value+=s);res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,body:value}));
  });req.on("error",reject);req.end(body);
 });
}
test("login administrativo local e protecoes HTTP",async()=>{
 const server=http.createServer(createHandler());
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port,origin="http://127.0.0.1:"+port;
 try {
  assert.equal((await request(port,"/admin")).status,401);
  assert.equal((await request(port,"/login")).status,200);
  const payload="email=teste-admin%40example.invalid&password="+encodeURIComponent("senha exclusiva de laboratorio 987");
  assert.equal((await request(port,"/login",{method:"POST",body:payload})).status,403);
  const wrong=await request(port,"/login",{method:"POST",origin,body:"email=teste-admin%40example.invalid&password=errada"});
  assert.equal(wrong.status,401);
  const login=await request(port,"/login",{method:"POST",origin,body:payload});
  assert.equal(login.status,303);
  assert.match(login.headers["set-cookie"][0],/HttpOnly/);
  const cookie=login.headers["set-cookie"][0].split(";")[0];
  assert.equal((await request(port,"/admin",{cookie})).status,200);
  const logout=await request(port,"/logout",{method:"POST",origin,cookie});
  assert.equal(logout.status,303);
  assert.match(logout.headers["set-cookie"][0],/Max-Age=0/);
  assert.equal((await request(port,"/admin",{cookie:logout.headers["set-cookie"][0].split(";")[0]})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
