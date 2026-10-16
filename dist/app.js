'use strict';
const PRODUCTS=[['vip','Michelada VIP',130],['sencilla','Michelada sencilla',100],['mezcalita','Mezcalita',80],['paloma','Paloma',80],['clericot','Clericot',80],['agua','Botella de agua',10],['cafe','Café',25]].map(([id,name,price])=>({id,name,price:price*100}));
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(n/100), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function amount(s){if(!/^\d{1,7}(\.\d{1,2})?$/.test(String(s).trim()))throw Error('Captura un importe válido, con máximo dos decimales.');return Math.round(Number(s)*100)}
function summary(s,id){const sales=s.sales.filter(v=>v.shift===id&&!v.voided),sh=s.shifts.find(v=>v.id===id),mov=s.moves.filter(v=>v.shift===id);const total=sales.reduce((n,v)=>n+v.total,0),net=mov.reduce((n,v)=>n+(v.kind==='in'?v.amount:-v.amount),0);return {sales,total,expected:(sh?.fund||0)+total+net,mov};}
let db,state,cart={},busy=false;
const initial=()=>({version:1,products:PRODUCTS,shifts:[],sales:[],moves:[],backupAt:null});
function transact(change){return new Promise((resolve,reject)=>{const tx=db.transaction('data',change?'readwrite':'readonly'),st=tx.objectStore('data');let next;const req=st.get('state');req.onsuccess=()=>{try{next=req.result||initial();if(change){change(next);st.put(next,'state')}}catch(e){tx.abort();reject(e)}};tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error||Error('No se pudieron guardar los datos.'));tx.onabort=()=>reject(tx.error||Error('No se guardó el cambio.'));});}
async function mutate(fn){state=await transact(fn);render();}
function active(s=state){return s.shifts.find(x=>!x.closed)}
function message(s){$('notice').textContent=s}
function modal(title,html){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=html;$('dialog').showModal()}
function total(){return Object.entries(cart).reduce((n,[id,q])=>n+state.products.find(p=>p.id===id).price*q,0)}
function drawCart(){const entries=Object.entries(cart).filter(([,q])=>q>0);$('cart').innerHTML=entries.length?entries.map(([id,q])=>{const p=state.products.find(p=>p.id===id);return `<div class="line"><span class="name">${esc(p.name)}</span><button data-minus="${id}" aria-label="Quitar ${esc(p.name)}">−</button><b>${q}</b><button data-plus="${id}" aria-label="Agregar ${esc(p.name)}">+</button><strong>${money(q*p.price)}</strong></div>`}).join(''):'<p class="subtle">Toca una fotografía para comenzar.</p>';$('total').textContent=money(total());drawPayment();}
function drawPayment(){let paid=0,valid=true;try{paid=amount($('paid').value||'0')}catch{valid=false}const diff=paid-total();$('changeLabel').textContent=diff<0?'Faltan':'Cambio';$('change').textContent=valid&&total()>0?money(Math.abs(diff)):'—';$('charge').disabled=busy||!active()||!valid||!total()||diff<0;}
function render(){const sh=active();$('shiftLabel').textContent=sh?'Caja abierta':'Abre la caja para cobrar';$('products').innerHTML=state.products.filter(p=>p.active!==false).map(p=>`<button class="product ${p.id==='agua'?'water':''}" data-product="${p.id}"><img src="${esc(MenjurjesCatalog.image(p))}" alt="${esc(p.name)}"><div class="info"><b>${esc(p.name)}</b><strong>${money(p.price)}</strong></div></button>`).join('');drawCart();drawHistory();drawCash();drawCatalog();updateImportStatus();$('prices').innerHTML=state.products.map(p=>`<div class="price"><label for="price-${p.id}">${esc(p.name)}</label><input id="price-${p.id}" name="${p.id}" value="${p.price/100}" inputmode="decimal" required></div>`).join('')+'<button class="primary">Guardar precios</button>';updateResetStatus();$('lastBackup').textContent=state.backupAt?'Última copia exportada: '+new Date(state.backupAt).toLocaleString('es-MX'):'Todavía no has exportado un respaldo.';}
function drawHistory(){const sel=$('historyShift'),selected=sel.value;sel.innerHTML='<option value="all">Todas las jornadas</option>'+[...state.shifts].reverse().map(sh=>`<option value="${sh.id}">${esc(sh.label)}${sh.closed?' · Cerrada':' · Abierta'}</option>`).join('');if([...sel.options].some(o=>o.value===selected))sel.value=selected;const list=state.sales.filter(s=>sel.value==='all'||s.shift===sel.value).slice().reverse();$('sales').innerHTML=list.length?list.map(s=>`<div class="panel ${s.voided?'cancelled':''}"><div class="heading"><b>Venta #${s.folio} · ${new Date(s.at).toLocaleString('es-MX')}</b><strong>${money(s.total)}</strong></div><p>${s.items.map(i=>`${i.qty} × ${esc(i.name)} (${money(i.price)})`).join(' · ')}</p><p class="subtle">Recibido ${money(s.paid)} · Cambio ${money(s.change)}</p>${s.voided?`<p>Cancelada: ${esc(s.voidReason)}</p>`:(!state.shifts.find(sh=>sh.id===s.shift)?.closed?`<button data-void="${s.id}">Cancelar venta y registrar devolución</button>`:'')}</div>`).join(''):'<div class="panel">Aún no hay ventas en esta selección.</div>';}
function rows(sh){const a=summary(state,sh.id),units={};a.sales.forEach(s=>s.items.forEach(i=>{units[i.id]??={name:i.name,qty:0,total:0};units[i.id].qty+=i.qty;units[i.id].total+=i.price*i.qty}));return `<div class="stats"><div class="stat">Ventas netas<strong>${money(a.total)}</strong></div><div class="stat">Ventas cobradas<strong>${a.sales.length}</strong></div><div class="stat">Efectivo esperado<strong>${money(a.expected)}</strong></div></div><div class="panel"><p>Fondo inicial: <b>${money(sh.fund)}</b></p><div class="tablewrap"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Importe</th></tr></thead><tbody>${Object.values(units).map(u=>`<tr><td>${esc(u.name)}</td><td>${u.qty}</td><td>${money(u.total)}</td></tr>`).join('')||'<tr><td colspan="3">Sin ventas</td></tr>'}</tbody></table></div></div><div class="panel"><h3>Movimientos de efectivo</h3>${a.mov.map(m=>`<p>${m.kind==='in'?'Entrada':'Salida'} ${money(m.amount)} · ${esc(m.reason)}</p>`).join('')||'<p class="subtle">Sin movimientos.</p>'}</div>`;}
function drawCash(){const sh=active();$('cash').innerHTML=sh?`<p>${esc(sh.label)} · Apertura ${new Date(sh.at).toLocaleString('es-MX')}</p>${rows(sh)}<form id="movement" class="panel"><h3>Registrar entrada o salida</h3><div class="row"><div><label>Tipo</label><select name="kind"><option value="out">Salida / retiro</option><option value="in">Entrada</option></select></div><div><label>Importe (MXN)</label><input name="amount" inputmode="decimal" required></div><div><label>Motivo</label><input name="reason" maxlength="200" required></div><button>Guardar movimiento</button></div></form><form id="closeShift" class="panel"><h3>Cerrar caja</h3><label>Efectivo contado (incluye fondo para cambio)</label><input name="counted" inputmode="decimal" required><p>Se guardará el corte y no se podrán modificar las ventas de esta jornada.</p><button class="primary">Contar y cerrar jornada</button></form>`:`<form id="openShift" class="panel"><h3>Abrir una jornada</h3><label>Nombre de la jornada</label><input name="label" value="Feria · ${new Date().toLocaleDateString('es-MX')}" maxlength="100" required><label>Fondo inicial para dar cambio (MXN)</label><input name="fund" inputmode="decimal" placeholder="Ejemplo: 500" required><button class="primary">Abrir caja</button></form>`;$('cash').innerHTML+=state.shifts.filter(s=>s.closed).slice().reverse().map(sh=>`<details class="panel"><summary>${esc(sh.label)} · Corte cerrado · Diferencia ${money(sh.counted-sh.expected)}</summary>${rows(sh)}<p>Contado: <b>${money(sh.counted)}</b> · Diferencia: <b>${money(sh.counted-sh.expected)}</b></p></details>`).join('');}
function switchTab(id){document.querySelectorAll('.tab').forEach(t=>t.hidden=t.id!==id);document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab)switchTab(b.dataset.tab);const id=b.dataset.product||b.dataset.plus||b.dataset.minus;if(id){if(busy)return;if(state.products.find(p=>p.id===id)?.active===false&&!b.dataset.minus){message('Este producto está desactivado.');return}if(!active()){switchTab('caja');message('Registra el fondo inicial y abre la caja.');return}cart[id]=Math.max(0,(cart[id]||0)+(b.dataset.minus?-1:1));if(!cart[id])delete cart[id];$('paid').value='';drawCart();}if(b.dataset.void){const reason=prompt('Motivo de cancelación (se registra la devolución completa):');if(!reason?.trim())return;try{await mutate(s=>{const v=s.sales.find(v=>v.id===b.dataset.void);if(v.voided||s.shifts.find(sh=>sh.id===v.shift).closed)throw Error('Esta venta ya no puede cancelarse.');v.voided=new Date().toISOString();v.voidReason=reason.trim().slice(0,200)});message('Cancelación y devolución registradas.')}catch(e){message(e.message)}}});
$('clear').onclick=()=>{if(busy)return;if(Object.keys(cart).length&&!confirm('¿Vaciar el pedido sin registrar una venta?'))return;cart={};$('paid').value='';drawCart()};$('paid').oninput=drawPayment;
$('quick').innerHTML=[50,100,200,500].map(n=>`<button type="button" data-paid="${n}">$${n}</button>`).join('');$('quick').onclick=e=>{if(e.target.dataset.paid){$('paid').value=e.target.dataset.paid;drawPayment()}};
$('keys').innerHTML=['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k=>`<button type="button" data-key="${k}" aria-label="${k==='⌫'?'Borrar último dígito':k}">${k}</button>`).join('')+'<button type="button" data-key="exact" style="grid-column:1/-1;font-size:14px">Pago exacto</button>';$('keys').onclick=e=>{const k=e.target.dataset.key;if(!k)return;let v=$('paid').value;if(k==='exact')v=String(total()/100);else if(k==='⌫')v=v.slice(0,-1);else if(k==='.'&&!v.includes('.'))v=(v||'0')+'.';else if(k!=='.')v+=k;$('paid').value=v;drawPayment()};
$('charge').onclick=async()=>{if(busy)return;busy=true;drawPayment();try{const paid=amount($('paid').value),items=Object.entries(cart).map(([id,qty])=>(()=>{const p=state.products.find(p=>p.id===id);return {id:p.id,name:p.name,price:p.price,qty}})()),sum=items.reduce((n,i)=>n+i.price*i.qty,0);if(!sum||paid<sum)throw Error('Revisa el pedido y el efectivo recibido.');const shiftId=active()?.id;await mutate(s=>{if(active(s)?.id!==shiftId||!shiftId)throw Error('La caja debe estar abierta.');s.sales.push({id:crypto.randomUUID(),folio:Math.max(0,...s.sales.map(v=>v.folio))+1,shift:shiftId,at:new Date().toISOString(),items,total:sum,paid,change:paid-sum})});cart={};$('paid').value='';drawCart();message('Venta guardada.');modal('Venta guardada',`<p>Total: <b>${money(sum)}</b></p><p>Cambio a entregar</p><h2 style="font-size:44px;color:#123e2e">${money(paid-sum)}</h2>`);}catch(e){message('No se confirmó la venta: '+e.message)}finally{busy=false;drawPayment()}};
$('historyShift').onchange=drawHistory;
document.addEventListener('submit',async e=>{if(!['openShift','movement','closeShift','prices'].includes(e.target.id))return;e.preventDefault();const f=new FormData(e.target);try{if(e.target.id==='openShift'){const fund=amount(f.get('fund')),label=String(f.get('label')).trim();if(!label)throw Error('Escribe el nombre de la jornada.');await mutate(s=>{if(active(s))throw Error('Ya hay una caja abierta.');s.shifts.push({id:crypto.randomUUID(),label,fund,at:new Date().toISOString()})});message('Caja abierta.');switchTab('venta')}if(e.target.id==='movement'){const a=amount(f.get('amount')),reason=String(f.get('reason')).trim(),kind=f.get('kind'),id=active()?.id;if(!a||!reason)throw Error('Captura importe y motivo.');await mutate(s=>{if(active(s)?.id!==id)throw Error('La caja no está abierta.');if(kind==='out'&&a>summary(s,id).expected)throw Error('La salida supera el efectivo esperado.');s.moves.push({id:crypto.randomUUID(),shift:id,at:new Date().toISOString(),kind,amount:a,reason})});message('Movimiento guardado.')}if(e.target.id==='closeShift'){if(Object.keys(cart).length)throw Error('Termina o vacía el pedido antes de cerrar.');const counted=amount(f.get('counted')),id=active()?.id,expected=summary(state,id).expected;if(!confirm(`Esperado: ${money(expected)}\nContado: ${money(counted)}\nDiferencia: ${money(counted-expected)}\n¿Cerrar jornada?`))return;await mutate(s=>{const sh=active(s);if(sh?.id!==id)throw Error('Esta caja ya se cerró.');sh.closed=new Date().toISOString();sh.counted=counted;sh.expected=summary(s,id).expected});message('Corte guardado. Exporta un respaldo antes de terminar.')}if(e.target.id==='prices'){if(Object.keys(cart).length)throw Error('Vacía o cobra el pedido antes de cambiar precios.');const prices=state.products.map(p=>({id:p.id,price:amount(f.get(p.id))}));if(prices.some(p=>p.price<=0))throw Error('Todos los precios deben ser mayores que cero.');await mutate(s=>prices.forEach(p=>s.products.find(x=>x.id===p.id).price=p.price));message('Precios actualizados.')}}catch(err){message(err.message)}});
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('backup').onclick=()=>exportBackup(false);
$('catalogBackup').onclick=()=>exportBackup(true);
$('csv').onclick=()=>{const rows=[['Folio','Fecha','Jornada','Estado','Producto','Cantidad','Precio MXN','Subtotal MXN','Total venta MXN','Recibido MXN','Cambio MXN','Motivo cancelación']];state.sales.forEach(s=>s.items.forEach(i=>rows.push([s.folio,new Date(s.at).toLocaleString('es-MX'),state.shifts.find(sh=>sh.id===s.shift).label,s.voided?'Cancelada':'Cobrada',i.name,i.qty,i.price/100,i.qty*i.price/100,s.total/100,s.paid/100,s.change/100,s.voidReason||''])));download('\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n'),`Menjurjes-ventas-${Date.now()}.csv`,'text/csv;charset=utf-8')};
function validate(s){return MenjurjesCatalog.validateState(s)}
$('restore').onchange=handleImport;
async function prepare(){try{if(!('serviceWorker' in navigator))throw Error('Este navegador no admite preparación sin conexión.');await navigator.serviceWorker.register('sw.js');const reg=await navigator.serviceWorker.ready;const worker=reg.active;if(!worker)throw Error('La preparación sigue en curso.');const channel=new MessageChannel();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No se confirmó la preparación. Abre con internet y vuelve a intentar.')),12000);channel.port1.onmessage=e=>{clearTimeout(timer);e.data.ready?resolve():reject(Error('Faltan archivos para trabajar sin internet.'))};worker.postMessage({type:'CHECK'},[channel.port2])});$('offline').textContent=navigator.onLine?'Lista sin internet':'Sin internet · Listo';$('storage').textContent='Archivos de la app verificados. Falta la prueba en modo avión en este equipo.';if(navigator.storage?.persist){const persisted=await navigator.storage.persist();if(!persisted)$('storage').textContent+=' Guarda respaldos para proteger tus ventas.'}}catch(e){$('offline').textContent='Preparación pendiente';$('storage').textContent=e.message}}
$('prepare').onclick=prepare;window.addEventListener('online',prepare);window.addEventListener('offline',prepare);
const req=indexedDB.open('menjurjes-caja',1);req.onupgradeneeded=()=>req.result.createObjectStore('data');req.onerror=()=>{message('No se pudo abrir el almacenamiento. No uses navegación privada. No se pueden cobrar ventas.');$('charge').disabled=true};req.onsuccess=async()=>{db=req.result;try{state=await transact();render();if(!active())message('Comienza abriendo la caja con tu fondo para cambio.');prepare()}catch(e){message('No se pudieron leer los datos: '+e.message)}};

async function resetTransaction(action){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('data','readwrite'),store=tx.objectStore('data');
    let next,error;
    const request=store.get('state');
    request.onsuccess=()=>{
      next=request.result||initial();
      if(action==='clear'){
        try{
          if(!active(next))throw Error('No hay una caja abierta.');
          store.put(MenjurjesReset.snapshot(next,new Date().toISOString()),'beforeTrialReset');
          MenjurjesReset.clear(next);store.put(next,'state');
        }catch(e){error=e;tx.abort()}
      }else{
        const backup=store.get('beforeTrialReset');
        backup.onsuccess=()=>{
          try{MenjurjesReset.recover(next,backup.result);store.put(next,'state');store.delete('beforeTrialReset')}
          catch(e){error=e;tx.abort()}
        };
      }
    };
    tx.oncomplete=()=>resolve(next);
    tx.onerror=()=>reject(error||tx.error||Error('No se pudo guardar el cambio.'));
    tx.onabort=()=>reject(error||tx.error||Error('La operación se canceló; no se cambiaron los datos.'));
  });
}
async function updateResetStatus(){
  try{
    const copy=await new Promise((resolve,reject)=>{const tx=db.transaction('data','readonly');const r=tx.objectStore('data').get('beforeTrialReset');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    $('recoverReset').disabled=!copy||active()?.id!==copy.shiftId||state.sales.some(s=>s.shift===copy.shiftId);
    $('resetStatus').textContent=copy?'Copia local anterior al borrado: '+new Date(copy.at).toLocaleString('es-MX')+'. Solo se puede recuperar antes de cobrar otra venta o cerrar esta caja.':'Todavía no hay un borrado que recuperar.';
  }catch(e){$('recoverReset').disabled=true;$('resetStatus').textContent='No se pudo consultar la copia de recuperación.'}
}
$('resetTrials').onclick=async()=>{
  if(busy)return;
  try{
    if(Object.keys(cart).length)throw Error('Cobra o vacía el pedido antes de limpiar la caja.');
    if(!active()||!state.sales.some(s=>s.shift===active().id))throw Error('La caja abierta no tiene ventas que borrar.');
    const answer=prompt('Esto borrará TODAS las ventas de la caja abierta. Úsalo únicamente si todas son de prueba. Conserva el fondo inicial, movimientos de efectivo, catálogo y jornadas cerradas. Guarda primero tu respaldo JSON. Para confirmar escribe: BORRAR PRUEBAS');
    if(answer!=='BORRAR PRUEBAS'){message('No se borraron datos.');return}
    busy=true;drawPayment();
    state=await resetTransaction('clear');cart={};$('paid').value='';render();
    message('Ventas de prueba borradas. Se conservaron el fondo inicial, los movimientos de efectivo y el catálogo.');
    switchTab('caja');
  }catch(e){message(e.message)}finally{busy=false;drawPayment();updateResetStatus()}
};
$('recoverReset').onclick=async()=>{
  if(busy)return;
  try{
    if(Object.keys(cart).length)throw Error('Vacía el pedido antes de recuperar datos.');
    if(!confirm('¿Recuperar las ventas anteriores al último borrado? Solo es posible antes de cobrar otra venta o cerrar esta caja.'))return;
    busy=true;drawPayment();state=await resetTransaction('recover');render();
    message('Se recuperaron las ventas anteriores al borrado.');
  }catch(e){message(e.message)}finally{busy=false;drawPayment();updateResetStatus()}
};

let productImage=null,photoReading=false,photoToken=0;
function drawCatalog(){
  $('catalogList').innerHTML=state.products.map(p=>`<div class="catalog-row ${p.active===false?'inactive':''}"><img src="${esc(MenjurjesCatalog.image(p))}" alt="${esc(p.name)}"><div class="catalog-name"><b>${esc(p.name)}</b><small>${money(p.price)} · ${p.active===false?'Desactivado':'Activo'}</small></div><div class="catalog-actions"><button type="button" data-edit-product="${esc(p.id)}">Editar</button><button type="button" data-toggle-product="${esc(p.id)}">${p.active===false?'Activar':'Desactivar'}</button></div></div>`).join('');
}
function catalogMayChange(){if(busy)throw Error('Espera a que termine la operación.');if(Object.keys(cart).length)throw Error('Cobra o vacía el pedido antes de modificar el catálogo.');}
function showProduct(id){
  try{
    catalogMayChange();const p=id?state.products.find(x=>x.id===id):null;
    photoToken++;photoReading=false;productImage=p?.imageData||null;
    $('productForm').reset();$('productId').value=p?.id||'';$('productName').value=p?.name||'';$('productPrice').value=p?p.price/100:'';$('productActive').checked=p?.active!==false;
    $('productPhoto').required=!p;$('productTitle').textContent=p?'Editar producto':'Agregar producto';$('productError').textContent='';$('saveProduct').disabled=false;
    $('productPreview').hidden=!p;if(p)$('productPreview').src=MenjurjesCatalog.image(p);else $('productPreview').removeAttribute('src');
    $('productDialog').showModal();$('productName').focus();
  }catch(e){message(e.message)}
}
$('addProduct').onclick=()=>showProduct();$('cancelProduct').onclick=()=>{$('productDialog').close();photoToken++};
$('productDialog').addEventListener('cancel',()=>{photoToken++});
function readDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo leer la foto.'));r.readAsDataURL(blob)})}
async function photoData(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Elige una fotografía JPG, PNG o WebP.');
  if(file.size>15*1024*1024)throw Error('La foto supera 15 MB. Elige una copia de menor tamaño.');
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('La fotografía no se pudo abrir.'));i.src=url});
    const scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la foto.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.85);if(!MenjurjesCatalog.isImage(data))throw Error('No se pudo guardar la fotografía.');return data;
  }finally{URL.revokeObjectURL(url)}
}
$('productPhoto').onchange=async e=>{
  const file=e.target.files[0],token=++photoToken;if(!file)return;
  photoReading=true;$('saveProduct').disabled=true;$('productError').textContent='Preparando fotografía…';
  try{const result=await photoData(file);if(token!==photoToken)return;productImage=result;$('productPreview').src=result;$('productPreview').hidden=false;$('productError').textContent='';}
  catch(e){if(token!==photoToken)return;productImage=null;$('productPhoto').value='';$('productError').textContent=e.message;}
  finally{if(token===photoToken){photoReading=false;$('saveProduct').disabled=false}}
};
$('productForm').onsubmit=async e=>{
  e.preventDefault();try{
    catalogMayChange();if(photoReading)throw Error('Espera a que termine de prepararse la foto.');
    const existingId=$('productId').value,id=existingId||'p_'+crypto.randomUUID();const p={id,name:$('productName').value.trim(),price:amount($('productPrice').value),active:$('productActive').checked};
    if(productImage)p.imageData=productImage;MenjurjesCatalog.validateProduct(p);
    busy=true;$('saveProduct').disabled=true;drawPayment();
    await mutate(s=>{if(existingId&&!s.products.some(x=>x.id===existingId))throw Error('No se encontró el producto original.');MenjurjesCatalog.saveProduct(s,p)});
    $('productDialog').close();photoToken++;message(p.active?'Producto guardado. Ya aparece en Cobrar y está disponible sin internet en este dispositivo.':'Producto guardado como desactivado.');
  }catch(e){$('productError').textContent=e.message}
  finally{busy=false;$('saveProduct').disabled=false;drawPayment()}
};
$('catalogList').onclick=async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.editProduct)showProduct(b.dataset.editProduct);
  if(b.dataset.toggleProduct)try{catalogMayChange();busy=true;drawPayment();await mutate(s=>{const p=s.products.find(p=>p.id===b.dataset.toggleProduct);if(!p)throw Error('No se encontró el producto.');p.active=p.active===false});message('Disponibilidad actualizada. El historial de ventas se conserva.');}catch(e){message(e.message)}finally{busy=false;drawPayment()}
};
async function portableProducts(products){
  const result=[];
  for(const p of products){const copy=structuredClone(p);if(!copy.imageData){const response=await fetch(MenjurjesCatalog.image(copy));if(!response.ok)throw Error('No se pudo incluir la foto de '+copy.name+'. Prepara primero la app sin internet.');const blob=await response.blob();copy.imageData=await readDataURL(blob);if(!MenjurjesCatalog.isImage(copy.imageData))throw Error('La foto de '+copy.name+' no es válida.')}result.push(copy)}
  return result;
}
async function exportBackup(catalogOnly){
  if(busy)return;busy=true;drawPayment();
  try{
    const current=await transact(),products=await portableProducts(current.products),at=new Date().toISOString();
    const content=catalogOnly?{app:'menjurjes-caja',kind:'catalog',exportedAt:at,products}:{app:'menjurjes-caja',kind:'full',exportedAt:at,state:{...current,products,backupAt:at}};
    download(JSON.stringify(content,null,2),`Menjurjes-${catalogOnly?'catalogo':'respaldo'}-${Date.now()}.json`,'application/json');
    message('Archivo exportado con las fotos. Comprueba que se guardó en Archivos o Descargas.');
    // Backup metadata only; never overwrite newer sales with the exported snapshot.
    await mutate(s=>s.backupAt=at);
  }catch(e){message('No se completó el respaldo: '+e.message)}finally{busy=false;drawPayment()}
}
async function importTransaction(incoming,mode,expected){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('data','readwrite'),store=tx.objectStore('data');let next,error;const req=store.get('state');
    req.onsuccess=()=>{try{
      const current=req.result||initial();if(JSON.stringify(current)!==expected)throw Error('Los datos cambiaron mientras revisabas el archivo. Vuelve a seleccionarlo.');
      next=structuredClone(current);if(mode==='catalog')MenjurjesCatalog.mergeCatalog(next,incoming);else next=structuredClone(incoming);
      validate(next);store.put({at:new Date().toISOString(),before:current,after:JSON.stringify(next)},'beforeImport');store.put(next,'state');
    }catch(e){error=e;tx.abort()}};
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(error||tx.error||Error('No se pudo importar.'));tx.onabort=()=>reject(error||tx.error||Error('Importación cancelada; datos anteriores conservados.'));
  });
}
async function handleImport(e){
  const file=e.target.files[0];if(!file)return;
  try{
    catalogMayChange();if(file.size>40*1024*1024)throw Error('El archivo supera 40 MB.');
    const v=JSON.parse(await file.text());if(v.app!=='menjurjes-caja')throw Error('El archivo no es un respaldo de Los Menjurjes.');
    const mode=$('restoreMode').value,current=await transact(),expected=JSON.stringify(current);
    let incoming;
    if(mode==='catalog'){
      incoming=v.kind==='catalog'?v.products:v.state?.products;MenjurjesCatalog.validateCatalog(incoming);
      const added=incoming.filter(p=>!current.products.some(x=>x.id===p.id)).length;
      const preview=structuredClone(current);MenjurjesCatalog.mergeCatalog(preview,incoming);
      if(!confirm(`Importar catálogo:\n${added} productos nuevos y ${incoming.length-added} productos a actualizar (nombre, precio, foto y disponibilidad).\nSe conservarán los demás productos y todas las ventas.\n¿Continuar?`))return;
    }else{
      if(!v.state)throw Error('Este archivo solo contiene catálogo. Elige importar solo catálogo.');incoming=validate(v.state);
      const answer=prompt(`Restaurar TODA LA CAJA: reemplazará los ${current.products.length} productos y ${current.sales.length} ventas actuales por ${incoming.products.length} productos y ${incoming.sales.length} ventas del respaldo. Guarda primero una copia externa. Se conservará una copia local para deshacer.\nEscribe RESTAURAR para confirmar:`);
      if(answer!=='RESTAURAR'){message('No se importaron datos.');return}
    }
    busy=true;drawPayment();state=await importTransaction(incoming,mode,expected);cart={};$('paid').value='';render();message(mode==='catalog'?'Catálogo importado. Ventas conservadas.':'Caja restaurada. Conservamos una copia local anterior para deshacer.');
  }catch(err){message('No se importó: '+err.message)}finally{busy=false;drawPayment();$('restore').value='';updateImportStatus()}
}
async function updateImportStatus(){
  try{const copy=await new Promise((resolve,reject)=>{const tx=db.transaction('data','readonly'),r=tx.objectStore('data').get('beforeImport');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const unchanged=copy&&JSON.stringify(state)===copy.after;$('undoImport').disabled=!unchanged;
    $('importStatus').textContent=copy?(unchanged?'Puedes deshacer la importación del '+new Date(copy.at).toLocaleString('es-MX')+'.':'Se conserva una copia local previa a la importación. Ya hay cambios posteriores; no se permite deshacer encima de ellos.'):'La importación guarda una copia local anterior. Solo se puede deshacer antes de registrar nuevos cambios.';
  }catch{$('undoImport').disabled=true}
}
$('undoImport').onclick=async()=>{
  try{catalogMayChange();if(!confirm('¿Deshacer la última importación y recuperar el estado anterior?'))return;busy=true;drawPayment();
    state=await new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite'),st=tx.objectStore('data');let result,error;const a=st.get('state');a.onsuccess=()=>{const b=st.get('beforeImport');b.onsuccess=()=>{try{const copy=b.result;if(!copy||JSON.stringify(a.result)!==copy.after)throw Error('Ya hay cambios posteriores. No se pueden sobrescribir.');result=validate(copy.before);st.put(result,'state');st.delete('beforeImport')}catch(e){error=e;tx.abort()}}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error)});
    render();message('Importación deshecha. Se recuperaron los datos anteriores.');
  }catch(e){message(e.message)}finally{busy=false;drawPayment();updateImportStatus()}
};
