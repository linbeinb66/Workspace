import words from './english.words.json';
import sentences from './english.sentences.json';
import passages from './english.passages.json';
import grammar from './english.grammar.json';
import type { Word,Sentence,Passage,GrammarQuestion } from '../types';

// 全部为随应用提供的自编学习材料，不请求在线词典或内容服务。
const meta={demo:false,updatedAt:'2026-11-01T00:00:00.000Z'};
export const englishWords:Word[]=words.map((word)=>({...word,...meta,level:word.level as Word['level']}));
export const englishSentences:Sentence[]=sentences.map((sentence)=>({...sentence,...meta}));
export const englishPassages:Passage[]=passages.map((passage)=>({...passage,...meta}));
export const englishGrammar:GrammarQuestion[]=grammar.map((question)=>({...question,...meta}));
