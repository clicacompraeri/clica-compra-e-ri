"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createAdminToken}=require("./admin-auth.cjs");
const {createPersistentSessionRegistry}=require("./persistent-session-registry.cjs");
const secret="segredo-ficticio-para-testes-mais-de-trinta-e-dois";
test("arquivo corrompido nunca libera sessao por engano",()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-corrupt-"));
 try{
  fs.writeFileSync(path.join(directory,"revoked-sessions.json"),"{invalid");
  const registry=createPersistentSessionRegistry({directory});
  assert.throws(()=>registry.isActive(createAdminToken(secret),secret));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test("link simbolico nao pode ser lido",()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-link-"));
 try{
  const target=path.join(directory,"target.json");fs.writeFileSync(target,"{}");
  fs.symlinkSync(target,path.join(directory,"revoked-sessions.json"));
  const registry=createPersistentSessionRegistry({directory});
  assert.throws(()=>registry.isActive(createAdminToken(secret),secret));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test("duas instancias sequenciais respeitam revogacoes",()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-two-"));
 try{
  const first=createPersistentSessionRegistry({directory});
  const second=createPersistentSessionRegistry({directory});
  const token=createAdminToken(secret);
  assert.equal(first.revoke(token,secret),true);
  assert.equal(second.isActive(token,secret),false);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
