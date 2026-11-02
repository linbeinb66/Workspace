import type { PlanItem, TrainingPlan } from '../types';
const item=(exerciseId:string,restSec=90,targetSets=3):PlanItem=>({exerciseId,targetSets,repMin:8,repMax:12,restSec});
// 自编入门版；只参考分化框架，不声称复刻任何博主的完整课程。
export const trainingPlans:TrainingPlan[]=[
  {id:'split-4',name:'四分化 · 肩背线条',description:'胸与三头 → 背与二头 → 腿与核心 → 肩与手臂。每次约 50–65 分钟，休息日自行插入。',days:[
    {id:'chest',name:'胸 + 三头',items:[item('seed-bench',180),item('seed-incline-db',120),item('seed-cable-fly'),item('seed-pushdown')]},
    {id:'back',name:'背 + 二头',items:[item('seed-pulldown',120),item('seed-seated-row',120),item('seed-row',120),item('seed-face-pull'),item('seed-db-curl')]},
    {id:'legs',name:'腿 + 核心',items:[item('seed-squat',180),item('seed-rdl',180),item('seed-leg-curl'),item('seed-calf'),item('seed-crunch',60,2)]},
    {id:'shoulder',name:'肩 + 手臂',items:[item('seed-db-press',120),item('seed-lateral'),item('seed-rear-fly'),item('seed-hammer'),item('seed-pushdown')]},
  ]},
  {id:'split-3',name:'三分化 · 推拉腿',description:'推 → 拉 → 腿循环；按实际训练推进，不绑定星期。每次约 50–65 分钟。',days:[
    {id:'push',name:'推 · 胸肩三头',items:[item('seed-bench',180),item('seed-incline-db',120),item('seed-db-press',120,2),item('seed-lateral'),item('seed-pushdown',90,2)]},
    {id:'pull',name:'拉 · 背与二头',items:[item('seed-pulldown',120),item('seed-seated-row',120),item('seed-row',120),item('seed-rear-fly'),item('seed-db-curl')]},
    {id:'legs',name:'腿 + 核心',items:[item('seed-squat',180),item('seed-rdl',180),item('seed-leg-curl'),item('seed-calf'),item('seed-crunch',60,2)]},
  ]},
];
export const trainingReferences={creator:'https://jingxuan.douyin.com/m/video/7623732958012198179',guidelines:'https://acsm.org/resistance-training-guidelines-update-2026/'};
