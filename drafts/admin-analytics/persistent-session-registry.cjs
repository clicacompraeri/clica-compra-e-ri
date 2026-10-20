"use strict";
// Laboratorio isolado: revogacoes persistidas em disco privado, sem tokens em claro.
// Requer um unico processo escritor. Nao utilizar em producao sem testes de concorrencia.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {verifyAdminToken}=require("./admin-auth.cjs");
function createPersistentSessionRegistry({directory,now=Date.now}={}){
 if(typeof directory!=="string"||!path.isAbsolute(directory))throw Error("Diretorio absoluto necessario");
 const file=path.join(directory,"revoked-sessions.json");
 const hashed=t=>crypto.createHash("sha256").update(t).digest("hex");
 function load(){
  if(!fs.existsSync(file))return {};
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw Error("Arquivo de revogacoes inseguro");
  const object=JSON.parse(fs.readFileSync(file,"utf8"));
  if(!object||typeof object!=="object"||Array.isArray(object))throw Error("Dados invalidos");
  return object;
 }
 function save(data){
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const temp=path.join(directory,"revoked-"+crypto.randomBytes(8).toString("hex")+".tmp");
  try{
   fs.writeFileSync(temp,JSON.stringify(data),{flag:"wx",mode:0o600});
   fs.renameSync(temp,file);
  }catch(err){try{fs.unlinkSync(temp);}catch{}throw err;}
 }
 function clean(data){
  const sec=Math.floor(now()/1000);
  for(const key of Object.keys(data))if(!Number.isFinite(data[key])||data[key]<=sec)delete data[key];
  return data;
 }
 function isActive(token,secret){
  if(!verifyAdminToken(token,secret,now()))return false;
  return !Object.prototype.hasOwnProperty.call(load(),hashed(token));
 }
 function revoke(token,secret){
  if(!verifyAdminToken(token,secret,now()))return false;
  const data=clean(load());
  data[hashed(token)]=Number(token.split(".")[0]);
  save(data);
  return true;
 }
 return Object.freeze({isActive,revoke});
}
module.exports={createPersistentSessionRegistry};
