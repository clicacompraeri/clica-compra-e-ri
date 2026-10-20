"use strict";
/* Armazenamento temporário apenas para testes, sem usuários reais,
 * sem rede, sem acesso à loja e sem persistência. Não usar em produção. */
const {normalizeEvent,summarize}=require("./event-model.cjs");
function createDemoStore({capacity=500,clock=Date.now}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>10000)throw Error("Capacidade inválida");
 let entries=[];
 function add(raw){
  const normalized=normalizeEvent(raw);
  if(!normalized)return {accepted:false};
  entries.push(normalized);
  if(entries.length>capacity) entries=entries.slice(-capacity);
  return {accepted:true};
 }
 function report({days=7}={}){
  if(!Number.isSafeInteger(days)||days<1||days>30)throw Error("Período inválido");
  const cutoff=clock()-days*86400000;
  const included=entries.filter(e=>new Date(e.at).getTime()>=cutoff);
  return {demo:true,days,events:included.length,...summarize(included)};
 }
 function clear(){entries=[];}
 return Object.freeze({add,report,clear});
}
module.exports={createDemoStore};
