import { useState } from 'react';
import type { Passage } from '../../types';
import { Card } from '../../components/Card';
import { Sheet } from '../../components/Sheet';
import { lookupWord } from '../../domain/srs';
import { WordDetails } from './WordStudy';
import { useEnglishStore } from './store';
import type { SpeechControls } from './useSpeech';

export function ReadingCard({passage,speech}:{passage:Passage;speech:SpeechControls}){
  const words=useEnglishStore((state)=>state.words);const [token,setToken]=useState<string>();const found=token?lookupWord(token,words):undefined;
  const parts=passage.en.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g);
  return <><Card title="每天一小篇" subtitle="点英文单词查本地词库，未收录的不会联网查询" id="daily-reading"><h3 className="mb-3 text-lg font-semibold" lang="en">{passage.title}</h3>
    <p lang="en" className="text-base leading-[2.9]">{parts.map((part,index)=>/^[A-Za-z]/.test(part)?<button key={index} className="inline-block min-h-11 rounded px-0.5 text-left underline decoration-line underline-offset-4 hover:bg-brand-soft focus-visible:bg-brand-soft" onClick={()=>{speech.stop();setToken(part);}}>{part}</button>:<span key={index}>{part}</span>)}</p>
    <details className="mt-4 rounded-btn bg-canvas p-4"><summary className="min-h-11 cursor-pointer py-2 font-medium">中文参考大意</summary><p className="pt-2 leading-7 text-muted">{passage.cn}</p></details>
  </Card><Sheet open={!!token} title="本地查词" onClose={()=>{speech.stop();setToken(undefined);}}>{found?<WordDetails word={found} speech={speech}/>:<div><p lang="en" className="break-words text-2xl font-semibold">{token}</p><p className="mt-4 text-muted">未收录。当前只查本地词条原形，不自动识别词形变化；可在设置中导入自己的词库。</p></div>}</Sheet></>;
}
