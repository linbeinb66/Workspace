import { useEffect, useState } from 'react';
import type { BodyMetric } from '../../types';
import { Card } from '../../components/Card';
import { useToast } from '../../components/Toast';
import { useFitnessStore } from './store';
const fields=[['waistCm','腰围'],['chestCm','胸围'],['shoulderCm','肩围'],['upperArmCm','上臂围']] as const;
type Field=typeof fields[number][0];
export function Measurements({date}:{date:string}){
  const metrics=useFitnessStore((s)=>s.bodyMetrics);const save=useFitnessStore((s)=>s.saveBody);const toast=useToast();const metric=metrics.find((m)=>m.date===date);
  const draft=()=>Object.fromEntries(fields.map(([key])=>[key,metric?.[key]?.toString()??''])) as Record<Field,string>;
  const [values,setValues]=useState(draft);const [field,setField]=useState<Field>('waistCm');useEffect(()=>setValues(draft()),[metric,date]);
  const records=metrics.filter((m)=>m.date<=date&&m[field]!==undefined).sort((a,b)=>a.date.localeCompare(b.date));const recent=records.slice(-12);const latest=recent.at(-1);const first=recent[0];
  const nums=recent.map((m)=>m[field]!);const min=Math.min(...nums)-1;const max=Math.max(...nums)+1;
  return <Card title="围度记录" subtitle="厘米 cm · 腰 / 胸 / 肩 / 上臂" className="order-4"><div className="grid grid-cols-2 gap-3">{fields.map(([key,label])=><div key={key}><label htmlFor={`measure-${key}`} className="field-label">{label}（cm）</label><input id={`measure-${key}`} className="field w-full" type="number" inputMode="decimal" min="1" step="0.1" value={values[key]} onChange={(e)=>setValues((v)=>({...v,[key]:e.target.value}))}/></div>)}</div><button className="btn btn-primary mt-3" onClick={()=>{try{const patch:Omit<BodyMetric,'demo'|'updatedAt'>={date};for(const [key] of fields){if(values[key].trim()){const value=Number(values[key]);if(!Number.isFinite(value)||value<=0)throw new Error('围度请填写大于 0 的数值');patch[key]=value;}}if(Object.keys(patch).length===1)throw new Error('请至少填写一项围度');save(patch);toast('围度已保存，同日体重保留');}catch(err){toast(err instanceof Error?err.message:'保存失败',true);}}}>保存围度</button><p className="mt-2 text-caption text-muted">可以只填一项，不必填体重；留空保留已有值。尽量在相同时间与姿势测量，上臂固定同一侧。</p>
    <label htmlFor="measure-trend" className="field-label mt-5">查看围度趋势</label><select id="measure-trend" className="field w-full" value={field} onChange={(e)=>setField(e.target.value as Field)}>{fields.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
    {recent.length?<><svg className="mt-4 w-full text-brand-strong" viewBox="0 0 340 150" role="img" aria-label="最近12次围度趋势，横轴按记录日期顺序排列"><line x1="20" y1="120" x2="320" y2="120" className="stroke-line"/><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={recent.map((m,i)=>`${20+i/Math.max(1,recent.length-1)*300},${120-(m[field]!-min)/(max-min)*95}`).join(' ')}/>{recent.map((m,i)=><circle key={m.date} cx={20+i/Math.max(1,recent.length-1)*300} cy={120-(m[field]!-min)/(max-min)*95} r="3" fill="currentColor"><title>{m.date}：{m[field]} cm</title></circle>)}<text x="20" y="145" fontSize="10" className="fill-muted">{first?.date}</text><text x="320" y="145" textAnchor="end" fontSize="10" className="fill-muted">{latest?.date}</text></svg><p className="text-caption text-muted">最近 {latest?.[field]} cm{recent.length>1?` · 较首条 ${Math.round((latest![field]!-first![field]!)*10)/10} cm`:''} · 最近 {recent.length} 次，未记录的日期不补值</p></>:<p className="compact-empty text-muted">还没有这项围度记录</p>}
  </Card>;
}
