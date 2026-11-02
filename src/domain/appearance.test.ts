import { describe, expect, it } from 'vitest';
import { MAX_WALLPAPER_BYTES,wallpaperFormat } from './appearance';
describe('壁纸导入边界',()=>{
  it.each([['风景.JPG','image/jpeg','image'],['壁纸.mp4','video/mp4','video'],['壁纸.webm','','video'],['风景.png','','image']])('接受%s',(name,type,kind)=>expect(wallpaperFormat({name,type,size:100})).toMatchObject({kind}));
  it.each(['scene.pkg','scene.mpkg','wallpaper.html','project.json','wallpaper.exe','workshop.url','wallpaper.mp4.exe'])('拒绝不支持的%s',(name)=>expect(()=>wallpaperFormat({name,type:'',size:100})).toThrow('场景包'));
  it('伪装扩展名、空文件与超限文件都拒绝',()=>{expect(()=>wallpaperFormat({name:'a.mp4',type:'text/html',size:100})).toThrow();expect(()=>wallpaperFormat({name:'a.jpg',type:'image/jpeg',size:0})).toThrow('空');expect(()=>wallpaperFormat({name:'a.mp4',type:'video/mp4',size:MAX_WALLPAPER_BYTES+1})).toThrow('30MB')});
});
