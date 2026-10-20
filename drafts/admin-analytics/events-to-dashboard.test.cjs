"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createIntegratedHandler}=require("./integrated-lab.cjs");
const {createAdminToken}=require("./admin-auth.cjs");
function request(port,route,{method="GET",key="",cookie="",body=""}={}){
 return new Promise((resolve,reject)=>{
  const headers={};if(key)headers["x-lab-secret"]=key;if(cookie)headers.Cookie="ccr_admin="+cookie;
  if(method==="POST"){headers["Content-Type"]="application/json";headers["Content-Length"]=Buffer.byteLength(body);}
  const req=http.request({hostname:"127.0.0.1",port,path:route,method,headers},res=>{
   let output="";res.on("data",c=>output+=c);res.on("end",()=>resolve({status:res.statusCode,body:output}));
  });req.on("error",reject);req.end(body);
 });
}
test("eventos ficticios aparecem nos indicadores protegidos",async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-e2e-"));
 const secret="segredo-para-autenticacao-ficticia-de-testes-2026";
 const eventSecret="segredo-separado-para-eventos-ficticios-2026";
 const server=http.createServer(createIntegratedHandler({directory,secret,eventSecret}));
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{
  const port=server.address().port,at=new Date().toISOString();
  const events=[
   {type:"page_view",source:"direct",at},
   {type:"product_view",source:"google",product:"Produto ficticio",at},
   {type:"affiliate_outbound",source:"google",product:"Produto ficticio",store:"amazon",at},
   {type:"course_checkout_click",source:"facebook",product:"Curso ficticio",at}
  ];
  for(const event of events){
   const r=await request(port,"/lab/events",{method:"POST",key:eventSecret,body:JSON.stringify(event)});
   assert.equal(r.status,202);
  }
  assert.equal((await request(port,"/admin/report")).status,401);
  const cookie=createAdminToken(secret);
  const result=await request(port,"/admin/report?days=7",{cookie});
  assert.equal(result.status,200);
  const report=JSON.parse(result.body);
  assert.equal(report.metrics.pageViews,1);
  assert.equal(report.metrics.productViews,1);
  assert.equal(report.metrics.outboundClicks,1);
  assert.equal(report.metrics.courseCheckoutClicks,1);
  assert.equal(report.daily.reduce((sum,day)=>sum+day.pageViews,0),1);
  const page=await request(port,"/admin",{cookie});
  assert.equal(page.status,200);
  assert.match(page.body,/"pageViews":1/);
  assert.match(page.body,/"outboundClicks":1/);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
