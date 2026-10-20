"use strict";
// Módulo isolado de planejamento: NÃO importado por server.js.
// Não habilita coleta nem cria rotas em produção.
const TYPES=new Set(["page_view","product_view","affiliate_outbound","course_checkout_click"]);
const STORES=new Set(["amazon","shopee","mercado_livre","aliexpress","hotmart","other"]);
function normalizeEvent(value){
  if(!value || typeof value!=="object" || Array.isArray(value)) return null;
  if(!TYPES.has(value.type)) return null;
  const timestamp=new Date(value.at);
  if(!Number.isFinite(timestamp.getTime())) return null;
  const age=Date.now()-timestamp.getTime();
  if(age< -5*60*1000 || age>30*24*60*60*1000) return null;
  const product=typeof value.product==="string" ? value.product.trim().slice(0,80) : "";
  const store=typeof value.store==="string" ? value.store.toLowerCase().trim() : "";
  if(value.type==="affiliate_outbound" && !STORES.has(store)) return null;
  const source=["facebook","instagram","google","direct","other"].includes(value.source)?value.source:"other";
  return {type:value.type,at:timestamp.toISOString(),product,store:STORES.has(store)?store:"other",source};
}
function summarize(events){
  const totals={page_view:0,product_view:0,affiliate_outbound:0,course_checkout_click:0};
  const products={},stores={},sources={};
  for(const event of events){
    const e=normalizeEvent(event);if(!e) continue;
    totals[e.type]++;
    if(e.product && e.type==="product_view") products[e.product]=(products[e.product]||0)+1;
    if(e.type==="affiliate_outbound") stores[e.store]=(stores[e.store]||0)+1;
    sources[e.source]=(sources[e.source]||0)+1;
  }
  return {totals,products,stores,sources};
}
module.exports={normalizeEvent,summarize};
