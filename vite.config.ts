import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { workbenchPwa } from './build/pwa';

export default defineConfig(({mode})=>({
  plugins: [react(),...(mode==='portable'?[viteSingleFile(),{name:'portable-html',transformIndexHtml(html:string){return html.replace(/\s*<link[^>]+(?:rel="manifest"|rel="apple-touch-icon")[^>]*>/g,'').replace(/<link rel="icon"[^>]*>/,'<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%236e9a6e%22/%3E%3Cpath d=%22M9 24C4 9 18 7 26 8c0 12-8 19-17 16Z%22 fill=%22white%22/%3E%3C/svg%3E" />').replace('<head>','<head><meta name="wb-portable" content="true" />');}}]:[workbenchPwa()])],
  base: './',
  build: { ...(mode==='portable'?{outDir:'.portable-build',copyPublicDir:false}:{}), rollupOptions: { output: mode==='portable'?{}:{ manualChunks(id) { if (/[/\\]data[/\\]english\.(?:words|sentences|passages|grammar)\.json$/.test(id)) return 'english-content'; } } } },
  define:{__WB_PORTABLE__:JSON.stringify(mode==='portable')},
  server: { port: 5173, strictPort: true },
}));
