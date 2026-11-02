import { build } from 'vite';
import { mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

await build({mode:'production'});
await build({mode:'portable'});
const temporary=resolve('.portable-build');
const portable=await readFile(resolve(temporary,'index.html'),'utf8');
if(Buffer.byteLength(portable)>1.2*1024*1024)throw new Error('单文件版超过1.2MB');
if(/<script\b[^>]*\bsrc=|<link\b[^>]*rel="(?:stylesheet|modulepreload)"/i.test(portable))throw new Error('便携版仍引用外部代码');
await mkdir('dist',{recursive:true});await writeFile('dist/standalone.html',portable);
// 仅删除已核实、固定在当前项目内的构建临时目录。
if(temporary!==resolve(process.cwd(),'.portable-build'))throw new Error('构建临时目录异常');
await rm(temporary,{recursive:true,force:true});
const html=await readFile('dist/index.html','utf8');
const scripts=[...html.matchAll(/(?:src|href)="\.\/([^" ]+\.js)"/g)].map((match)=>match[1]);
let js=0;for(const file of new Set(scripts))js+=gzipSync(await readFile(resolve('dist',file))).byteLength;
if(js>=350*1024)throw new Error('首屏JS超过350KB gzip');
console.log(`PWA + standalone.html ready. Initial JS gzip: ${js} bytes; portable: ${Buffer.byteLength(portable)} bytes.`);
