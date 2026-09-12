// Static production package; includes only runtime assets, never test fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist');
const assets=['index.html','styles.css','app.js','forge90-base-app.js','forge90-session-controls.js','forge90-storage.js','forge90-enhancements.js','forge90-weight.js','forge90-conditioning-core.js','forge90-measurements.js','forge90-progression-core.js','forge90-conditioning.js','sw.js','manifest.webmanifest','_redirects','vendor/dexie.min.js','vendor/DEXIE-LICENSE.txt','icons/icon-192.png','icons/icon-512.png','icons/forge90-logo.png'];
const manifest={};
for(const asset of assets){const content=fs.readFileSync(path.join(root,asset));if(asset.endsWith('.js'))new vm.Script(content.toString(),{filename:asset});const target=path.join(dest,asset);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);manifest[asset]=crypto.createHash('sha256').update(content).digest('hex');}
fs.writeFileSync(path.join(dest,'asset-checksums.json'),JSON.stringify(manifest,null,2));console.log('PRODUCTION_STATIC_BUILD=PASS ('+assets.length+' runtime assets; syntax validated)');
