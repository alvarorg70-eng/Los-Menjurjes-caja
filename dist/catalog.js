/* Shared catalog validation: no network or browser dependency. Amounts are cents. */
(function(root){
  'use strict';
  const seeds=['vip','sencilla','mezcalita','paloma','clericot','agua','cafe'];
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
  const int=n=>Number.isSafeInteger(n)&&n>=0;
  function validateProduct(p){
    if(!p||!validId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!int(p.price)||p.price<=0||p.price>999999999)throw Error('Producto no válido: revisa nombre y precio.');
    if(p.active!==undefined&&typeof p.active!=='boolean')throw Error('Estado de producto no válido.');
    if(p.imageData!==undefined&&p.imageData!==null&&(!isImage(p.imageData)))throw Error('La foto del producto no es válida. Usa JPG, PNG o WebP.');
    if(!p.imageData&&!seeds.includes(p.id))throw Error('El producto nuevo necesita una fotografía guardada.');
    return p;
  }
  function isImage(s){return typeof s==='string'&&s.length<=4000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s)}
  function image(p){return p.imageData||('assets/'+p.id+'.jpg')}
  function saveProduct(state,p){
    validateProduct(p);
    if(state.products.some(x=>x.id!==p.id&&x.name.trim().toLocaleLowerCase('es-MX')===p.name.trim().toLocaleLowerCase('es-MX')))throw Error('Ya existe un producto con ese nombre. Edítalo en el catálogo.');
    const index=state.products.findIndex(x=>x.id===p.id);
    if(index<0)state.products.push(structuredClone(p));else state.products[index]={...state.products[index],...structuredClone(p)};
    return state;
  }
  function validateCatalog(products){
    if(!Array.isArray(products)||!products.length||products.length>500)throw Error('El catálogo debe contener entre 1 y 500 productos.');
    const ids=new Set();for(const p of products){validateProduct(p);if(ids.has(p.id))throw Error('El catálogo contiene productos duplicados.');ids.add(p.id)}
    return products;
  }
  function validateState(s){
    if(!s||s.version!==1||!Array.isArray(s.shifts)||!Array.isArray(s.sales)||!Array.isArray(s.moves))throw Error('Formato de respaldo no válido.');
    validateCatalog(s.products);const shifts=new Set(),saleIds=new Set(),folios=new Set(),moveIds=new Set();
    for(const sh of s.shifts){if(!validId(sh.id)||shifts.has(sh.id)||typeof sh.label!=='string'||!int(sh.fund)||!Number.isFinite(Date.parse(sh.at)))throw Error('Jornada no válida.');shifts.add(sh.id);if(sh.closed&&(!Number.isFinite(Date.parse(sh.closed))||!int(sh.counted)||!Number.isSafeInteger(sh.expected)))throw Error('Corte no válido.')}
    if(s.shifts.filter(sh=>!sh.closed).length>1)throw Error('Hay más de una caja abierta.');
    for(const v of s.sales){if(!validId(v.id)||saleIds.has(v.id)||folios.has(v.folio)||!shifts.has(v.shift)||!int(v.folio)||!v.folio||!Array.isArray(v.items)||!v.items.length||!int(v.total)||!int(v.paid)||!int(v.change)||v.paid-v.total!==v.change||!Number.isFinite(Date.parse(v.at)))throw Error('Venta no válida.');saleIds.add(v.id);folios.add(v.folio);let total=0;
      for(const i of v.items){if(!validId(i.id)||typeof i.name!=='string'||!i.name.trim()||!int(i.qty)||!i.qty||!int(i.price)||!i.price)throw Error('Producto vendido no válido.');total+=i.qty*i.price}
      if(total!==v.total||v.voided&&typeof v.voidReason!=='string')throw Error('Total de venta no válido.');
    }
    for(const m of s.moves){if(!validId(m.id)||moveIds.has(m.id)||!shifts.has(m.shift)||!int(m.amount)||!['in','out'].includes(m.kind)||typeof m.reason!=='string'||!Number.isFinite(Date.parse(m.at)))throw Error('Movimiento no válido.');moveIds.add(m.id)}
    return s;
  }
  function mergeCatalog(state,products){
    validateCatalog(products);
    for(const p of products)saveProduct(state,p);
    return state;
  }
  const api={validateProduct,validateCatalog,validateState,image,isImage,saveProduct,mergeCatalog};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MenjurjesCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
