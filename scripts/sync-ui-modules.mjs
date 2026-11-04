import {copyFile} from 'node:fs/promises';
// Edit these shared modules in public/planner; other modes receive identical copies.
for (const name of ['date-tools','sample-data','schedule-view','trash-view']) {
 await copyFile(new URL('../public/planner/'+name+'.js',import.meta.url),new URL('../self-hosted/public/planner/'+name+'.js',import.meta.url));
}
