const {spawnSync}=require('node:child_process');
for(const args of [['--test','tests/conditioning.test.cjs'],['tests/verify-static-assets.cjs'],['tests/verify-storage-migration.cjs']]){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
