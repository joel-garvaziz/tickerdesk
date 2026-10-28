// Run with node tests/run-tests.js. Drives the real page script with a small DOM stub.
const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
const makeNode=()=>{const node={children:[],dataset:{},style:{setProperty(){}},attributes:{},textContent:'',innerHTML:'',value:'',classList:{add(){},remove(){},toggle(){}},
 append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children;this.textContent=''},
 setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},getBoundingClientRect(){return{width:Math.max(1,(this.textContent||'').length*10+this.children.reduce((n,x)=>n+x.getBoundingClientRect().width,0))}},
 click(){},scrollIntoView(){},closest(){return this},querySelector(){return makeNode()}};
 return new Proxy(node,{get:(t,k)=>k in t?t[k]:(t[k]=makeNode()),set:(t,k,v)=>(t[k]=v,true)})};
const els={},handlers={};let blob=null,mockFetch=async()=>({ok:true,json:async()=>({mode:'failed',error:'API unavailable'})});
const document={getElementById:id=>els[id]||(els[id]=makeNode()),addEventListener:(type,fn)=>{handlers[type]=fn},
 createElement:()=>makeNode(),querySelectorAll:()=>[],querySelector:()=>makeNode(),activeElement:null};
els.language=makeNode();els.language.value='en';els.inp=makeNode();els.inp.value='';els.q=makeNode();
const A=new Function('document','URL','Blob','window','fetch','setTimeout','clearTimeout','setInterval',
 js+';return {S,B,live,valid,fallback,fallbackMalayalam,fallbackFor,grounded,wc,drift,parseBatch,SAMPLES,generate,mk,ui,bx,card}')(document,
 {createObjectURL:()=>'blob:x',revokeObjectURL(){}},function(parts){blob=parts[0]},
 {addEventListener(){}},(...args)=>mockFetch(...args),()=>1,()=>{},()=>1);
const {S,B,live,fallback,fallbackMalayalam,fallbackFor,grounded,wc,parseBatch,SAMPLES,generate}=A;
let checks=0;const ok=(condition,message)=>{assert(condition,message);checks++;console.log('ok -',message)};
const click=dataset=>handlers.click({target:{closest:()=>({dataset})}});
const type=(id,value)=>handlers.input({target:{dataset:{edit:id},value,closest:()=>makeNode()}});
const language=value=>{els.language.value=value;els.language.onchange()};
async function main(){
 ok(!html.includes('AI mode: OpenAI drafts a ticker'),'the removed AI information banner stays absent');
 ok(html.includes('@keyframes ticker-scroll')&&!html.includes('@keyframes fd'),'broadcast uses continuous scrolling without fade transitions');
 for(const source of SAMPLES)for(const version of[0,1,2]){const result=fallback(source,version);assert(wc(result.text)<=10&&(!result.text||grounded(source,result.text)))}
 ok(true,'English fallback candidates stay within 10 words and grounded in source');
 ok(!/resign|500/i.test(fallback(SAMPLES[6]).text),'instruction-like source text is not copied into a ticker');
 ok(parseBatch('A.\n\n\nB.\n\nC.').length===3,'batch import preserves announcement boundaries');
 const mlSource='തിരുവനന്തപുരം നഗരത്തിൽ 2027 ജൂൺ 3ന് പുതിയ പാലം തുറന്നു.';
 ok(wc('കേരളത്തിൽ 2027 ജൂൺ 3ന് പാലം തുറന്നു.')===6,'Malayalam whitespace-token word counting handles Unicode text');
 ok(wc('കേരളം । 2027')===2,'Malayalam punctuation does not count as a word');
 ok(fallbackMalayalam(mlSource).text===mlSource,'Malayalam source fallback is extractive and preserves Unicode');
 ok(fallbackMalayalam(SAMPLES[0]).text===''&&fallbackFor(SAMPLES[0],'ml').text==='','English source never becomes a fabricated Malayalam fallback');

 S.mode='batch';els.inp.value=SAMPLES.join('\n\n');els.m2.onclick();
 await generate(SAMPLES);
 ok(S.items.length===7&&new Set(S.items.map(item=>item.sid)).size===7,'English batch fallback creates separate source-linked items');
 ok(live().length===0&&S.items.every(item=>item.status!=='approved'),'generated tickers require editor approval');
 const ids=S.items.slice(0,3).map(item=>item.id);ids.forEach(id=>click({a:'approve',id}));
 ok(live().length===3,'approval adds English tickers to the broadcast');
 const priorityId=live()[0].id;handlers.change({target:{dataset:{pri:priorityId},value:'breaking'}});
 ok(els.bxt.children[0].children[0].children[0].textContent==='BREAKING NEWS','priority changes update scrolling headline labels');
 S.items[1].pri='breaking';
 ok(live().map(item=>item.id).join()===ids.join(),'live ticker order follows editor order');
 click({a:'down',id:ids[0]});ok(live()[1].id===ids[0],'reordering changes broadcast order');
 type(ids[1],'one two three four five six seven eight nine ten eleven');
 ok(S.items.find(item=>item.id===ids[1]).status!=='approved'&&live().length===2,'over-limit edits withdraw approval immediately');
 click({a:'approve',id:ids[1]});ok(live().length===2,'over-limit English ticker cannot be approved');
 click({a:'revert',id:ids[1]});click({a:'approve',id:ids[1]});ok(live().length===3,'revert and re-approval remain functional');
 click({a:'del',id:ids[2]});ok(S.items.length===7,'first delete click requests confirmation');
 click({a:'del',id:ids[2]});ok(S.items.length===6&&!live().some(item=>item.id===ids[2]),'confirmed deletion removes the ticker from broadcast');
 const regenerated=S.items.find(item=>item.id===ids[0]);click({a:'regen',id:ids[0]});
 ok(regenerated.status!=='approved'&&grounded(regenerated.source,regenerated.text)&&wc(regenerated.text)<=10,'English regeneration stays source-grounded and withdraws approval');
 click({a:'preview',id:S.items[3].id});ok(S.sel===S.items[3].id&&els.bxl.textContent==='PREVIEW','preview selects one independent ticker');
 els.bxr.onclick();ok(S.sel===null,'return-to-live control exits preview');
 click({a:'approve',id:ids[0]});click({a:'reject',id:S.items[3].id});els.exp.onclick();
 let exported=JSON.parse(blob);
 ok(exported.tickers.every(item=>item.status==='approved'&&item.word_count<=10)&&exported.tickers.length===live().length,'export includes only approved valid English tickers');
 ok(exported.tickers.map(item=>item.position).join()===exported.tickers.map((_,i)=>i+1).join(),'export preserves editor order');

 S.items=[];S.sel=null;language('en');
 let requests=[];mockFetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);return{ok:true,json:async()=>({mode:'llm',ticker:'Kochi transit line opens in 2028',evidence:['Kochi transit line opens in 2028'],flags:[]})}};
 await generate(['Kochi transit line opens in 2028']);
 ok(requests.at(-1).language==='en'&&S.items[0].lang==='en','English generation sends language and stores metadata');

 language('ml');mockFetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);return{ok:true,json:async()=>({mode:'llm',ticker:'കൊച്ചിയിൽ 2028ൽ പുതിയ പാത തുറക്കും',evidence:['Kochi transit line opens in 2028'],flags:['Verify Malayalam translation against source.']})}};
 await generate(['Kochi transit line opens in 2028']);
 const malayalam=S.items.at(-1);
 ok(requests.at(-1).language==='ml'&&malayalam.lang==='ml'&&/[\u0D00-\u0D7F]/u.test(malayalam.text),'Malayalam generation returns Unicode ticker with language metadata');
 ok(wc(malayalam.text)<=10&&malayalam.warns.some(flag=>flag.includes('Verify Malayalam translation')),'Malayalam word limit and translation review flag are applied');
 ok(A.card(malayalam,0).includes('കൊച്ചിയിൽ')&&A.card(malayalam,0).includes('lang="ml"'),'Malayalam review card marks and renders its language');

 language('both');mockFetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);return{ok:true,json:async()=>({mode:'llm',english_ticker:'Kochi transit line opens in 2028',malayalam_ticker:'കൊച്ചിയിൽ 2028ൽ പുതിയ പാത തുറക്കും',evidence:['Kochi transit line opens in 2028'],flags:[]})}};
 await generate(['Kochi transit line opens in 2028']);
 const pair=S.items.slice(-2);
 ok(pair.length===2&&pair[0].lang==='en'&&pair[1].lang==='ml'&&pair[0].sid===pair[1].sid,'bilingual generation creates paired, independently reviewable tickers');
 const liveBeforePair=live().length;
 click({a:'approve',id:pair[0].id});click({a:'approve',id:pair[1].id});
 ok(live().length===liveBeforePair+2&&live().filter(item=>item.sid===pair[0].sid).length===2,'both language versions can be approved independently');
 A.bx();const group=els.bxt.children[0].children[0];
 ok(group.children.some(item=>item.lang==='ml')&&group.children.some(item=>item.lang==='en'),'broadcast sequence includes English and Malayalam headlines');
 click({a:'reject',id:pair[1].id});
 ok(!live().some(item=>item.id===pair[1].id),'rejecting one language version removes only that ticker from broadcast');
 click({a:'preview',id:pair[1].id});
 ok(S.sel===pair[1].id&&els.bxl.textContent==='PREVIEW','Malayalam version previews independently');
 els.bxr.onclick();
 click({a:'approve',id:pair[1].id});els.exp.onclick();exported=JSON.parse(blob);
 const exportedMalayalam=exported.tickers.find(item=>item.id===pair[1].id);
 ok(exportedMalayalam.language==='ml'&&exportedMalayalam.ticker_text.includes('കൊച്ചിയിൽ'),'JSON export preserves Malayalam Unicode and language metadata');

 S.items=[];language('ml');mockFetch=async()=>({ok:true,json:async()=>({mode:'failed',error:'API unavailable'})});
 await generate(['Kochi transit line opens in 2028']);
 ok(S.items.length===1&&S.items[0].text===''&&S.items[0].status==='review'&&!A.valid(S.items[0]),'API failure requires manual Malayalam text instead of translating or fabricating');
 language('both');await generate([mlSource]);
 const safePair=S.items.slice(-2);
 ok(safePair[0].text===''&&safePair[1].text===mlSource&&safePair.every(item=>item.status==='review'),'bilingual API failure provides only source-based fallback and manual-review flags');
 console.log('\nAll '+checks+' frontend checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1});
