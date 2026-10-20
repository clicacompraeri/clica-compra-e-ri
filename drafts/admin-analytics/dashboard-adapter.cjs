"use strict";
// Ponte entre eventos fictícios e o formato do painel.
// Isolada: não importa o servidor público nem disponibiliza rotas.
const {createDemoStore}=require("./demo-event-store.cjs");
const {normalizeEvent}=require("./event-model.cjs");
const {dailySeries}=require("./daily-series.cjs");
const ALLOWED=["page_view","product_view","affiliate_outbound","course_checkout_click"];
function buildDemoReport(rows,{days=7}={}){
 const now=Date.now();
 const store=createDemoStore({capacity:10000,clock:()=>now});
 if(!Array.isArray(rows)||rows.length>10000)throw Error("Limite de eventos de laboratorio excedido");
 // O grafico e os totais usam as mesmas datas UTC do calendario.
 const daily=dailySeries(rows,{days,now});
 const visibleDates=new Set(daily.map(day=>day.date));
 let accepted=0,rejected=0;
 for(const item of rows){
  const event=normalizeEvent(item);
  if(!event){rejected++;continue;}
  accepted++;
  if(visibleDates.has(event.at.slice(0,10)))store.add(event);
 }
 const report=store.report({days});
 return {
  simulation:true,days,accepted,rejected,daily,
  metrics:{
   pageViews:report.totals.page_view,
   productViews:report.totals.product_view,
   outboundClicks:report.totals.affiliate_outbound,
   courseCheckoutClicks:report.totals.course_checkout_click
  },
  sources:Object.entries(report.sources).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value})),
  products:Object.entries(report.products).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value})),
  stores:Object.entries(report.stores).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value})),
  eventTypes:ALLOWED
 };
}
function syntheticEvents(now=new Date()){
 const result=[];
 const defs=[
  ["page_view","","","google"],["page_view","","","facebook"],
  ["product_view","Potes herméticos","","google"],
  ["product_view","Livros Kindle","","direct"],
  ["affiliate_outbound","Potes herméticos","mercado_livre","facebook"],
  ["affiliate_outbound","Livros Kindle","amazon","google"],
  ["course_checkout_click","Clica do Zero","","facebook"]
 ];
 for(let day=0;day<7;day++){
  for(let i=0;i<defs.length;i++){
   const d=new Date(now.getTime()-day*86400000);
   // Eventos de demonstração em sete datas diferentes.

   const [type,product,store,source]=defs[i];
   result.push({type,product,store,source,at:d.toISOString()});
  }
 }
 return result;
}
module.exports={buildDemoReport,syntheticEvents};
