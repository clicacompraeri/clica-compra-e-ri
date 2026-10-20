"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const os=require("node:os");
const path=require("node:path");
const fs=require("node:fs");
const {createFileStore}=require("./file-event-store.cjs");
test("dados normalizados persistem apos criar nova instancia",()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-analytics-"));
 try{
  const first=createFileStore({directory});
  assert.equal(first.append({type:"page_view",source:"google",at:new Date().toISOString(),email:"ignored@example.invalid"}).accepted,true);
  assert.equal(first.append({type:"unknown",at:new Date().toISOString()}).accepted,false);
  const second=createFileStore({directory});
  const events=second.read({days:7});
  assert.equal(events.length,1);
  assert.equal(events[0].type,"page_view");
  assert.equal(Object.hasOwn(events[0],"email"),false);
  assert.doesNotMatch(fs.readFileSync(path.join(directory,"events.jsonl"),"utf8"),/ignored@example.invalid/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test("rejeita diretorio relativo e periodo invalido",()=>{
 assert.throws(()=>createFileStore({directory:"relative"}));
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-analytics-"));
 try{assert.throws(()=>createFileStore({directory}).read({days:100}));}
 finally{fs.rmSync(directory,{recursive:true,force:true});}
});
