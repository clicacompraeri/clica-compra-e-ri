"use strict";
// Armazenamento persistente de LABORATORIO; nao importar em server.js.
// Apenas eventos normalizados, sem IP, cookies, emails, CPF ou URLs.
// Arquivo precisa residir fora de public/ e em disco persistente privado.
const fs=require("node:fs");
const path=require("node:path");
const {normalizeEvent}=require("./event-model.cjs");
function createFileStore({directory,filename="events.jsonl"}={}){
 if(typeof directory!=="string"||!path.isAbsolute(directory))throw Error("Diretorio absoluto obrigatorio");
 if(filename!=="events.jsonl")throw Error("Nome de arquivo nao permitido");
 const file=path.join(directory,filename);
 const MAX_BYTES=2*1024*1024;
 function safeFile(){
  if(!fs.existsSync(file))return;
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error("Arquivo inseguro");
  if(stat.size>MAX_BYTES)throw Error("Limite de armazenamento atingido");
 }
 function append(event){
  const normalized=normalizeEvent(event);
  if(!normalized)return {accepted:false};
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  safeFile();
  const line=JSON.stringify(normalized)+"\n";
  if(fs.existsSync(file)&&fs.statSync(file).size+Buffer.byteLength(line)>MAX_BYTES)throw Error("Limite de armazenamento atingido");
  fs.appendFileSync(file,line,{encoding:"utf8",mode:0o600,flag:"a",});
  return {accepted:true};
 }
 function read({days=7,now=Date.now()}={}){
  if(!Number.isSafeInteger(days)||days<1||days>30)throw Error("Periodo invalido");
  if(!fs.existsSync(file))return [];
  safeFile();
  const cutoff=now-days*86400000;
  const out=[];
  const lines=fs.readFileSync(file,"utf8").split("\n");
  for(const line of lines){
   if(!line.trim())continue;
   let data;
   try{data=JSON.parse(line);}catch{continue;}
   const date=new Date(data?.at).getTime();
   if(date>=cutoff&&date<=now+300000){
    const safe=normalizeEvent(data);
    if(safe)out.push(safe);
   }
  }
  return out;
 }
 function prune({now=Date.now(),retentionDays=30}={}){
  if(!Number.isSafeInteger(retentionDays)||retentionDays<1||retentionDays>30)throw Error("Retencao invalida");
  if(!fs.existsSync(file))return {kept:0,removed:0};
  safeFile();
  const original=fs.readFileSync(file,"utf8").split("\n").filter(Boolean);
  const cutoff=now-retentionDays*86400000;
  const kept=[];
  for(const line of original){
   try{
    const entry=JSON.parse(line);
    const timestamp=new Date(entry.at).getTime();
    if(Number.isFinite(timestamp)&&timestamp>=cutoff&&timestamp<=now+300000){
     const safe=normalizeEvent(entry);
     if(safe)kept.push(JSON.stringify(safe));
    }
   }catch{}
  }
  const temp=file+".tmp";
  fs.writeFileSync(temp,kept.length?kept.join("\n")+"\n":"",{mode:0o600,flag:"wx"});
  try{fs.renameSync(temp,file);}catch(e){try{fs.unlinkSync(temp);}catch{}throw e;}
  return {kept:kept.length,removed:original.length-kept.length};
 }
 return Object.freeze({append,read,prune});
}
module.exports={createFileStore};
