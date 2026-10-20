"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createPersistentSessionRegistry}=require("./persistent-session-registry.cjs");
test("bloqueia segunda gravacao enquanto lock existe",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-lock-"));
 const secret="segredo-de-testes-isolados-com-mais-de-32-caracteres";
 try{
  fs.writeFileSync(path.join(dir,"revoked-sessions.lock"),"ocupado");
  const registry=createPersistentSessionRegistry({directory:dir});
  const token=createAdminToken(secret);
  assert.equal(registry.revoke(token,secret),false);
  fs.unlinkSync(path.join(dir,"revoked-sessions.lock"));
  assert.equal(registry.revoke(token,secret),true);
  assert.equal(createPersistentSessionRegistry({directory:dir}).isActive(token,secret),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
