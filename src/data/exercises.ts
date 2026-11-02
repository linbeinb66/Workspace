import type { Exercise } from '../types';
// 本项目自行整理的名称与默认配置，不引入外部数据集。
export const bodyParts = ['胸','背','腿','肩','手臂','核心','有氧'] as const;
export const equipmentTypes = ['杠铃','哑铃','器械','绳索','自重'] as const;
const entries: [string,string,string,Exercise['category'],Exercise['equipment'],boolean,number][] = [
  ['bench','杠铃卧推','Barbell Bench Press','胸','杠铃',true,2.5],
  ['squat','杠铃深蹲','Barbell Squat','腿','杠铃',true,5],
  ['row','哑铃划船','Dumbbell Row','背','哑铃',true,1],
  ['incline-bench','上斜杠铃卧推','Incline Bench Press','胸','杠铃',true,2.5],
  ['db-bench','哑铃卧推','Dumbbell Bench Press','胸','哑铃',true,1],
  ['incline-db','上斜哑铃卧推','Incline Dumbbell Press','胸','哑铃',true,1],
  ['fly','哑铃飞鸟','Dumbbell Fly','胸','哑铃',false,1],
  ['cable-fly','绳索夹胸','Cable Fly','胸','绳索',false,2.5],
  ['pushup','俯卧撑','Push Up','胸','自重',true,1],
  ['deadlift','杠铃硬拉','Barbell Deadlift','背','杠铃',true,5],
  ['barbell-row','杠铃划船','Barbell Row','背','杠铃',true,2.5],
  ['pulldown','高位下拉','Lat Pulldown','背','器械',true,2.5],
  ['seated-row','坐姿划船','Seated Row','背','绳索',true,2.5],
  ['pullup','引体向上','Pull Up','背','自重',true,1],
  ['leg-press','腿举','Leg Press','腿','器械',true,5],
  ['lunge','哑铃弓步蹲','Dumbbell Lunge','腿','哑铃',true,1],
  ['rdl','罗马尼亚硬拉','Romanian Deadlift','腿','杠铃',true,2.5],
  ['leg-extension','腿屈伸','Leg Extension','腿','器械',false,2.5],
  ['leg-curl','腿弯举','Leg Curl','腿','器械',false,2.5],
  ['calf','站姿提踵','Standing Calf Raise','腿','器械',false,2.5],
  ['hip-thrust','杠铃臀推','Barbell Hip Thrust','腿','杠铃',true,5],
  ['ohp','杠铃推举','Overhead Press','肩','杠铃',true,2.5],
  ['db-press','哑铃肩推','Dumbbell Shoulder Press','肩','哑铃',true,1],
  ['lateral','哑铃侧平举','Dumbbell Lateral Raise','肩','哑铃',false,1],
  ['rear-fly','俯身反向飞鸟','Reverse Fly','肩','哑铃',false,1],
  ['face-pull','绳索面拉','Face Pull','肩','绳索',false,2.5],
  ['barbell-curl','杠铃弯举','Barbell Curl','手臂','杠铃',false,2.5],
  ['db-curl','哑铃弯举','Dumbbell Curl','手臂','哑铃',false,1],
  ['hammer','锤式弯举','Hammer Curl','手臂','哑铃',false,1],
  ['pushdown','绳索下压','Triceps Pushdown','手臂','绳索',false,2.5],
  ['triceps','哑铃颈后臂屈伸','Overhead Triceps Extension','手臂','哑铃',false,1],
  ['crunch','卷腹','Crunch','核心','自重',false,1],
  ['leg-raise','悬垂举腿','Hanging Leg Raise','核心','自重',true,1],
  ['cable-crunch','绳索卷腹','Cable Crunch','核心','绳索',false,2.5],
  ['mountain','登山跑','Mountain Climber','有氧','自重',true,1],
  ['burpee','波比跳','Burpee','有氧','自重',true,1],
];
export function exerciseLibrary(updatedAt: string): Exercise[] {
  return entries.map(([key,name,nameEn,category,equipment,isCompound,increment]) => ({ id:`seed-${key}`,name,nameEn,category,equipment,isCompound,increment,repMin:8,repMax:12,targetSets:3,source:'seed',demo:false,updatedAt }));
}
