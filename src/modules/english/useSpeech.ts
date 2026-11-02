import { useCallback,useEffect,useRef,useState } from 'react';

export function useSpeech(){
  const [ready,setReady]=useState(false);const [hint,setHint]=useState('正在检查本机英语声线…');
  const [speaking,setSpeaking]=useState(false);const voice=useRef<SpeechSynthesisVoice>();const utterance=useRef<SpeechSynthesisUtterance>();
  useEffect(()=>{
    if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){setHint('此浏览器不支持朗读，可换用 Edge 或 Chrome。');return;}
    let active=true;
    const load=()=>{const english=window.speechSynthesis.getVoices().filter((item)=>item.localService&&/^en(?:-|_|$)/i.test(item.lang));voice.current=english.find((item)=>/^en-US$/i.test(item.lang))??english[0];
      if(active){setReady(!!voice.current);setHint(voice.current?'使用本机英语声线；断网能否出声取决于系统语音包。':'未找到本机英语声线，请在系统设置中下载英语语音包后重开页面。');}};
    load();window.speechSynthesis.addEventListener('voiceschanged',load);const timer=window.setTimeout(load,1500);
    return ()=>{active=false;window.clearTimeout(timer);window.speechSynthesis.removeEventListener('voiceschanged',load);window.speechSynthesis.cancel();};
  },[]);
  const stop=useCallback(()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();setSpeaking(false);},[]);
  const speak=useCallback((text:string,rate=0.9)=>{
    if(!voice.current){setHint('未找到本机英语声线，请安装英语语音包后重试。');return;}
    window.speechSynthesis.cancel();const current=new SpeechSynthesisUtterance(text);current.voice=voice.current;current.lang='en-US';current.rate=rate;utterance.current=current;
    current.onstart=()=>{if(utterance.current===current)setSpeaking(true);};current.onend=()=>{if(utterance.current===current)setSpeaking(false);};
    current.onerror=(event)=>{if(utterance.current===current){setSpeaking(false);if(!['canceled','interrupted'].includes(event.error))setHint('朗读未能播放，请检查系统英语语音包和设备音量后重试。');}};
    try{window.speechSynthesis.speak(current);}catch{setHint('朗读未能启动，请检查系统语音包后重试。');setSpeaking(false);}
  },[]);
  return {ready,hint,speaking,speak,stop};
}
export type SpeechControls=ReturnType<typeof useSpeech>;
