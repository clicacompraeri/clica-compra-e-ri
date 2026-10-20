"use strict";
const {authorizeReport}=require("./report-access-policy.cjs");
const {createFileStore}=require("./file-event-store.cjs");
const {buildDemoReport}=require("./dashboard-adapter.cjs");
function createProtectedReport({directory,secret}){
 if(typeof secret!=="string"||secret.length<32)throw Error("Chave obrigatoria");
 const store=createFileStore({directory});
 return function getReport(token,days=7){
  const auth=authorizeReport(token,secret,days);
  if(!auth.allowed)return {status:auth.code};
  return {status:200,report:buildDemoReport(store.read({days}),{days})};
 };
}
module.exports={createProtectedReport};
