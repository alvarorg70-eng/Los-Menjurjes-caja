const CACHE='menjurjes-v4';
const FILES=['./','index.html','style.css','app.js','reset-data.js','catalog.js','manifest.webmanifest','assets/logo.jpg','assets/feria.jpg','assets/vip.jpg','assets/sencilla.jpg','assets/mezcalita.jpg','assets/paloma.jpg','assets/clericot.jpg','assets/agua.jpg','assets/cafe.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(e.request,{ignoreSearch:true});if(cached)return cached;try{return await fetch(e.request)}catch(err){if(e.request.mode==='navigate')return c.match('index.html');throw err}}))});
self.addEventListener('message',e=>{if(e.data.type==='CHECK')e.waitUntil(caches.open(CACHE).then(async c=>{const all=await Promise.all(FILES.map(f=>c.match(f)));e.ports[0]?.postMessage({ready:all.every(Boolean)})}))});
