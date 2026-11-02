import { useEffect,useRef,useState } from 'react';
import type { Sentence,Word } from '../../types';
import { Card } from '../../components/Card';
import { KpiGrid } from '../../components/KpiGrid';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useSettingsStore } from '../settings/store';
import { useWorkDate } from '../../lib/useWorkDate';
import { fmtDate,fmtWeekday } from '../../lib/date';
import { englishStats,notebookWords } from '../../domain/srs';
import { englishPassages,englishSentences } from '../../data/englishContent';
import { useEnglishStore } from './store';
import { useSpeech } from './useSpeech';
import { WordStudy } from './WordStudy';
import { ReadingCard } from './ReadingCard';
import { GrammarPractice,MistakeBook } from './GrammarPractice';
import { RecordingSheet } from './RecordingSheet';

function useStudyTime(date:string){
  const addTime=useEnglishStore((state)=>state.addStudyTime);const toast=useToast();const failed=useRef(false);
  useEffect(()=>{let last=performance.now();let visible=document.visibilityState==='visible';
    const flush=()=>{const now=performance.now();if(visible){try{addTime(date,Math.min((now-last)/1000,30));}catch(reason){if(!failed.current){toast(reason instanceof Error?reason.message:'学习时长保存失败',true);failed.current=true;}}}last=now;};
    const change=()=>{flush();visible=document.visibilityState==='visible';};const timer=window.setInterval(flush,30000);document.addEventListener('visibilitychange',change);
    return ()=>{flush();window.clearInterval(timer);document.removeEventListener('visibilitychange',change);};
  },[date,addTime,toast]);
}
export function EnglishPage(){
  const hour=useSettingsStore((state)=>state.settings.dayStartHour);const today=useWorkDate(hour);const state=useEnglishStore((state)=>state);const speech=useSpeech();const toast=useToast();
  const [mode,setMode]=useState<'daily'|'notebook'>('daily');const [recording,setRecording]=useState<Sentence>();const [removing,setRemoving]=useState<Word>();const [search,setSearch]=useState('');const [limit,setLimit]=useState(20);
  useEffect(()=>{try{state.ensureDay(today);}catch(reason){toast(reason instanceof Error?reason.message:'今天的计划未能保存',true);}},[today,state.ensureDay,toast]);
  useEffect(()=>{speech.stop();setRecording(undefined);},[today,speech.stop]);
  useStudyTime(today);
  const queue=state.studyQueue.find((entry)=>entry.date===today);const book=notebookWords(state.words,state.wordProgress);const stats=englishStats(state.wordProgress,state.shadowingLogs,state.studyQueue,state.studyLogs,today);
  const filtered=book.filter((word)=>`${word.word} ${word.cn}`.toLowerCase().includes(search.toLowerCase().trim()));const passage=englishPassages.find((passage)=>passage.id===queue?.passageId);
  return <><div className="page-heading"><p className="eyebrow">一点一点，把表达变熟悉</p><h1>英语学习</h1><p>{fmtDate(today)} {fmtWeekday(today)} · 凌晨 {hour} 点换新一天</p></div>
    <Card className="mb-5"><KpiGrid items={[{label:'累计学过单词',value:String(stats.words),hint:'有正式回答的不同词条'},{label:'跟读完成',value:String(stats.sentences),hint:'按天手动勾选的句子数'},{label:'语法练习',value:String(stats.exercises),hint:'首次作答的题次'},{label:'连续学习',value:`${stats.streak} 天`,hint:'今天未学时保留截至昨日'}]}/>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-caption text-muted">{speech.hint}</p>{speech.speaking&&<button className="btn btn-secondary" onClick={speech.stop}>停止朗读</button>}</div>
    </Card>
    {!queue?<Card><p role="status">正在准备今天的计划。若本机存储不可用，请检查浏览器权限后重新打开。</p></Card>:<>
      <div className="mb-5 flex flex-wrap items-center gap-3" role="group" aria-label="词卡练习范围"><button className={`btn ${mode==='daily'?'btn-primary':'btn-secondary'}`} aria-pressed={mode==='daily'} onClick={()=>{speech.stop();setMode('daily');}}>今日计划</button><button className={`btn ${mode==='notebook'?'btn-primary':'btn-secondary'}`} aria-pressed={mode==='notebook'} onClick={()=>{speech.stop();setMode('notebook');}}>只背生词本 · {book.length}</button><span className="text-caption text-muted">今天的内容已固定保存，刷新后继续。</span></div>
      <div className="grid items-start gap-5 lg:grid-cols-2"><WordStudy key={`${today}-${mode}`} date={today} queue={queue} book={book} mode={mode} speech={speech}/>
        <Card title="把句子说出口" subtitle="每天 5 句；播放和录音不会自动标记完成" id="daily-shadowing"><div className="divide-y divide-line">{queue.sentenceIds.map((id)=>{const sentence=englishSentences.find((sentence)=>sentence.id===id);if(!sentence)return null;const done=state.shadowingLogs.some((log)=>log.date===today&&log.sentenceId===id&&log.done);return <div key={id} className="py-4 first:pt-0 last:pb-0"><span className="text-caption text-muted">{sentence.tag}</span><p lang="en" className="mt-2 leading-7">{sentence.en}</p><p className="mt-1 text-caption text-muted">{sentence.cn}</p><div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-secondary" disabled={!speech.ready} onClick={()=>speech.speak(sentence.en,1)}>正常读</button><button className="btn btn-secondary" disabled={!speech.ready} onClick={()=>speech.speak(sentence.en,0.7)}>慢速读</button><button className="btn btn-secondary" onClick={()=>{speech.stop();setRecording(sentence);}}>录音跟读</button><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-btn px-2 text-caption"><input type="checkbox" checked={done} aria-label={`完成跟读 ${sentence.en}`} onChange={()=>{try{state.toggleSentence(today,id);}catch(reason){toast(reason instanceof Error?reason.message:'保存失败',true);}}}/>已跟读</label></div></div>;})}</div></Card>
        {passage&&<ReadingCard key={passage.id} passage={passage} speech={speech}/>}
        <GrammarPractice key={today} queue={queue}/>
        <Card title="我的生词本" subtitle="模糊、不认识会自动加入；移出只影响本子，不取消正式复习" id="notebook"><label className="field-label" htmlFor="notebook-search">找一个词</label><input className="field mb-3" id="notebook-search" placeholder="英文或中文" value={search} onChange={(event)=>{setSearch(event.target.value);setLimit(20);}}/><ul className="divide-y divide-line">{filtered.slice(0,limit).map((word)=><li key={word.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p lang="en" className="break-words font-semibold">{word.word}</p><p className="mt-1 text-caption text-muted">{word.cn}</p></div><button className="btn btn-secondary shrink-0" aria-label={`移出 ${word.word}`} onClick={()=>setRemoving(word)}>移出</button></li>)}</ul>{!filtered.length&&<p className="py-3 text-muted">{book.length?'没有找到这个词。':'生词本暂时是空的。'}</p>}{filtered.length>limit&&<button className="btn btn-secondary mt-3" onClick={()=>setLimit(limit+20)}>再看 20 个词</button>}<a className="mt-4 inline-flex min-h-11 items-center text-caption text-brand-strong underline underline-offset-4" href="#/more/settings">去设置导入自己的词库 →</a></Card>
        <MistakeBook/>
      </div>
    </>}
    {recording&&<RecordingSheet sentence={recording} onClose={()=>setRecording(undefined)}/>}
    <ConfirmDialog open={!!removing} title="移出生词本？" confirmLabel="移出" onClose={()=>setRemoving(undefined)} onConfirm={()=>{if(removing){state.removeNotebook(removing.id);toast('已移出生词本，正式复习排期保留');}}}><p className="text-muted">{removing?.word} 将从生词本移出，学习历史与下次复习日期保留。</p></ConfirmDialog>
  </>;
}
