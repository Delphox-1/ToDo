const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/planner/i18n-core.js'), 'utf8'), context);
module.exports = context.module.exports;
