import { describe,expect,it } from 'vitest';
import { parseWordCsv } from './wordCsv';
const header='word,phonetic,pos,cn,example,exampleCn';
describe('本地词库CSV解析',()=>{
  it('BOM、CRLF、空选填列和外侧空格',()=>{expect(parseWordCsv(`\uFEFF${header}\r\n podcast ,,, 播客 ,,\r\n`)).toEqual([{word:'podcast',cn:'播客',phonetic:'',pos:'',example:'',exampleCn:''}]);});
  it('引号内逗号、转义引号和换行不拆错列',()=>{expect(parseWordCsv(`${header}\nhello,/həˈloʊ/,int.,你好,"Say ""hello,""\nand smile.",微笑打招呼`)[0]!.example).toBe('Say "hello,"\nand smile.');});
  it('词组和连字符、撇号合法',()=>{expect(parseWordCsv(`${header}\nsave draft,,,保存草稿,,\nwrap-up,,,收尾,,\ncan't,,,不能,,`)).toHaveLength(3);});
  it.each(['word,cn\na,甲',`${header}\nhello,,,你好,`,`${header}\nhello,,,你好,,,`,`${header}\n,,,你好,,`,`${header}\nhello,,,,,`,`${header}\n你好,,,你好,,`,`${header}\nhello,,,你好,"oops,你好`,`${header}\nhello,,,你好,"a"b,你好`,`${header}\nhe"llo,,,你好,,`])('坏文件拒绝而非悄悄丢行 %s',(text)=>{expect(()=>parseWordCsv(text)).toThrow();});
  it('空文件、只有表头和过长内容拒绝',()=>{expect(()=>parseWordCsv('')).toThrow('表头');expect(()=>parseWordCsv(header)).toThrow('没有词条');expect(()=>parseWordCsv('a'.repeat(2*1024*1024+1))).toThrow('2MB');expect(()=>parseWordCsv(`${header}\nhello,,,你好,${'x'.repeat(2001)},`)).toThrow('内容过长');});
  it('最多2000行，超出明确拒绝',()=>{expect(parseWordCsv(header+'\n'+Array(2000).fill('word,,,词,,').join('\n'))).toHaveLength(2000);expect(()=>parseWordCsv(header+'\n'+Array(2001).fill('word,,,词,,').join('\n'))).toThrow('2000');});
});
