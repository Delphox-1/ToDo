const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../self-hosted/public/planner/account-rules.js'),'utf8'),context);
module.exports=context.module.exports;
