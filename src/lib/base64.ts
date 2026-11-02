export function encodeBase64(bytes:Uint8Array):string {let text='';for(let start=0;start<bytes.length;start+=8192)text+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(text);}
export function decodeBase64(value:unknown,maxBytes:number):Uint8Array {
  if(typeof value!=='string'||!value.length||value.length%4!==0||value.length>Math.ceil(maxBytes/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('备份内容编码损坏，原有数据未被覆盖');
  const raw=atob(value);if(raw.length>maxBytes)throw new Error('备份内容超出允许大小');return Uint8Array.from(raw,(char)=>char.charCodeAt(0));
}
