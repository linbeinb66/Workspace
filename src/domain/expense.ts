import dayjs from 'dayjs';
import type { Expense } from '../types';
export const expenseCategories={reimburse:['交通','餐饮','道具','服装','场地','设备','其他'],personal:['餐饮','交通','房租','购物','娱乐','学习','人情','其他']} as const;
export const expenseStatuses={pending:'待提交',submitted:'已提交',reviewing:'审批中',paid:'已到账',rejected:'被驳回'} as const;
export function parseAmount(value:string):number {
  const text=value.trim();if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('金额请填写最多两位小数的正数');
  const [yuan='',fen='']=text.split('.');const cents=Number(yuan)*100+Number(fen.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)||cents<=0||cents>99999999999)throw new Error('金额需大于 0，且不超过 999,999,999.99 元');return cents;
}
export const money=(cents:number)=>`${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;
export function expenseTotal(rows:Expense[]):number {const total=rows.reduce((sum,row)=>sum+row.amountCents,0);if(!Number.isSafeInteger(total))throw new Error('合计金额超过可准确处理的范围');return total;}
export function needsSubmission(row:Expense,now:string|Date):boolean{return row.kind==='reimburse'&&row.status==='pending'&&dayjs(now).valueOf()-dayjs(row.createdAt).valueOf()>7*86400000;}
export interface ExpenseFilter {kind:Expense['kind'];month:string;status:string;category:string;query:string}
export function filterExpenses(rows:Expense[],filter:ExpenseFilter):Expense[]{const query=filter.query.trim().toLowerCase();return rows.filter((row)=>row.kind===filter.kind&&row.date.startsWith(filter.month)&&(!filter.status||row.status===filter.status)&&(!filter.category||row.category===filter.category)&&(!query||[row.title,row.category,row.note,row.ticketNo,row.payMethod].join(' ').toLowerCase().includes(query))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));}
export function expenseSummary(rows:Expense[],month:string){const reimburse=rows.filter((row)=>row.kind==='reimburse');return {pending:expenseTotal(reimburse.filter((row)=>row.status==='pending')),reviewing:expenseTotal(reimburse.filter((row)=>row.status==='submitted'||row.status==='reviewing')),paid:expenseTotal(reimburse.filter((row)=>row.status==='paid'&&row.paidAt&&dayjs(row.paidAt).format('YYYY-MM')===month)),personal:expenseTotal(rows.filter((row)=>row.kind==='personal'&&row.date.startsWith(month)))};}
const line=(value:string)=>value.replace(/[\r\n\t]+/g,' ').replace(/\*\*|##|~~|\|/g,'').trim();
export function reimbursementList(rows:Expense[],month:string):{text:string;total:number;count:number}{
  const chosen=rows.filter((row)=>row.kind==='reimburse'&&row.status==='pending').sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));const total=expenseTotal(chosen);
  return {text:chosen.length?`【报销清单】${month}\n${chosen.map((row,index)=>`${index+1}. ${row.date} ${line(row.title)} ¥${money(row.amountCents)}（${line(row.category)}）`).join('\n')}\n合计：¥${money(total)}（${chosen.length} 笔）`:'',total,count:chosen.length};
}
const csvCell=(value:string)=>`"${(/^[\s]*[=+@-]|^[\t\r]/.test(value)?"'":'')+value.replace(/"/g,'""')}"`;
export function expensesCsv(rows:Expense[]):string {return '\ufeff'+[['日期','事项','类别','金额','状态','单号','备注'],...rows.map((row)=>[row.date,row.title,row.category,money(row.amountCents),row.kind==='reimburse'?expenseStatuses[row.status??'pending']:'',row.ticketNo??'',row.note??''])].map((row)=>row.map(csvCell).join(',')).join('\r\n');}
