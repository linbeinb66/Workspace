import { useState } from 'react';
import type { StudyQueue,Word,WordProgress } from '../../types';
import { Card } from '../../components/Card';
import { useToast } from '../../components/Toast';
import { useEnglishStore,type StudyMode } from './store';
import type { SpeechControls } from './useSpeech';

export function WordDetails({word,speech}:{word:Word;speech:SpeechControls}){
  return <><div className="flex flex-wrap items-center gap-3"><h3 lang="en" className="break-words text-[30px] font-semibold tracking-tight">{word.word}</h3><button className="btn btn-secondary" disabled={!speech.ready} onClick={()=>speech.speak(word.word,0.9)} aria-label={`朗读 ${word.word}`}>听发音</button></div>
    <p className="mt-2 text-muted"><span lang="en">{word.phonetic||'暂无音标'} · {word.pos||'未标注词性'}</span><span className="ml-3 rounded-pill bg-brand-soft px-2 py-1 text-caption text-brand-strong">{word.level}</span></p><p className="mt-5 text-lg font-medium">{word.cn}</p>
    {word.example&&<div className="mt-5 rounded-btn bg-canvas p-4"><p lang="en" className="leading-7">{word.example}</p><p className="mt-2 text-caption text-muted">{word.exampleCn}</p></div>}
    {!!word.synonyms.length&&<div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-caption text-muted">近义词</span>{word.synonyms.map((word)=><span key={word} lang="en" className="rounded-pill border border-line px-3 py-1 text-caption">{word}</span>)}</div>}
  </>;
}
export function WordStudy({date,queue,book,mode,speech}:{date:string;queue:StudyQueue;book:Word[];mode:'daily'|'notebook';speech:SpeechControls}){
  const state=useEnglishStore((state)=>state);const toast=useToast();const [index,setIndex]=useState(0);
  const entries: {word:Word;mode:StudyMode}[]=mode==='notebook'?book.map((word)=>({word,mode:'notebook'})):[...[...queue.reviewWordIds,...queue.newWordIds].flatMap((id)=>{const word=state.words.find((word)=>word.id===id);return word?[{word,mode:'main' as const}]:[];}),...queue.retryWordIds.flatMap((id)=>{const word=state.words.find((word)=>word.id===id);return word?[{word,mode:'retry' as const}]:[];})];
  const at=Math.min(index,Math.max(0,entries.length-1));const entry=entries[at];
  const completed=(id:string,part:StudyMode)=>part==='main'?queue.completedWordIds.includes(id):part==='retry'?!!queue.retryCompletedWordIds?.includes(id):false;
  const done=entries.filter((entry)=>completed(entry.word.id,entry.mode)).length;
  const progress=entry?state.wordProgress.find((item)=>item.wordId===entry.word.id):undefined;
  const rate=(result:WordProgress['lastResult'])=>{if(!entry)return;try{state.rate(date,entry.word.id,result,entry.mode);speech.stop();
      // 再练会追加到当天队尾，不能只按点击前的队列长度截断。
      if(mode==='daily'||result!=='know')setIndex(at+1);toast(result==='unknown'&&entry.mode==='main'?'已加入生词本，队尾再练一次':entry.mode==='retry'?'已完成再练，正式复习排期保持不变':'学习记录已保存');
    }catch(reason){toast(reason instanceof Error?reason.message:'保存失败',true);}};
  return <Card id="word-study" title={mode==='daily'?'今天的词卡':'只练生词本'} subtitle={mode==='daily'?`复习 ${queue.reviewWordIds.length} · 新词 ${queue.newWordIds.length} · 再练 ${queue.retryWordIds.length}`:`${book.length} 个待巩固词，认识后移出生词本`}>
    {!entry?<div className="py-8 text-center text-muted">{mode==='notebook'?'生词本是空的，遇到模糊或不认识的词会自动加入。':'今天没有待学词。词库全部学过后，仍会按日期安排复习。'}</div>:<>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-caption text-muted"><span>第 {at+1} / {entries.length} 张 · {entry.mode==='retry'?'当天再练':entry.mode==='notebook'?'生词本':queue.newWordIds.includes(entry.word.id)?'新词':'到期复习'}</span>{mode==='daily'&&<span>已完成 {done} / {entries.length}</span>}</div>
      <WordDetails word={entry.word} speech={speech}/>
      {progress&&<p className="mt-4 text-caption text-muted">下次复习：{progress.nextReview}{progress.lastAdvancedDate===date?' · 今天已安排，再练不会推迟日期':''}</p>}
      {completed(entry.word.id,entry.mode)?<p role="status" className="mt-5 rounded-btn bg-brand-soft p-3 text-brand-strong">这张已完成，可翻页继续。正式排期以今天第一次回答为准。</p>:<div className="mt-6 grid grid-cols-3 gap-2">{([['know','认识'],['fuzzy','模糊'],['unknown','不认识']] as const).map(([result,label])=><button key={result} data-rate={result} className={`btn ${result==='know'?'btn-primary':'btn-secondary'}`} onClick={()=>rate(result)}>{label}</button>)}</div>}
      <div className="mt-4 flex justify-between gap-3"><button className="btn btn-secondary" disabled={at===0} onClick={()=>{speech.stop();setIndex(at-1);}}>上一张</button><button className="btn btn-secondary" disabled={at>=entries.length-1} onClick={()=>{speech.stop();setIndex(at+1);}}>下一张</button></div>
      {mode==='daily'&&done===entries.length&&<p className="mt-4 font-medium text-brand-strong">今天的词卡练完了，做得很好。</p>}
    </>}
  </Card>;
}
