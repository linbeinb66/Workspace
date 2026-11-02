import type { PreparedReceipt,ReceiptPort } from '../lib/receipt';
export class MemoryReceipts implements ReceiptPort {
  files=new Map<string,Blob>();failWrite=false;failRemove=false;
  async get(key:string){return this.files.get(key);}
  async keys(){return [...this.files.keys()];}
  async setMany(entries:[string,Blob][]){if(this.failWrite)throw new Error('图片空间不足');for(const [key,value]of entries)this.files.set(key,value);}
  async removeMany(keys:string[]){if(this.failRemove)throw new Error('无法删除图片');for(const key of keys)this.files.delete(key);}
  async clear(){this.files.clear();}
}
export const preparedReceipt=(id='image'):PreparedReceipt=>{const image=new Blob([new Uint8Array([255,216,1,2,3,4,255,217])],{type:'image/jpeg'});return {meta:{id,key:`receipt/${id}`,thumbKey:`receipt/${id}/thumb`,width:2,height:2,size:image.size,demo:false,updatedAt:'2026-11-01T12:00:00Z'},image,thumb:image};};
