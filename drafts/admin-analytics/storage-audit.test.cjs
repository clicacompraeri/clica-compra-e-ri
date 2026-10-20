"use strict";
// Auditoria de limites de armazenamento - laboratório isolado.
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createFileStore}=require("./file-event-store.cjs");
test("prune nao publica dados e exclui registro antigo",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-audit-"));
 try{
  const f=path.join(dir,"events.jsonl");
  const current=JSON.stringify({type:"page_view",at:new Date().toISOString(),source:"direct"});
  const old=JSON.stringify({type:"page_view",at:new Date(Date.now()-40*86400000).toISOString(),source:"direct"});
  fs.writeFileSync(f,current+"\n"+old+"\n");
  const result=createFileStore({directory:dir}).prune();
  assert.deepEqual(result,{kept:1,removed:1});
  assert.equal(fs.readFileSync(f,"utf8").trim().split("\n").length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("limite nao permite crescer alem de 2MB",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-audit-"));
 try{
  fs.writeFileSync(path.join(dir,"events.jsonl"),"x".repeat(2*1024*1024+1));
  assert.throws(()=>createFileStore({directory:dir}).append({type:"page_view",at:new Date().toISOString()}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
