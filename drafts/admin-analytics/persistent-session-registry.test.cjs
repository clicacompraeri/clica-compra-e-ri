"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createPersistentSessionRegistry}=require("./persistent-session-registry.cjs");
test("revogacao persiste apos reinicializar o registro",()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-sessions-"));
 const secret="chave-exclusiva-para-testes-mais-de-32-caracteres";
 try{
  const token=createAdminToken(secret);
  const first=createPersistentSessionRegistry({directory});
  assert.equal(first.isActive(token,secret),true);
  assert.equal(first.revoke(token,secret),true);
  const afterRestart=createPersistentSessionRegistry({directory});
  assert.equal(afterRestart.isActive(token,secret),false);
  assert.equal(afterRestart.isActive(createAdminToken(secret),secret),true);
  const raw=fs.readFileSync(path.join(directory,"revoked-sessions.json"),"utf8");
  assert.equal(raw.includes(token),false);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
