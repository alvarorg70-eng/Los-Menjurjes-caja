const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
const handlers={},entries=new Map();let networkCalls=0;
const cache={async addAll(files){for(const f of files){const p=f==='./'?'index.html':f;entries.set(new URL(f,'https://caja.test/').href,new Response(fs.readFileSync('dist/'+p))) }},async match(req){const url=new URL(typeof req==='string'?req:req.url,'https://caja.test/');url.search='';return entries.get(url.href)?.clone()}};
const context={URL,Response,Promise,caches:{open:async()=>cache},fetch:async()=>{networkCalls++;throw Error('Network disabled for test')},self:{location:{origin:'https://caja.test'},addEventListener:(k,fn)=>handlers[k]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/sw.js','utf8'),context);
let pending;handlers.install({waitUntil:p=>pending=p});await pending;handlers.activate({waitUntil:p=>pending=p});await pending;
for(const path of ['/','/app.js','/catalog.js','/reset-data.js','/assets/vip.jpg','/assets/cafe.jpg']){let response;handlers.fetch({request:{method:'GET',url:'https://caja.test'+path,mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).status,200)}
assert.equal(networkCalls,0);let ready;handlers.message({data:{type:'CHECK'},ports:[{postMessage:v=>ready=v.ready}],waitUntil:p=>pending=p});await pending;assert.equal(ready,true);console.log('PASS: service worker sirve app, catálogo y fotografías con red deshabilitada en simulación; preparación completa.');
})().catch(e=>{console.error(e);process.exit(1)});
