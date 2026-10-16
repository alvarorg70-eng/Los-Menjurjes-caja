const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../dist/catalog.js'),R=require('../dist/reset-data.js');
const original=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])).state:{version:1,products:[['vip','Michelada VIP',13000],['sencilla','Michelada sencilla',10000],['mezcalita','Mezcalita',8000],['paloma','Paloma',8000],['clericot','Clericot',8000],['agua','Botella de agua',1000],['cafe','Café',2500]].map(([id,name,price])=>({id,name,price})),shifts:[{id:'test_shift',label:'Prueba',at:'2026-10-16T10:00:00Z',fund:50000}],sales:Array.from({length:5},(_,i)=>({id:'test_sale_'+i,folio:i+1,shift:'test_shift',at:'2026-10-16T10:00:00Z',items:[{id:'vip',name:'Michelada VIP',price:13000,qty:1}],total:13000,paid:20000,change:7000})),moves:[],backupAt:null};
C.validateState(original);const state=structuredClone(original);const historical=JSON.stringify(state.sales);
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMRAAAAAASUVORK5CYII=';
C.saveProduct(state,{id:'p_rusa',name:'Rusa',price:6500,active:true,imageData:photo});
assert.equal(state.products.length,8);assert.equal(C.image(state.products.at(-1)),photo);assert.equal(JSON.stringify(state.sales),historical);
C.saveProduct(state,{...state.products.at(-1),name:'Rusa especial',price:7000,active:false});assert.equal(state.products.length,8);assert.equal(state.products.filter(p=>p.active!==false).length,7);assert.equal(JSON.stringify(state.sales),historical);
assert.throws(()=>C.saveProduct(state,{id:'p_other',name:'Café',price:2500,imageData:photo}),/Ya existe/);
assert.throws(()=>C.saveProduct(state,{id:'bad',name:'Sin foto',price:100}),/fotografía/);
assert.throws(()=>C.saveProduct(state,{id:'bad',name:'Malo',price:-1,imageData:photo}),/precio/);
assert.throws(()=>C.saveProduct(state,{id:'bad',name:'Malo',price:100,imageData:'https://image.example/x'}),/foto/);
assert.throws(()=>C.validateCatalog([...state.products,state.products[0]]),/duplicados/);
// Historical receipts survive product renaming, price changes and disable.
C.saveProduct(state,{...state.products[0],name:'Botanera VIP',price:15000,active:false});C.validateState(state);assert.equal(JSON.stringify(state.sales),historical);
// New sales and their photos round-trip with the complete local state.
const p=state.products.find(p=>p.id==='p_rusa');state.sales.push({id:'sale_new',folio:6,shift:state.shifts[0].id,at:new Date().toISOString(),items:[{id:p.id,name:p.name,price:p.price,qty:2}],total:14000,paid:20000,change:6000});
const portable=JSON.parse(JSON.stringify(state));C.validateState(portable);assert.deepEqual(portable,state);
const dest=structuredClone(original),beforeSales=JSON.stringify(dest.sales);C.mergeCatalog(dest,[p]);assert.equal(dest.products.length,8);assert.equal(JSON.stringify(dest.sales),beforeSales);C.validateState(dest);
// Reset just the open shift; retain prices, photo bytes, fund and movements.
const snapshot=R.snapshot(dest,new Date().toISOString()),before=structuredClone(dest);R.clear(dest);assert.equal(dest.sales.length,0);assert.deepEqual(dest.products,before.products);assert.deepEqual(dest.shifts,before.shifts);assert.deepEqual(dest.moves,before.moves);assert.equal(dest.shifts[0].fund,50000);R.recover(dest,snapshot);assert.deepEqual(dest,before);
const closed=structuredClone(original);closed.shifts.push({id:'older',at:new Date().toISOString(),closed:new Date().toISOString(),label:'Anterior',fund:0,counted:100,expected:100});closed.sales.push({id:'sale_old',folio:99,shift:'older',total:100});R.clear(closed);assert.deepEqual(closed.sales,[{id:'sale_old',folio:99,shift:'older',total:100}]);
const hasNew=structuredClone(before),snap=R.snapshot(hasNew,new Date().toISOString());R.clear(hasNew);hasNew.sales.push({...before.sales[0],id:'different'});assert.throws(()=>R.recover(hasNew,snap),/ventas nuevas/);
// Browser script wires all required element ids and is syntactically valid.
const app=fs.readFileSync('dist/app.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const [,id]of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(id),'Missing DOM id: '+id);
const sw=fs.readFileSync('dist/sw.js','utf8');const swScope={self:{addEventListener(){}}};vm.createContext(swScope);vm.runInContext(sw+';globalThis.precache=FILES;',swScope);for(const f of swScope.precache)if(f!=='./')assert.ok(fs.existsSync('dist/'+f),'Missing offline file: '+f);assert.ok(swScope.precache.includes('catalog.js'));assert.ok(swScope.precache.includes('reset-data.js'));
console.log('PASS: respaldo real compatible; altas con foto/precio; edición y desactivación; recibos históricos intactos; importación de catálogo sin tocar ventas; exportación JSON; limpieza y recuperación; bloqueo ante nuevas ventas; elementos de pantalla y archivos offline completos.');
