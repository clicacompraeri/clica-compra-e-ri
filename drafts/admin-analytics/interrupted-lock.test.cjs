"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createPersistentSessionRegistry}=require("./persistent-session-registry.cjs");
test("bloqueia acesso se lock remanescente existir",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-lock-interrupted-"));
 try{
  const secret="segredo-ficticio-de-mais-de-trinta-e-dois-caracteres";
  const token=createAdminToken(secret);
  const registry=createPersistentSessionRegistry({directory:dir});
  assert.equal(registry.isActive(token,secret),true);
  fs.writeFileSync(path.join(dir,"revoked-sessions.lock"),"interrompido");
  assert.equal(registry.isActive(token,secret),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
