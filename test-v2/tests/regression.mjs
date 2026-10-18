import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const layout=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('world-layout.js',root),'utf8')).toString('base64'));
const element=()=>({classList:{add(){},remove(){},toggle(){}},querySelectorAll:()=>[],appendChild(){},append(){},insertBefore(){},setAttribute(){},style:{},value:'',textContent:'',innerHTML:''});
const elements=new Map();const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelector:element};
const context=vm.createContext({document,window:{MACHTENTEMPEL_FIREBASE:{},prompt:()=>'',confirm:()=>true},console,Date,Math,setInterval(){},clearInterval(){},alert(){},confirm:()=>true,localStorage:{setItem(){}}});
let source=readFileSync(new URL('game.js',root),'utf8').split('/* GETEKENDE SPELWERELD */')[0];
source+='\nlet fantasyPortraits=null,worldError="";globalThis.api={addTeam,handleRequest,startGame,beginFinal,getQuestion,finaleVraag,finaleChoices,mathExpressionHtml,reset(){state=newState();host=true;demo=true;online=false;room="TEST";view="test";},get state(){return state;}};';
vm.runInContext(source,context);const api=context.api;
for(const count of [3,8,30]){
 api.reset();const ids=Array.from({length:count},(_,i)=>api.addTeam('Team '+i));
 assert.equal(new Set(ids.map(id=>api.state.teams[id].slot)).size,count);
 for(let step=0;step<=6;step++){
  const points=ids.map(id=>layout.teamPosition({...api.state.teams[id],step},'playing'));
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>=1.19,`overlap: ${count} teams, step ${step}`);
 }
 await api.startGame();assert.equal(api.state.phase,'avatars');
 for(let i=0;i<count;i++)await api.handleRequest({action:'answer',teamId:ids[i],answer:i});
 await api.startGame();assert.equal(api.state.phase,'playing');
 for(const id of ids){
  const t=api.state.teams[id];const q=api.getQuestion(t);await api.handleRequest({action:'submitTokens',teamId:id,sequence:q.answer.length===1?[(q.answer[0]+1)%q.tokens.length]:[...q.answer].reverse()});
  assert.equal(t.step,0);assert.equal(t.wrong,1);
  for(let stage=0;stage<6;stage++){
   const request={action:'submitTokens',teamId:id,sequence:[...api.getQuestion(t).answer],atSolved:t.solved,atWrong:t.wrong};
   await api.handleRequest(request);const solved=t.solved;await api.handleRequest(request);assert.equal(t.solved,solved,'duplicate advances stage');
  }
  assert.equal(t.step,6);assert.equal(t.finished,true);
 }
 await api.beginFinal();assert.equal(api.state.phase,'final');
 const positions=ids.map(id=>layout.teamPosition(api.state.teams[id],'final'));
 assert.equal(new Set(positions.map(p=>p.x)).size,count);
 if(count===30){
  const challenger=api.state.teams[ids[0]],opponent=api.state.teams[ids[16]];
  await api.handleRequest({action:'answer',teamId:challenger.id,answer:opponent.slot,challengeTarget:true});
  const duel=api.state.duels[challenger.duel];assert.equal(duel.b,opponent.id,'wrong opponent after eight teams');
  duel.done=true;challenger.duel='';opponent.duel='';
 }
 const winner=api.state.teams[ids[0]];
 while(api.state.phase==='final'){
  const before=winner.finalPos;const request={action:'final',teamId:winner.id,answer:api.finaleChoices(api.finaleVraag(winner)).correct,atPosition:before};
  await api.handleRequest(request);assert.equal(winner.finalPos,before+1);
  await api.handleRequest(request);assert.equal(winner.finalPos,before+1,'duplicate advances race');
 }
 assert.equal(winner.finalPos,16);assert.equal(api.state.winner,winner.id);
 console.log(`PASS ${count} teams: unique slots/avatars, all 6 stages, wrong answers, duplicates, race to 16${count===30?', exact duel opponent':''}`);
}
api.reset();const a=api.addTeam('A'),b=api.addTeam('B');await api.startGame();assert.equal(api.state.phase,'lobby','2 teams should not start');
const c=api.addTeam('C');await api.startGame();await api.handleRequest({action:'answer',teamId:a,answer:5});await api.handleRequest({action:'answer',teamId:b,answer:5});assert.equal(api.state.teams[b].avatar,undefined,'duplicate avatar accepted');
assert.equal(api.mathExpressionHtml('4a^2b^2'),'4a<sup>2</sup>b<sup>2</sup>');
assert.equal(api.mathExpressionHtml('x^(p+1)'),'x<sup>p+1</sup>');
assert.ok(api.mathExpressionHtml('a^2/b^2').includes('math-fraction'));
assert.ok(api.mathExpressionHtml('1/a^2b^2').includes('math-den">a<sup>2</sup>b<sup>2</sup>'));
console.log('PASS minimum teams, exclusive avatars and algebraic typography');
