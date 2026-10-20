"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createFileStore}=require("./file-event-store.cjs");
test("remove registros antigos e preserva os recentes",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-retention-"));
 try{
  const file=path.join(dir,"events.jsonl");
  const recent={type:"page_view",source:"direct",at:new Date().toISOString()};
  const old={type:"page_view",source:"direct",at:new Date(Date.now()-40*86400000).toISOString()};
  fs.writeFileSync(file,JSON.stringify(recent)+"\n"+JSON.stringify(old)+"\n");
  const report=createFileStore({directory:dir}).prune();
  assert.deepEqual(report,{kept:1,removed:1});
  assert.equal(createFileStore({directory:dir}).read().length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("impede arquivo acima do limite",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-limit-"));
 try{
  fs.writeFileSync(path.join(dir,"events.jsonl"),"x".repeat(2*1024*1024+1));
  const store=createFileStore({directory:dir});
  assert.throws(()=>store.read());
  assert.throws(()=>store.append({type:"page_view",source:"direct",at:new Date().toISOString()}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("rejeita link simbolico quando suportado",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-symlink-"));
 try{
  const target=path.join(dir,"target");fs.writeFileSync(target,"");
  fs.symlinkSync(target,path.join(dir,"events.jsonl"));
  assert.throws(()=>createFileStore({directory:dir}).read());
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
