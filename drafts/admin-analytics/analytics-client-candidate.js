"use strict";
// Candidate for future visitor collection. Inert unless <html data-ccr-analytics="enabled">.
// Never sends visitor identity, URL, query string, referrer URL, cookie or payment data.
(function(){
 if(document.documentElement?.dataset?.ccrAnalytics!=="enabled")return;
 if(navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
 const allowed=new Set(["page_view","product_view","affiliate_outbound","course_checkout_click"]);
 const source=(()=>{
  try{
   const u=new URL(location.href),utm=(u.searchParams.get("utm_source")||"").toLowerCase();
   const ref=document.referrer?new URL(document.referrer).hostname.toLowerCase():"";
   const hints=utm+" "+ref;
   if(/instagram/.test(hints))return "instagram";
   if(/facebook|fb\.com|fbclid/.test(hints))return "facebook";
   if(/google|gclid/.test(hints))return "google";
   return ref&&ref!==location.hostname?"other":"direct";
  }catch{return "other";}
 })();
 function storeFromLink(a){
  try{
   const host=new URL(a.href,location.href).hostname.toLowerCase();
   if(host==="pay.hotmart.com")return "checkout";
   if(host==="go.hotmart.com")return "hotmart";
   if(host==="meli.la"||host.endsWith(".mercadolivre.com.br")||host==="mercadolivre.com.br")return "mercado_livre";
   if(host==="s.shopee.com.br"||host==="shopee.com.br"||host.endsWith(".shopee.com.br"))return "shopee";
   if(host==="amzn.to"||host==="amazon.com.br"||host.endsWith(".amazon.com.br"))return "amazon";
   if(host==="s.click.aliexpress.com"||host==="aliexpress.com"||host.endsWith(".aliexpress.com"))return "aliexpress";
   return "";
  }catch{return "";}
 }
 function send(type,product="",store="other"){
  if(!allowed.has(type))return;
  const safeProduct=String(product).trim().slice(0,80);
  if(/@|https?:|www\.|\/|\\/.test(safeProduct))return;
  const body=JSON.stringify({type,source,product:safeProduct,store});
  try{
   if(navigator.sendBeacon){
    const blob=new Blob([body],{type:"application/json"});
    if(navigator.sendBeacon("/api/analytics/event",blob))return;
   }
   fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true,credentials:"omit"}).catch(()=>{});
  }catch{ /* Analytics must never interrupt shopping */ }
 }
 send("page_view");
 const productTitle=document.querySelector("[data-analytics-product]")?.getAttribute("data-analytics-product");
 if(productTitle)send("product_view",productTitle);
 document.addEventListener("click",function(event){
  const a=event.target?.closest?.("a[href]");
  if(!a)return;
  const store=storeFromLink(a);
  if(!store)return;
  const card=a.closest(".product-card,.digital-card,.book-card,.shopee-product");
  const product=card?.querySelector(".product-name,h3")?.textContent?.trim()||"";
  if(store==="checkout")send("course_checkout_click",product,"hotmart");
  else send("affiliate_outbound",product,store);
 },{capture:true,passive:true});
})();
