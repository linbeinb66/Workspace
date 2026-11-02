import type { GrammarQuestion,Passage,Sentence,StudyLog,StudyQueue,ShadowingLog,Word,WordProgress } from '../types';
import { addDays } from './plan';
import { streak } from './stats';
export const reviewIntervals=[0,1,3,7,15,30] as const;
export function rateWord(wordId:string,result:WordProgress['lastResult'],previous:WordProgress|undefined,date:string,stamp:string):WordProgress {
  if(previous?.lastAdvancedDate&&previous.lastAdvancedDate>date)throw new Error('这条学习进度来自之后的日期，请检查设备时间');
  if(previous?.lastAdvancedDate===date)return {...previous,inNotebook:result!=='know',demo:false,updatedAt:stamp};
  const stage=result==='know'?Math.min(5,(previous?.stage??0)+1):result==='fuzzy'?Math.max(1,previous?.stage??0):0;
  return {wordId,stage:stage as WordProgress['stage'],nextReview:addDays(date,result==='know'?reviewIntervals[stage]!:1),lastResult:result,wrongCount:(previous?.wrongCount??0)+(result==='unknown'?1:0),lastAdvancedDate:date,inNotebook:result!=='know',demo:false,updatedAt:stamp};
}
export function notebookWords(words:Word[],progress:WordProgress[]):Word[]{return words.filter((word)=>{const record=progress.find((entry)=>entry.wordId===word.id);return record&&(record.inNotebook??record.lastResult!=='know');});}
function rotate<T>(items:T[],date:string,count:number):T[]{if(!items.length)return [];const offset=Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000)*count;return Array.from({length:Math.min(count,items.length)},(_,index)=>items[((offset+index)%items.length+items.length)%items.length]!);}
export function makeStudyQueue(date:string,words:Word[],progress:WordProgress[],sentences:Sentence[],passages:Passage[],grammar:GrammarQuestion[],stamp:string):StudyQueue {
  const known=new Set(progress.map((entry)=>entry.wordId));const ids=new Set(words.map((word)=>word.id));const reviewWordIds=progress.filter((entry)=>ids.has(entry.wordId)&&entry.nextReview<=date).sort((a,b)=>a.nextReview.localeCompare(b.nextReview)||a.wordId.localeCompare(b.wordId)).slice(0,20).map((entry)=>entry.wordId);
  return {date,newWordIds:words.filter((word)=>!known.has(word.id)).slice(0,5).map((word)=>word.id),reviewWordIds,completedWordIds:[],retryWordIds:[],retryCompletedWordIds:[],notebookCompletedWordIds:[],sentenceIds:rotate(sentences,date,5).map((entry)=>entry.id),passageId:rotate(passages,date,1)[0]?.id,grammarIds:rotate(grammar,date,5).map((entry)=>entry.id),grammarAnswers:[],demo:false,updatedAt:stamp};
}
export function studyLog(queue:StudyQueue,shadowing:ShadowingLog[],previous:StudyLog|undefined,stamp:string):StudyLog {
  const done=new Set([...queue.completedWordIds,...(queue.notebookCompletedWordIds??[])]);const newWords=queue.newWordIds.filter((wordId)=>done.has(wordId)).length;
  return {date:queue.date,newWords,reviews:done.size-newWords,sentences:new Set(shadowing.filter((entry)=>entry.date===queue.date&&entry.done).map((entry)=>entry.sentenceId)).size,minutes:previous?.minutes??0,grammarDone:queue.grammarIds.length>0&&queue.grammarIds.every((id)=>queue.grammarAnswers?.some((entry)=>entry.questionId===id)),demo:false,updatedAt:stamp};
}
export function englishStats(progress:WordProgress[],shadowing:ShadowingLog[],queues:StudyQueue[],logs:StudyLog[],today:string){
  const dates=new Set(logs.filter((entry)=>entry.date<=today&&(entry.newWords>0||entry.reviews>0||entry.sentences>0)).map((entry)=>entry.date));for(const queue of queues)if(queue.date<=today&&queue.grammarAnswers?.length)dates.add(queue.date);
  return {words:progress.filter((entry)=>!entry.lastAdvancedDate||entry.lastAdvancedDate<=today).length,sentences:shadowing.filter((entry)=>entry.date<=today&&entry.done).length,exercises:queues.filter((entry)=>entry.date<=today).reduce((sum,entry)=>sum+(entry.grammarAnswers?.length??0),0),streak:streak(dates,today)};
}
export const normalizeWord=(word:string)=>word.trim().toLowerCase().replace(/’/g,"'").replace(/\s+/g,' ');
export function lookupWord(token:string,words:Word[]):Word|undefined {const normalized=normalizeWord(token).replace(/^[^a-z]+|[^a-z]+$/g,'');return words.find((word)=>normalizeWord(word.word)===normalized);}
