"use strict";
// Prototipo isolado de bloqueio temporario. Memoria local; em producao usar
// armazenamento compartilhado/persistente e auditoria sem dados sensiveis.
function createAttemptLimiter({maxAttempts=5,windowMs=15*60*1000,blockMs=15*60*1000,now=Date.now}={}){
  const state=new Map();
  function check(key){
    if(typeof key!=="string"||!key||key.length>200)return {allowed:false,retryAfterMs:0};
    const time=now(),record=state.get(key);
    if(!record)return {allowed:true,retryAfterMs:0};
    if(record.blockUntil>time)return {allowed:false,retryAfterMs:record.blockUntil-time};
    if(record.windowStart+windowMs<=time){state.delete(key);return {allowed:true,retryAfterMs:0};}
    return {allowed:true,retryAfterMs:0};
  }
  function fail(key){
    if(typeof key!=="string"||!key||key.length>200)return;
    const time=now(),old=state.get(key);
    const record=!old||old.windowStart+windowMs<=time
      ? {windowStart:time,count:0,blockUntil:0} : old;
    record.count++;
    if(record.count>=maxAttempts)record.blockUntil=time+blockMs;
    state.set(key,record);
  }
  function success(key){state.delete(key);}
  return {check,fail,success};
}
module.exports={createAttemptLimiter};
