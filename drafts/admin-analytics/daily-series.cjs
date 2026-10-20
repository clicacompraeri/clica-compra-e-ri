"use strict";
const {normalizeEvent}=require("./event-model.cjs");
function dailySeries(rows,{days=7,now=Date.now()}={}){
 if(![1,7,30].includes(days))throw Error("Período não aceito");
 const dates=new Map();
 for(let i=days-1;i>=0;i--){
  const d=new Date(now-i*86400000).toISOString().slice(0,10);
  dates.set(d,{date:d,pageViews:0,productViews:0,outboundClicks:0,courseCheckoutClicks:0});
 }
 const names={page_view:"pageViews",product_view:"productViews",affiliate_outbound:"outboundClicks",course_checkout_click:"courseCheckoutClicks"};
 for(const raw of rows){
  const e=normalizeEvent(raw);if(!e)continue;
  const key=e.at.slice(0,10);
  if(dates.has(key))dates.get(key)[names[e.type]]++;
 }
 return [...dates.values()];
}
module.exports={dailySeries};
