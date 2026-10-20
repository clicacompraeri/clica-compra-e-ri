"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {spawnSync}=require("node:child_process");
const {hashPassword}=require("./admin-auth.cjs");
test("inicializacao do laboratorio aceita chave opcional de eventos",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-start-"));
 try{
  const env={...process.env,ADMIN_TEST_EMAIL:"demo@example.invalid",ADMIN_TEST_PASSWORD_HASH:hashPassword("senha-ficticia-forte-2026"),ADMIN_TEST_SIGNING_KEY:"segredo-de-teste-com-trinta-e-dois-caracteres-ou-mais",ADMIN_TEST_DATA_DIR:dir,ADMIN_TEST_EVENT_KEY:"chave-de-eventos-ficticios-do-laboratorio-2026",ADMIN_TEST_PORT:"0"};
  const child=spawnSync(process.execPath,["-e","const lab=require('./integrated-lab.cjs');const server=lab.run();server.on('listening',()=>server.close(()=>process.exit(0)));"],{cwd:__dirname,env,encoding:"utf8",timeout:10000});
  assert.equal(child.status,0,child.stderr||String(child.error));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
