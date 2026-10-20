"use strict";
const {verifyAdminToken}=require("./admin-auth.cjs");
function authorizeReport(token,secret,days){
 if(!verifyAdminToken(token,secret))return {allowed:false,code:401};
 if(![1,7,30].includes(days))return {allowed:false,code:400};
 return {allowed:true,code:200};
}
module.exports={authorizeReport};
