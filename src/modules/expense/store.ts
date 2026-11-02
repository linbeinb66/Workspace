import { createContext,useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Expense,ReceiptImage } from '../../types';
import type { OwnedStorage } from '../../lib/storage';
import { assertValue } from '../../lib/validation';
import type { PreparedReceipt,ReceiptPort } from '../../lib/receipt';
import { receiptFiles,removeReceiptCopies } from '../../lib/receipt';
import { id } from '../../lib/id';
export type ExpenseDraft=Omit<Expense,'id'|'updatedAt'|'createdAt'|'demo'> & {id?:string};
interface ExpenseState {expenses:Expense[];receipts:ReceiptImage[];busy:boolean;save:(draft:ExpenseDraft,added:PreparedReceipt[])=>Promise<string|undefined>;remove:(id:string)=>Promise<string|undefined>;reload:()=>void}
export function createExpenseStore(port:OwnedStorage<'expenses'|'receipts'>,media:ReceiptPort=receiptFiles,clock:()=>Date=()=>new Date()){
  const read=()=>({expenses:port.get('expenses',[]),receipts:port.get('receipts',[])});
  return createStore<ExpenseState>((set,get)=>({...read(),busy:false,
    async save(draft,added){if(get().busy)throw new Error('正在保存，请稍候');set({busy:true});let staged=false;
      try{const stamp=clock().toISOString();const previous=draft.id?get().expenses.find((entry)=>entry.id===draft.id):undefined;if(draft.id&&!previous)throw new Error('记录已不存在，请重新打开');
        const expense:Expense={...draft,id:previous?.id??id(),title:draft.title.trim(),createdAt:previous?.createdAt??stamp,updatedAt:stamp,demo:false};
        if(expense.amountCents<=0)throw new Error('金额需大于 0');if(expense.kind==='personal'&&expense.receiptIds.length)throw new Error('个人支出暂不附凭证');
        assertValue('expenses',[expense]);if(new Set(expense.receiptIds).size!==expense.receiptIds.length)throw new Error('凭证不能重复');
        const owned=new Set(previous?.receiptIds??[]);const newIds=new Set(added.map((entry)=>entry.meta.id));if(added.some((entry)=>!expense.receiptIds.includes(entry.meta.id))||expense.receiptIds.some((rid)=>!owned.has(rid)&&!newIds.has(rid)))throw new Error('凭证引用无效');
        const removed=get().receipts.filter((entry)=>owned.has(entry.id)&&!expense.receiptIds.includes(entry.id));const receipts=[...get().receipts.filter((entry)=>!removed.some((old)=>old.id===entry.id)),...added.map((entry)=>entry.meta)];assertValue('receipts',receipts);
        if(added.some((entry)=>entry.image.size>300*1024||entry.thumb.size>300*1024||entry.meta.size!==entry.image.size||entry.image.type!=='image/jpeg'||entry.thumb.type!=='image/jpeg'))throw new Error('凭证图片格式或大小无效');
        if(added.length){await media.setMany(added.flatMap((entry)=>[[entry.meta.key,entry.image],[entry.meta.thumbKey,entry.thumb]] as [string,Blob][]));staged=true;}
        const expenses=previous?get().expenses.map((entry)=>entry.id===expense.id?expense:entry):[...get().expenses,expense];port.setMany({expenses,receipts});set({expenses,receipts});
        try{await removeReceiptCopies(media,removed);}catch{return '记录已保存，旧凭证副本未能清理；清空全部数据时可再次清理';}
        return undefined;
      }catch(error){if(staged)try{const referenced=new Set(port.get('receipts',[]).flatMap((entry)=>[entry.key,entry.thumbKey]));await media.removeMany(added.flatMap((entry)=>[entry.meta.key,entry.meta.thumbKey]).filter((key)=>!referenced.has(key)));}catch{/* 保留仍有引用的图片。 */}throw error;}finally{set({busy:false});}
    },
    async remove(expenseId){if(get().busy)throw new Error('正在保存，请稍候');set({busy:true});try{const previous=get().expenses.find((entry)=>entry.id===expenseId);if(!previous)throw new Error('记录已不存在');const removed=get().receipts.filter((entry)=>previous.receiptIds.includes(entry.id));const expenses=get().expenses.filter((entry)=>entry.id!==expenseId);const receipts=get().receipts.filter((entry)=>!previous.receiptIds.includes(entry.id));port.setMany({expenses,receipts});set({expenses,receipts});try{await removeReceiptCopies(media,removed);}catch{return '记录已删除，凭证副本未能清理；清空全部数据时可再次清理';}return undefined;}finally{set({busy:false});}},
    reload(){set({...read(),busy:false});},
  }));
}
export type ExpenseStore=ReturnType<typeof createExpenseStore>;
export const ExpenseContext=createContext<ExpenseStore|null>(null);
export function useExpenseStore<T>(selector:(state:ExpenseState)=>T):T{const store=useContext(ExpenseContext);if(!store)throw new Error('报账尚未初始化');return useStore(store,selector);}
