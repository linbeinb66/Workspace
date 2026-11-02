export interface ImportedWord {word:string;phonetic:string;pos:string;cn:string;example:string;exampleCn:string}
const headers=['word','phonetic','pos','cn','example','exampleCn'] as const;
export function parseWordCsv(text:string):ImportedWord[]{
  if(text.length>2*1024*1024)throw new Error('词库文件超过 2MB，请分批导入');
  const source=text.replace(/^\ufeff/,'');const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;let endedQuote=false;
  for(let index=0;index<source.length;index++){const char=source[index]!;if(quoted){if(char==='"'){if(source[index+1]==='"'){cell+='"';index++;}else{quoted=false;endedQuote=true;}}else cell+=char;continue;}
    if(char==='"'){if(cell||endedQuote)throw new Error('CSV 引号位置有误');quoted=true;}
    else if(char===','){row.push(cell);cell='';endedQuote=false;}
    else if(char==='\r'||char==='\n'){if(char==='\r'&&source[index+1]==='\n')index++;row.push(cell);if(row.some((value)=>value.trim()))rows.push(row);row=[];cell='';endedQuote=false;}
    else{if(endedQuote&&char.trim())throw new Error('CSV 引号后只能跟逗号或换行');if(!endedQuote)cell+=char;}
  }
  if(quoted)throw new Error('CSV 有未闭合的引号');row.push(cell);if(row.some((value)=>value.trim()))rows.push(row);
  const head=rows.shift()?.map((value)=>value.trim());if(!head||head.length!==headers.length||head.some((value,index)=>value!==headers[index]))throw new Error('表头需为 word,phonetic,pos,cn,example,exampleCn');
  if(!rows.length)throw new Error('CSV 没有词条');if(rows.length>2000)throw new Error('一次最多导入 2000 条，请分批处理');
  return rows.map((values,index)=>{if(values.length!==headers.length)throw new Error(`第 ${index+2} 行列数有误`);const [word='',phonetic='',pos='',cn='',example='',exampleCn='']=values.map((value)=>value.trim());if(!/^[a-z]+(?:[ '\-’][a-z]+)*$/i.test(word)||word.length>60||!cn)throw new Error(`第 ${index+2} 行需要英文词条和中文释义`);if(values.some((value)=>value.length>2000))throw new Error(`第 ${index+2} 行内容过长`);return {word,phonetic,pos,cn,example,exampleCn};});
}
