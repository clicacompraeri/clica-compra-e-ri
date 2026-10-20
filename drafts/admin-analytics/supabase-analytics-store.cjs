"use strict";
// Preparado para publicacao futura: nao habilitar sem schema RLS, segredos e testes.
const crypto=require("node:crypto");
function createSupabaseAnalyticsStore({baseUrl,serviceRoleKey,fetchFn=globalThis.fetch}={}){
 if(typeof baseUrl!=="string"||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(baseUrl))throw Error("Origem do banco invalida");
 if(typeof serviceRoleKey!=="string"||serviceRoleKey.length<20)throw Error("Chave privada obrigatoria");
 if(typeof fetchFn!=="function")throw Error("Cliente HTTP obrigatorio");
 const base=baseUrl.replace(/\/$/,"");
 if(serviceRoleKey.startsWith("sb_publishable_"))throw Error("Chave publica nao autorizada");
 const headers={apikey:serviceRoleKey,"content-type":"application/json","cache-control":"no-store"};
 if(!serviceRoleKey.startsWith("sb_secret_"))headers.authorization="Bearer "+serviceRoleKey;
 async function call(method,pathname,payload,extra={}){
  const response=await fetchFn(base+pathname,{method,headers:{...headers,...extra},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error("Armazenamento privado de analytics indisponivel");
  if(response.status===204)return null;
  return response.json();
 }
 const digest=token=>crypto.createHash("sha256").update(token).digest("hex");
 return Object.freeze({
  async ingest(event){return call("POST","/rest/v1/rpc/ccr_analytics_ingest",{
   p_event_type:event.type,p_source:event.source,p_product:event.product,p_store:event.store
  });},
  async report(days){if(![1,7,30].includes(days))throw Error("Periodo invalido");return call("POST","/rest/v1/rpc/ccr_analytics_report",{p_days:days});},
  async isRevoked(token){const rows=await call("GET","/rest/v1/ccr_analytics_revoked_sessions?select=token_sha256&token_sha256=eq."+digest(token)+"&limit=1");if(!Array.isArray(rows))throw Error("Resposta de sessao invalida");return rows.length>0;},
  async revoke(token){const exp=Number(String(token).split(".")[0]);if(!Number.isSafeInteger(exp)||exp*1000<=Date.now())return false;await call("POST","/rest/v1/ccr_analytics_revoked_sessions?on_conflict=token_sha256",{token_sha256:digest(token),expires_at:new Date(exp*1000).toISOString()},{Prefer:"resolution=merge-duplicates,return=minimal"});return true;},
  async purge(){return call("POST","/rest/v1/rpc/ccr_analytics_purge",{});}
 });
}
module.exports={createSupabaseAnalyticsStore};
