"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {inspectInterruptedLock,clearInterruptedLock}=require("./lock-recovery.cjs");
test("inspeciona lock sem permitir remocao insegura",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-recovery-"));
 try{
  assert.equal(inspectInterruptedLock(dir).locked,false);
  fs.writeFileSync(path.join(dir,"revoked-sessions.lock"),"interrompido");
  assert.equal(inspectInterruptedLock(dir).locked,true);
  assert.throws(()=>clearInterruptedLock(dir));
  assert.throws(()=>clearInterruptedLock(dir,{confirmedStopped:true}));
  assert.equal(fs.existsSync(path.join(dir,"revoked-sessions.lock")),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
