"use strict";
// Recuperacao MANUAL de um lock abandonado no laboratorio, sem rotas web.
// Apenas quando o processo escritor estiver comprovadamente parado.
const fs=require("node:fs");
const path=require("node:path");
function inspectInterruptedLock(directory){
 if(typeof directory!=="string"||!path.isAbsolute(directory))throw Error("Diretorio absoluto obrigatorio");
 const lock=path.join(directory,"revoked-sessions.lock");
 if(!fs.existsSync(lock))return {locked:false};
 const stat=fs.lstatSync(lock);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error("Lock inseguro");
 return {locked:true,size:stat.size,modifiedAt:stat.mtime.toISOString()};
}
function clearInterruptedLock(directory,{confirmedStopped=false}={}){
 if(confirmedStopped!==true)throw Error("Confirme a parada do processo antes de recuperar");
 const status=inspectInterruptedLock(directory);
 if(!status.locked)return false;
 // Recuperacao nao e automatica; antes de desbloquear, as sessoes
 // existentes precisam expirar ou a chave de assinatura ser rotacionada.
 throw Error("Rotacione a chave de sessao e reinicie o laboratorio antes de remover o lock manualmente");
}
module.exports={inspectInterruptedLock,clearInterruptedLock};
