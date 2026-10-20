"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createProtectedReport}=require("./protected-report.cjs");
test("bloqueia acesso sem sessao e valida periodo",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-report-"));
 const secret="chave-de-teste-exclusiva-com-mais-de-32-caracteres";
 try{
  const read=createProtectedReport({directory:dir,secret});
  assert.equal(read("",7).status,401);
  assert.equal(read("falso",7).status,401);
  const session=createAdminToken(secret);
  assert.equal(read(session,45).status,400);
  const ok=read(session,7);
  assert.equal(ok.status,200);
  assert.equal(ok.report.simulation,true);
  assert.equal(ok.report.metrics.pageViews,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
