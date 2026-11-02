import { createContext,useContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { Word,WordProgress,StudyLog,StudyQueue,ShadowingLog,Mistake } from '../../types';
import type { OwnedStorage } from '../../lib/storage';
import type { ImportedWord } from '../../domain/wordCsv';
import { parseWordCsv } from '../../domain/wordCsv';
import { makeStudyQueue,normalizeWord,rateWord,studyLog } from '../../domain/srs';
import { englishWords,englishSentences,englishPassages,englishGrammar } from '../../data/englishContent';
import { id } from '../../lib/id';

type EnglishKey='words'|'wordProgress'|'studyLogs'|'studyQueue'|'shadowingLogs'|'mistakes';
export type StudyMode='main'|'retry'|'notebook';
export function previewWords(rows:ImportedWord[],words:Word[]){
  const seen=new Set(words.map((word)=>normalizeWord(word.word)));const added:ImportedWord[]=[];
  for(const row of rows){const key=normalizeWord(row.word);if(!seen.has(key)){seen.add(key);added.push(row);}}
  return {added,skipped:rows.length-added.length};
}
export interface EnglishState {
  words:Word[];wordProgress:WordProgress[];studyLogs:StudyLog[];studyQueue:StudyQueue[];shadowingLogs:ShadowingLog[];mistakes:Mistake[];
  ensureDay:(date:string)=>StudyQueue;
  rate:(date:string,wordId:string,result:WordProgress['lastResult'],mode:StudyMode)=>void;
  toggleSentence:(date:string,sentenceId:string)=>void;
  answerGrammar:(date:string,questionId:string,selected:string)=>void;
  resolveMistake:(mistakeId:string,selected:string)=>boolean;
  removeNotebook:(wordId:string)=>void;
  importCsv:(text:string)=>{added:number;skipped:number};
  addStudyTime:(date:string,seconds:number)=>void;
  reload:()=>void;
}
export function createEnglishStore(port:OwnedStorage<EnglishKey>,clock:()=>Date=()=>new Date()){
  const read=()=>{
    const saved=port.get('words',[]);const names=new Set(saved.map((word)=>normalizeWord(word.word)));const ids=new Set(saved.map((word)=>word.id));
    const missing=englishWords.filter((word)=>!names.has(normalizeWord(word.word))&&!ids.has(word.id));
    const words=[...saved,...missing];if(missing.length)port.set('words',words);
    return {words,wordProgress:port.get('wordProgress',[]),studyLogs:port.get('studyLogs',[]),studyQueue:port.get('studyQueue',[]),shadowingLogs:port.get('shadowingLogs',[]),mistakes:port.get('mistakes',[])};
  };
  return createStore<EnglishState>((set,get)=>{
    const queueFor=(date:string)=>{const queue=get().studyQueue.find((entry)=>entry.date===date);if(!queue)throw new Error('请先打开当天学习计划');return queue;};
    const commit=(queue:StudyQueue,patch:Partial<Pick<EnglishState,EnglishKey>>={})=>{
      const state=get();const studyQueue=state.studyQueue.map((entry)=>entry.date===queue.date?queue:entry);
      const log=studyLog(queue,patch.shadowingLogs??state.shadowingLogs,state.studyLogs.find((entry)=>entry.date===queue.date),queue.updatedAt);
      const studyLogs=[...state.studyLogs.filter((entry)=>entry.date!==queue.date),log];const changes={...patch,studyQueue,studyLogs};
      port.setMany(changes);set(changes);
    };
    return {...read(),
      ensureDay(date){const existing=get().studyQueue.find((entry)=>entry.date===date);if(existing)return existing;
        const queue=makeStudyQueue(date,get().words,get().wordProgress,englishSentences,englishPassages,englishGrammar,clock().toISOString());
        const studyQueue=[...get().studyQueue,queue];port.set('studyQueue',studyQueue);set({studyQueue});return queue;},
      rate(date,wordId,result,mode){const state=get();const previous=queueFor(date);if(!state.words.some((word)=>word.id===wordId))throw new Error('词条已不存在');
        const progress=state.wordProgress.find((entry)=>entry.wordId===wordId);
        if(mode==='main'){
          if(![...previous.newWordIds,...previous.reviewWordIds].includes(wordId))throw new Error('这个词不在当天计划里');
          if(previous.completedWordIds.includes(wordId))return;
        }else if(mode==='retry'){
          if(!previous.retryWordIds.includes(wordId))throw new Error('这个词不在再练队列里');
          if(previous.retryCompletedWordIds?.includes(wordId))return;
        }else if(!progress)throw new Error('这个词还没有学习记录');
        const stamp=clock().toISOString();const next=rateWord(wordId,result,progress,date,stamp);
        const queue:StudyQueue={...previous,updatedAt:stamp,demo:false};
        if(mode==='main'){
          queue.completedWordIds=[...previous.completedWordIds,wordId];
          if(result==='unknown'&&!previous.retryWordIds.includes(wordId))queue.retryWordIds=[...previous.retryWordIds,wordId];
        }else if(mode==='retry')queue.retryCompletedWordIds=[...(previous.retryCompletedWordIds??[]),wordId];
        else queue.notebookCompletedWordIds=[...new Set([...(previous.notebookCompletedWordIds??[]),wordId])];
        commit(queue,{wordProgress:[...state.wordProgress.filter((entry)=>entry.wordId!==wordId),next]});
      },
      toggleSentence(date,sentenceId){const state=get();const previous=queueFor(date);if(!previous.sentenceIds.includes(sentenceId))throw new Error('这句话不在当天计划里');
        const stamp=clock().toISOString();const old=state.shadowingLogs.find((entry)=>entry.date===date&&entry.sentenceId===sentenceId);
        const log:ShadowingLog={id:old?.id??id(),date,sentenceId,done:!old?.done,demo:false,updatedAt:stamp};
        commit({...previous,updatedAt:stamp,demo:false},{shadowingLogs:[...state.shadowingLogs.filter((entry)=>!(entry.date===date&&entry.sentenceId===sentenceId)),log]});
      },
      answerGrammar(date,questionId,selected){const state=get();const previous=queueFor(date);const question=englishGrammar.find((entry)=>entry.id===questionId);
        if(!previous.grammarIds.includes(questionId)||!question||!question.options.some((option)=>option.key===selected))throw new Error('请选择当天题目的有效选项');
        if(previous.grammarAnswers?.some((answer)=>answer.questionId===questionId))return;
        const stamp=clock().toISOString();const queue={...previous,demo:false,updatedAt:stamp,grammarAnswers:[...(previous.grammarAnswers??[]),{questionId,selected}]};
        const mistakes=selected===question.answer?state.mistakes:[...state.mistakes,{id:id(),date,questionId,selected,resolved:false,demo:false,updatedAt:stamp}];
        commit(queue,{mistakes});
      },
      resolveMistake(mistakeId,selected){const previous=get().mistakes.find((entry)=>entry.id===mistakeId);if(!previous)throw new Error('错题已不存在');
        const question=englishGrammar.find((entry)=>entry.id===previous.questionId);if(!question||!question.options.some((option)=>option.key===selected))throw new Error('请选择有效选项');
        if(selected!==question.answer)return false;
        const mistakes=get().mistakes.map((entry)=>entry.id===mistakeId?{...entry,resolved:true,demo:false,updatedAt:clock().toISOString()}:entry);port.set('mistakes',mistakes);set({mistakes});return true;
      },
      removeNotebook(wordId){const wordProgress=get().wordProgress.map((entry)=>entry.wordId===wordId?{...entry,inNotebook:false,demo:false,updatedAt:clock().toISOString()}:entry);port.set('wordProgress',wordProgress);set({wordProgress});},
      importCsv(text){const rows=parseWordCsv(text);const preview=previewWords(rows,get().words);if(!preview.added.length)return {added:0,skipped:preview.skipped};
        const stamp=clock().toISOString();const words=[...get().words,...preview.added.map((row):Word=>({...row,id:id(),synonyms:[],level:'日常',demo:false,updatedAt:stamp}))];port.set('words',words);set({words});return {added:preview.added.length,skipped:preview.skipped};},
      addStudyTime(date,seconds){if(!Number.isFinite(seconds)||seconds<=0)return;const previous=get().studyLogs.find((entry)=>entry.date===date);
        if(!get().studyQueue.some((queue)=>queue.date===date))return;
        const log:StudyLog={date,newWords:0,reviews:0,sentences:0,grammarDone:false,...previous,minutes:Math.round(((previous?.minutes??0)+Math.min(seconds,60)/60)*1000)/1000,demo:false,updatedAt:clock().toISOString()};
        const studyLogs=[...get().studyLogs.filter((entry)=>entry.date!==date),log];port.set('studyLogs',studyLogs);set({studyLogs});},
      reload(){set(read());},
    };
  });
}
export type EnglishStore=ReturnType<typeof createEnglishStore>;
export const EnglishContext=createContext<EnglishStore|null>(null);
export function useEnglishStore<T>(selector:(state:EnglishState)=>T):T{const store=useContext(EnglishContext);if(!store)throw new Error('学习尚未初始化');return useStore(store,selector);}
