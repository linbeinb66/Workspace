import { createHash } from 'node:crypto';
import { readdirSync,readFileSync } from 'node:fs';
import { resolve,relative } from 'node:path';
import type { Plugin } from 'vite';

export function serviceWorkerSource(version:string,resources:string[]):string {
  return `/* Personal Workbench offline shell. No personal data is cached here. */
const VERSION=${JSON.stringify(version)};
const FILES=${JSON.stringify(resources)};
const PREFIX='wb-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+VERSION;
const url=(path)=>new URL(path,self.registration.scope).href;
const SHELL=url('index.html');
async function populate(name){
  const cache=await caches.open(name);
  try {
    await cache.addAll(FILES.map(path=>new Request(url(path),{cache:'reload'})));
    for(const path of FILES){
      const response=await cache.match(url(path));const type=response?.headers.get('Content-Type')||'';
      const correct=path.endsWith('.js')?/^(application|text)\\/(x-)?(java|ecma)script/i.test(type):path.endsWith('.css')?type.startsWith('text/css'):path.endsWith('.png')?type.startsWith('image/png'):path.endsWith('.svg')?type.startsWith('image/svg+xml'):path.endsWith('.webmanifest')?type.includes('json'):path.endsWith('.html')?type.startsWith('text/html'):true;
      if(!response||!correct)throw new Error('Offline resource type mismatch');
      if(path==='index.html'&&!(await response.text()).includes('name="wb-build" content="'+VERSION+'"'))throw new Error('Offline shell version mismatch');
    }
    return cache;
  }catch(error){await caches.delete(name);throw error;}
}
async function complete(cache){const saved=new Set((await cache.keys()).map(request=>request.url));return FILES.every(file=>saved.has(url(file)));}
self.addEventListener('install',event=>event.waitUntil(populate(CACHE)));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.type==='CACHE_STATUS')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);let ready=await complete(cache);
    if(!ready&&event.data.repair){
      const staging='wb-stage-'+encodeURIComponent(self.registration.scope)+'-'+VERSION;
      try{const source=await populate(staging);for(const file of FILES)await cache.put(url(file),await source.match(url(file)));ready=await complete(cache);}catch{ready=false;}finally{await caches.delete(staging);}
    }
    event.ports[0]?.postMessage({ready,version:VERSION});
  })());
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
  // 只有当前窗口已加载新版、并且没有其他旧窗口时，才清理本应用旧壳。
  if(event.data?.type==='APP_READY'&&event.data.version===VERSION)event.waitUntil((async()=>{
    if(self.registration.waiting||self.registration.installing)return;
    const windows=await self.clients.matchAll({type:'window'});
    if(windows.length===1&&windows[0].id===event.source?.id)
      await Promise.all((await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;const target=new URL(request.url);
  if(request.method!=='GET'||target.origin!==self.location.origin||!target.href.startsWith(self.registration.scope)||target.pathname.endsWith('/standalone.html'))return;
  event.respondWith((async()=>{
    const current=await caches.open(CACHE);
    const relative=target.pathname.slice(new URL(self.registration.scope).pathname.length);
    if(request.mode==='navigate'&&(relative===''||relative==='index.html'))return (await current.match(SHELL))||fetch(request);
    const cached=await current.match(request);if(cached)return cached;
    for(const key of (await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE)){
      const previous=await (await caches.open(key)).match(request);if(previous)return previous;
    }
    return fetch(request);
  })());
});
`;
}
export function workbenchPwa():Plugin {
  let publicDir='';
  return {name:'workbench-pwa',apply:'build',enforce:'post',configResolved(config){publicDir=config.publicDir;},
    generateBundle(_options,bundle){
      const files=readdirSync(publicDir,{recursive:true,withFileTypes:true}).filter((entry)=>entry.isFile()).map((entry)=>resolve(entry.parentPath,entry.name));
      const hash=createHash('sha256');for(const name of Object.keys(bundle).sort()){const entry=bundle[name]!;hash.update(name);hash.update(entry.type==='chunk'?entry.code:typeof entry.source==='string'?entry.source:entry.source);}
      for(const file of files.sort())hash.update(readFileSync(file));hash.update(serviceWorkerSource('',[]));const version=hash.digest('hex').slice(0,12);
      const html=bundle['index.html'];if(html?.type==='asset')html.source=String(html.source).replace('</head>',`<meta name="wb-build" content="${version}" /></head>`);
      const resources=[...new Set([...Object.keys(bundle),...files.map((file)=>relative(publicDir,file).replaceAll('\\','/'))])].filter((name)=>!name.endsWith('.map')&&name!=='standalone.html');
      this.emitFile({type:'asset',fileName:'sw.js',source:serviceWorkerSource(version,resources)});
    },
  };
}
