"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function element(registry){
 return {textContent:"",value:"",style:{},children:[],listeners:{},parentElement:null,disabled:false,
  addEventListener(name,listener){this.listeners[name]=listener;},
  append(...nodes){this.children.push(...nodes);for(const n of nodes)if(n.id)registry.set(n.id,n);},
  replaceChildren(...nodes){this.children=[...nodes];},
  setAttribute(){},removeAttribute(){}
 };
}
test("filtro privado solicita 30 dias e atualiza os indicadores sem recarregar",async()=>{
 const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 const js=scripts.at(-1)?.[1];
 assert.ok(js,"Script da interface nao encontrado");
 new vm.Script(js);
 const registry=new Map();
 for(const id of ["period","views","products","outbound","course","sources","ranking","chart","filter-error","report-notice","report-kind"])
  registry.set(id,element(registry));
 const parent=element(registry);
 registry.get("chart").parentElement=parent;
 const document={getElementById:id=>registry.get(id)||null,createElement:()=>element(registry)};
 const first={simulation:false,days:7,metrics:{pageViews:2,productViews:1,outboundClicks:1,courseCheckoutClicks:0},daily:[{date:"2026-10-20",pageViews:2}],sources:[],products:[]};
 const next={simulation:false,days:30,metrics:{pageViews:21,productViews:8,outboundClicks:4,courseCheckoutClicks:2},daily:[{date:"2026-10-20",pageViews:21}],sources:[{name:"google",value:5}],products:[]};
 let called="";
 let fail=false;
 const fetch=async url=>{called=url;return fail?{ok:false}:{ok:true,json:async()=>next};};
 vm.runInNewContext(js,{window:{__demoReport:first},document,fetch}, {timeout:2000});
 assert.equal(registry.get("views").textContent,"2");
 assert.match(registry.get("report-kind").textContent,/DADOS AGREGADOS/);
 assert.match(registry.get("report-notice").textContent,/não representam vendas confirmadas/);
 assert.equal(registry.get("period").value,"7");
 registry.get("period").value="30";
 await registry.get("period").listeners.change();
 assert.equal(called,"/admin/report?days=30");
 assert.equal(registry.get("views").textContent,"21");
 assert.equal(registry.get("course").textContent,"2");
 assert.equal(registry.get("period").disabled,false);
 fail=true;
 registry.get("period").value="1";
 await registry.get("period").listeners.change();
 assert.equal(registry.get("period").value,"30");
 assert.match(registry.get("filter-error").textContent,/Não foi possível/);
});
