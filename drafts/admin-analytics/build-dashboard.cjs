"use strict";
// Monta HTML de demonstração com relatório obtido do adaptador Node.
// Não usa rede nem dados reais; somente execução local em ambiente de teste.
const fs=require("node:fs");
const path=require("node:path");
const {buildDemoReport,syntheticEvents}=require("./dashboard-adapter.cjs");
function createDemoDashboard(reportOverride){
 const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
 const report=reportOverride||buildDemoReport(syntheticEvents());
 const json=JSON.stringify(report).replace(/</g,"\\u003c");
 const tag="<script>window.__demoReport="+json+";</script>";
 if(!html.includes("</head>"))throw Error("Template incompleto");
 return html.replace("</head>",tag+"</head>");
}
if(require.main===module)process.stdout.write(createDemoDashboard());
module.exports={createDemoDashboard};
