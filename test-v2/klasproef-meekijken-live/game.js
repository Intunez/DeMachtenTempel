
/* De Machtentempel — live klassenspel met Firebase */

const $ = id => document.getElementById(id);
const screens = ['welcome', 'setup', 'join', 'teacher', 'student'];

const colors = [
  '#f5bf5b', '#67c8ff', '#f77c6d', '#ab8cff',
  '#75d5a2', '#f3a7db', '#e4f37c', '#ffac64'
];

const cfg = window.MACHTENTEMPEL_FIREBASE || {};
const configured = !!(
  cfg.apiKey && cfg.databaseURL && cfg.projectId && cfg.appId
);

let firebase = null;
let db = null;
let auth = null;
let online = false;
let host = false;
let room = '';
let teamId = '';
let state = null;
let timerHandle = null;
let unsub = null;
let reqUnsub = null;
let joinUnsub = null;
let demo = false;
let view = 'welcome';
let currentSignature = '';
let requestQueue = Promise.resolve();

/* Eigen soundtrack: test-v2/muziek spel.mp3; browser start na gebruikersklik. */
const templeAudio=(()=>{
 const player=new Audio('./muziek%20spel.mp3');
 player.loop=true;player.preload='auto';player.volume=.75;
 let enabled=false;
 function update(){const wrap=document.querySelector('.temple-audio-controls');if(wrap){const allowed=view==='teacher'||(view==='student'&&room==='SOLO');wrap.hidden=!allowed;if(!allowed&&enabled){player.pause();enabled=false;}}const b=document.getElementById('templeMusicToggle');if(b){b.textContent=enabled?'♫ Muziek aan':'♪ Muziek uit';b.setAttribute('aria-pressed',String(enabled));}}
 async function toggle(){if(enabled){player.pause();enabled=false;update();return;}try{await player.play();enabled=true;update();}catch(e){console.warn('MP3 kan niet afspelen',e);const b=document.getElementById('templeMusicToggle');if(b){b.title='MP3 nog niet beschikbaar op de website';b.textContent='♫ Muziek niet beschikbaar';}}}
 function setVolume(v){player.volume=Math.max(0,Math.min(1,Number(v)/100));}
 function mount(){if(document.getElementById('templeMusicToggle'))return;
  const wrap=document.createElement('div');wrap.className='temple-audio-controls';
  const button=document.createElement('button');button.id='templeMusicToggle';button.type='button';button.className='ghost';button.onclick=toggle;
  const label=document.createElement('label');label.textContent='Volume ';
  const slider=document.createElement('input');slider.id='templeMusicVolume';slider.type='range';slider.min='0';slider.max='100';slider.value='75';slider.oninput=()=>setVolume(slider.value);
  label.appendChild(slider);wrap.append(button,label);document.body.appendChild(wrap);update();
 }
 return {mount,cue(){},toggle,update};
})();
const POINTS = {
  entry: [.10, .84],
  a: [.23, .71],
  b: [.22, .52],
  c: [.34, .35],
  d: [.48, .22],
  e: [.64, .34],
  f: [.76, .51],
  g: [.80, .72],
  h: [.64, .82],
  i: [.49, .68],
  j: [.50, .49],
  k: [.61, .59],
  vault: [.50, .46]
};

// Acht even lange routes: elk team kan exact zes poorten openen.
const routes = [
 ['entry','a','b','c','d','j','vault'],
 ['entry','a','i','h','g','k','vault'],
 ['entry','a','b','j','e','k','vault'],
 ['entry','a','i','j','c','d','vault'],
 ['entry','a','b','c','j','k','vault'],
 ['entry','a','i','h','k','f','vault'],
 ['entry','a','b','j','e','f','vault'],
 ['entry','a','i','j','d','e','vault']
];

// Zes verhaalhoofdstukken. Elke route volgt dezelfde avonturen in een andere volgorde.
const adventureStages=[
 {name:'🌉 De wankele brug der machten',intro:'Steek de brug over. Maak de machtenspreuk juist!',fail:'💥 FOUT! De brug breekt en je held stort in het ravijn. Je begint de oversteek opnieuw vanaf het begin.',success:'✨ De brug licht op. Je bereikt veilig de overkant!'},
 {name:'🌊 De waterval van vergeten machten',intro:'Splijt de waterval met de juiste machtenspreuk!',fail:'🌊 De waterval sleurt je terug naar de oever. Herstel de spreuk!',success:'💧 Het water wijkt uiteen en onthult een verborgen trap!'},
 {name:'🔥 De drakenproef van de exponenten',intro:'Activeer je schild met de juiste machtregel!',fail:'🔥 Het schild breekt en de vlammen dwingen je achteruit!',success:'🛡️ Een gouden schild dooft de drakenvlammen!'},
 {name:'🌀 Het portaal van de oneindigheid',intro:'Open het portaal met de juiste macht!',fail:'🌀 Het portaal slingert je terug naar het begin van de poort!',success:'✨ Het portaal opent en je stapt een nieuwe wereld binnen!'},
 {name:'🪨 De instortende kristalgrot',intro:'Ontgrendel de kristalgrot!',fail:'🪨 Een rotsblok verspert je weg. De kristallen herstellen zich voor een nieuwe poging.',success:'💎 De kristallen vormen een veilige doorgang!'},
 {name:'🏰 De poort van de schatkamer',intro:'Open de schatkamer!',fail:'⚡ De tempelwachters sluiten de poort. Probeer de formule opnieuw.',success:'🏆 De gouden poort zwaait open!'}
];
function adventureStage(t){return adventureStages[Math.min(5,Math.max(0,t.step||0))];}
const avatars=[["Runenridder","∞"],["Sterrenmagiër","ⁿ"],["Boswachter","×"],["Drakenridder","÷"],["Kristalheks","√"],["Schaduwjager","Δ"],["Stormkrijger","∑"],["Vuurmagiër","π"],["Maanelf","α"],["IJsguardiaan","β"],["Gouden paladijn","γ"],["Nachtelf","²"],["Druïdevorst","³"],["Feniksridder","x"],["Tempelwachter","∫"],["Ravenmagiër","≠"],["Woudelf","±"],["Bliksemstrijder","∝"],["Zandnomade","λ"],["Hemelwachter","φ"],["Misttovenaar","Ω"],["Kristalridder","θ"],["Wolvenjager","μ"],["Zonnepriesteres","σ"],["Runenboogschutter","∂"],["Dieptewachter","∇"],["Drakenmagiër","∈"],["Sterrendief","⊕"],["Schaduwpaladijn","∴"],["Oneindigheidswachter","∞"]];
const questions=[{"t":"De productspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["elke factor","tot die macht.","Om een product","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"De quotiëntspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["het deeltal en de deler","tot die macht.","Om een quotiënt","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"Het productzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["bⁿ","=","·","(a · b)ⁿ","aⁿ"],"answer":[3,1,4,2,0]},{"t":"Het quotiëntzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=",":","(a : b)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De productpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[1],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De quotiëntpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[0],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De x-y-inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["yⁿ","=","·","(x · y)ⁿ","xⁿ"],"answer":[3,1,4,2,0]},{"t":"De x-y-breuk","q":"Zet de symbolen in de juiste volgorde.","tokens":["xⁿ","yⁿ","=",":","(x : y)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De gouden spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[0],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De blauwe spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[1],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De drie factoren","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=","cⁿ","·","(a · b · c)ⁿ","·"],"answer":[5,2,0,4,1,6,3]},{"t":"De laatste inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["(p : q)ᵐ","pᵐ","qᵐ","=",":"],"answer":[0,3,1,4,2]}];
const duelQs=questions.slice(0,10);
const finalQs=[{"q":"(2a)^2","a":"4a^2","set":16},{"q":"(4c)^3","a":"64c^3","set":16},{"q":"(-ab)^2","a":"a^2b^2","set":16},{"q":"(-3c)^2","a":"9c^2","set":16},{"q":"(-2c)^3","a":"-8c^3","set":16},{"q":"(-2ab)^2","a":"4a^2b^2","set":16},{"q":"(2ac)^3","a":"8a^3c^3","set":16},{"q":"(a^2b)^2","a":"a^4b^2","set":16},{"q":"(-ab)^3","a":"-a^3b^3","set":16},{"q":"(-1/4 ac)^2","a":"1/16a^2c^2","set":16},{"q":"(2a^2b)^2","a":"4a^4b^2","set":17},{"q":"(4ac^4)^2","a":"16a^2c^8","set":17},{"q":"(10xy^2z^3)^2","a":"100x^2y^4z^6","set":17},{"q":"(-4/5 a^3b^4)^2","a":"16/25a^6b^8","set":17},{"q":"(-3x^2y^4)^3","a":"-27x^6y^12","set":17},{"q":"(2/3)^2","a":"4/9","set":19},{"q":"(-1/2)^3","a":"-1/8","set":19},{"q":"(4/5)^2","a":"16/25","set":19},{"q":"(-1/10)^3","a":"-1/1000","set":19},{"q":"(3/5)^(-2)","a":"25/9","set":19},{"q":"(1/3)^(-2)","a":"9","set":19},{"q":"(-3/5)^(-2)","a":"25/9","set":19},{"q":"(-1/3)^2","a":"1/9","set":19},{"q":"(4/5)^(-2)","a":"25/16","set":19},{"q":"(1/10)^(-3)","a":"1000","set":19},{"q":"(a/b)^2","a":"a^2/b^2","set":20},{"q":"(-x/2)^3","a":"-x^3/8","set":20},{"q":"(3/z^2)^2","a":"9/z^4","set":20},{"q":"(1/a)^4","a":"1/a^4","set":20},{"q":"(-c/2)^(-2)","a":"4/c^2","set":20},{"q":"(-x/y)^2","a":"x^2/y^2","set":20},{"q":"(a^2/b^3)^(-2)","a":"b^6/a^4","set":20},{"q":"(-3/y^3)^3","a":"-27/y^9","set":20},{"q":"(-1/ab)^2","a":"1/a^2b^2","set":20},{"q":"(x^2/y)^(-1)","a":"y/x^2","set":20},{"q":"(a/b)^m","a":"a^m/b^m","set":21},{"q":"(x/y)^(p+1)","a":"x^(p+1)/y^(p+1)","set":21},{"q":"(x/2)^(2+a)","a":"x^(2+a)/2^(2+a)","set":21},{"q":"(-3/2)^(2a)","a":"3^(2a)/2^(2a)","set":21},{"q":"(x^2/y)^(-m)","a":"y^m/x^(2m)","set":21}];
function avatarFace(n){
 if(!Number.isInteger(n))return '<span class="avatar-pending">✧</span>';
 if(worldError)return '<span class="avatar-pending" title="3D-weergave niet beschikbaar">'+avatars[n][1]+'</span>';
 if(fantasyPortraits?.[n])return '<img class="fantasy-3d-portrait" src="'+fantasyPortraits[n]+'" alt="" loading="lazy">';
 return '<span class="fantasy-avatar-loading" role="img" aria-label="3D-figuur wordt geladen"><span class="fantasy-avatar-loading-icon">✦</span><small>3D-figuur laden…</small></span>';
}
function norm(v){return String(v).replace(/\s/g,'').replace(/[·×*]/g,'').replace(/−/g,'-').replace(/[{}]/g,'').replace(/:/g,'/').replace(/\^\(([^()]+)\)/g,'^$1');}
function hash(v){let x=2166136261;for(const ch of norm(v)){x^=ch.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;}
function finaleVraag(t){return finalQs[((t.finalPos||0))%finalQs.length];}
function finaleChoices(q){
 // Stable, reproducible alternatives; the host checks the chosen index.
 const correct=q.a;
 const variants=[];
 const add=v=>{if(v!==correct&&!variants.includes(v))variants.push(v);};
 // Frequent student mistakes: incorrect sign, coefficient or exponent.
 if(correct.startsWith('-'))add(correct.slice(1));else add('-'+correct);
 const firstDigit=correct.match(/[0-9]+/);
 if(firstDigit){
  const n=Number(firstDigit[0]);
  add(correct.slice(0,firstDigit.index)+String(n+1)+correct.slice(firstDigit.index+firstDigit[0].length));
 }
 const exp=correct.match(/\^(-?\d+)/);
 if(exp){
  const n=Number(exp[1]);add(correct.replace(exp[0],'^'+(n+1)));
  add(correct.replace(exp[0],'^'+Math.max(1,Math.abs(n)-1)));
 }
 add('2'+correct);add(correct+'^2');
 const idx=finalQs.indexOf(q);
 const options=[correct,variants[0],variants[1]];
 const shift=((idx*7+3)%3);
 const rotated=options.map((_,i)=>options[(i+shift)%3]);
 return {options:rotated,correct:rotated.indexOf(correct)};
}


const randomId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const newState = () => ({
  phase: 'lobby',
  created: Date.now(),
  started: 0,
  finish: 0,
  teams: {},
  duels: {},
  duelNumber: 0,
  finalQuestion: 0,
  winner: '',
  event: 'De tempel wacht op avonturiers...',
  eventAt: Date.now()
});

function show(id) {
  view = id;
  templeAudio.update();
  screens.forEach(s => {
    $(s).classList.toggle('hidden', s !== id);
  });
}

function flash(message) {
  if (state) {
    state.event = message;
    state.eventAt = Date.now();
  }

  if (view === 'teacher') {
    $('eventLabel').textContent = message;
  }
}

function roomPath(path = '') {
  return 'rooms/' + room + (path ? '/' + path : '');
}

async function initFirebase() {
  if (firebase) return;

  if (!configured) {
    throw Error('Firebase is nog niet ingesteld.');
  }

  const app = await import(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'
  );

  const database = await import(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js'
  );

  const authmod = await import(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
  );

  const instance = app.initializeApp(cfg);
  auth = authmod.getAuth(instance);

  await authmod.signInAnonymously(auth);

  db = database.getDatabase(instance);
  firebase = database;
}

async function writeState() {
  if (online && host) {
    await firebase.set(
      firebase.ref(db, roomPath('state')),
      state
    );
  }

  render();
}

function subscribeState() {
  if (unsub) unsub();

  unsub = firebase.onValue(
    firebase.ref(db, roomPath('state')),
    snapshot => {
      const value = snapshot.val();

      if (value) {
        state = {
  ...value,
  teams: value.teams || {},
  duels: value.duels || {}
};
        render();
        if(view==='teacher')paintTeacherCycle();
      }
    },
    error => {
      alert('Verbindingsprobleem: ' + error.message);
    }
  );
}

async function createOnline() {
  try {
    await initFirebase();

    online = true;
    demo = false;
    host = true;
    room = randomId();
    state = newState();

        await firebase.set(
      firebase.ref(db, roomPath('owner')),
      auth.currentUser.uid
    );

    await firebase.set(
      firebase.ref(db, roomPath('state')),
      state
    );
    subscribeState();

    reqUnsub = firebase.onChildAdded(
      firebase.ref(db, roomPath('requests')),
      snapshot => {
        requestQueue = requestQueue.then(async () => {
          const request = snapshot.val();
          if (!request) return;

          const ownerSnapshot = await firebase.get(
            firebase.ref(
              db,
              roomPath('teamOwners/' + request.teamId)
            )
          );

          if (ownerSnapshot.val() === request.uid) {
            await handleRequest(request);
          }

          await firebase.remove(snapshot.ref);
        }).catch(console.error);
      }
    );

    openTeacher();
    $('connection').textContent = '● Live verbonden';

  } catch (error) {
    alert('Online spel kon niet starten: ' + error.message);
  }
}

function startSoloPractice(){
 online=false;demo=true;host=true;room='SOLO';state=newState();
 const name=(window.prompt('Welke naam wil je gebruiken tijdens het oefenen?','Mijn avontuur')||'Mijn avontuur').trim().slice(0,22)||'Mijn avontuur';
 teamId=addTeam(name);
 state.phase='avatars';
 state.event='Kies je eigen fantasyfiguur en begin met oefenen.';
 currentSignature='';tokenDraft=null;
 $('connection').textContent='● Alleen oefenen · zonder spelcode';
 show('student');renderStudent();
}
function createDemo(count=3) {
  online = false;
  demo = true;
  host = true;
  room = 'DEMO';
  state = newState();

  Array.from({length:Math.max(3,Math.min(13,count))},(_,i)=>'Testteam '+(i+1)).forEach((name,i)=>{const id=addTeam(name);state.teams[id].avatar=i;});

  openTeacher();

  $('demoControls').classList.remove('hidden');
  mountDemoControls();
  $('connection').textContent = '● Demonstratiemodus';
}

function addTeam(name) {
  const used=new Set(Object.values(state.teams||{}).map(t=>Number.isInteger(t.slot)?t.slot:t.route));
  const index=Array.from({length:13},(_,i)=>i).find(i=>!used.has(i));
  if(index===undefined)throw Error('Maximum 13 teams.');

  const id = 't' + index + '_' +
    Math.random().toString(36).slice(2, 5);

  state.teams[id] = {
    id,
    name: name.slice(0, 22),
    color: colors[index % 8],
    route: index % 8,
    slot: index,
    step: 0,
    score: 0,
    progress: [],
    finalPos: 0,
    solved: 0,
    wrong: 0,
    duel: '',
    finished: false,
    joined: Date.now()
  };

  return id;
}

async function removeTeamFromTeacher(id){
 if(!host||!state?.teams?.[id])return;
 const name=state.teams[id].name;
 if(!confirm('Team "'+name+'" definitief uit dit spel verwijderen?'))return;
 for(const d of Object.values(state.duels||{})){
  if(d.a===id||d.b===id){d.done=true;for(const participant of [d.a,d.b]){if(state.teams[participant])state.teams[participant].duel='';}}
 }
 for(const team of Object.values(state.teams))if(team.pendingFrom===id)team.pendingFrom='';
 if(state.winner===id)state.winner='';
 delete state.teams[id];
 if(online)await firebase.remove(firebase.ref(db,roomPath('teamOwners/'+id)));
 flash('Team '+name+' is verwijderd.');await writeState();
}

function showRoomCode(){
 const teacher=document.getElementById('teacher');
 if(!teacher)return;
 let panel=document.getElementById('persistentRoomCode');
 if(!panel){
  panel=document.createElement('div');panel.id='persistentRoomCode';
  const title=document.createElement('span');title.textContent='SPELCODE VOOR LEERLINGEN';
  const code=document.createElement('strong');code.id='persistentRoomCodeValue';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Kopieer code';
  copy.onclick=async()=>{const value=document.getElementById('persistentRoomCodeValue')?.textContent||'';try{await navigator.clipboard.writeText(value);copy.textContent='Gekopieerd!';}catch(e){window.prompt('Kopieer de spelcode:',value);}};
  panel.append(title,code,copy);teacher.insertBefore(panel,teacher.firstChild);
 }
 const value=room||'GEEN CODE';
 document.getElementById('persistentRoomCodeValue').textContent=value;
 const original=document.getElementById('roomCode');if(original)original.textContent=value;
 panel.hidden=false;
}
// Wissel automatisch tussen wereld, live antwoorden en gecombineerde weergave.
let teacherCycleMode=0;
function mountTeacherCycle(){
 const frame=document.querySelector('#teacher .worldframe');if(!frame||document.getElementById('teacherCycleBar'))return;
 const bar=document.createElement('div');bar.id='teacherCycleBar';
 bar.innerHTML='<button type="button" id="teacherCycleButton">↻ Automatisch: wereld / antwoorden / samen</button><span id="teacherCycleName"></span>';
 const panel=document.createElement('div');panel.id='teacherAnswersPanel';panel.hidden=true;
 frame.append(bar,panel);
 document.getElementById('teacherCycleButton').onclick=()=>{teacherCycleMode=(teacherCycleMode+1)%4;paintTeacherCycle();};
 setInterval(()=>{if(view!=='teacher'||teacherCycleMode===3||state?.phase==='playing')return;teacherCycleMode=(teacherCycleMode+1)%3;paintTeacherCycle();},8500);
 setInterval(()=>{if(view==='teacher'&&state?.phase==='playing')paintTeacherCycle();},1000);
 paintTeacherCycle();
}
function paintTeacherCycle(){
 const panel=document.getElementById('teacherAnswersPanel'),name=document.getElementById('teacherCycleName');
 if(!panel||!state)return;
 if(state.phase==='playing'){
  // Only during the six adventures: show ONE team's current exercise for 15 seconds.
  // The finale and all other phases retain the original teacher display.
  const teams=Object.values(state.teams||{}).sort((a,b)=>(a.slot||0)-(b.slot||0));
  if(!teams.length){panel.hidden=true;return;}
  const elapsed=Math.max(0,Date.now()-(state.started||Date.now()));
  const index=Math.floor(elapsed/15000)%teams.length;
  const t=teams[index],q=!t.finished?getQuestion(t):null;
  const selectedIndices=Array.isArray(t.liveDraft)?t.liveDraft:(t.progress||[]);
  const progress=selectedIndices.map(i=>q?.tokens?.[i]).filter(Boolean);
  const remaining=15-Math.floor(elapsed%15000/1000);
  panel.hidden=false;panel.className='teacher-answer-panel teacher-answer-focus';
  name.textContent='Live: '+t.name+' · '+remaining+' s';
  const title=q?(q.q||q.question||q.fullRule||'Oefening'):'Avontuur voltooid';
  const tokens=q?.tokens||[];
  panel.innerHTML='<h3>LIVE MEEKIJKEN · '+escapeHtml(t.name)+' · volgende team over '+remaining+' s</h3><div class="teacher-answer-grid"><div class="teacher-answer-team"><b>'+escapeHtml(t.name)+'</b><small>'+escapeHtml(String(title))+'</small><div class="teacher-answer-draft">'+(progress.length?progress.map(x=>escapeHtml(String(x))).join(' · '):'Nog niets aangeklikt')+'</div><div class="teacher-answer-options">'+tokens.map((x,i)=>'<span class="'+(selectedIndices.includes(i)?'teacher-option-picked':'')+'">'+escapeHtml(String(x))+'</span>').join('')+'</div><small>'+t.solved+' oefeningen opgelost</small></div></div>';
  return;
 }
 panel.classList.remove('teacher-answer-focus');
 const labels=['3D-wereld','Live antwoorden','Wereld + antwoorden','Antwoorden vast'];
 const mode=teacherCycleMode;name.textContent=labels[mode];
 panel.hidden=mode===0;
 panel.className='teacher-answer-panel '+(mode===2?'teacher-answer-compact':'');
 if(panel.hidden)return;
 const teams=Object.values(state.teams||{}).sort((a,b)=>(a.slot||0)-(b.slot||0));
 panel.innerHTML='<h3>LIVE MEEKIJKEN · '+teams.length+' teams</h3><div class="teacher-answer-grid">'+teams.map(t=>{
  const q=state.phase==='playing'&&!t.finished?getQuestion(t):state.phase==='final'?finaleVraag(t):null;
  const progress=(t.liveDraft||t.progress||[]).map(i=>q?.tokens?.[i]).filter(Boolean);
  const title=q?(q.q||q.question||q.fullRule||'Oefening'):'Wachten op oefening';
  const finalOptions=state.phase==='final'&&q?finaleChoices(q).options:[];
  const preview=state.phase==='final'&&Number.isInteger(t.liveFinalChoice)?'Aangeklikt: '+String.fromCharCode(65+t.liveFinalChoice)+' — '+(finalOptions[t.liveFinalChoice]||''):'';
  return '<div class="teacher-answer-team"><b>'+escapeHtml(t.name)+'</b><small>'+escapeHtml(String(title))+'</small><div class="teacher-answer-draft">'+(progress.length?progress.map(x=>escapeHtml(String(x))).join(' · '):escapeHtml(preview||'Nog niets aangeklikt'))+'</div><div class="teacher-answer-options">'+(q?(state.phase==='final'?finalOptions.map((x,i)=>'<span class="'+(t.liveFinalChoice===i?'teacher-option-picked':'')+'">'+String.fromCharCode(65+i)+': '+escapeHtml(String(x))+'</span>').join(''):q.tokens.map((x,i)=>'<span class="'+((t.liveDraft||[]).includes(i)?'teacher-option-picked':'')+'">'+escapeHtml(String(x))+'</span>').join('')):'')+'</div><small>'+(state.phase==='final'?'Vak '+t.finalPos+'/16':t.solved+' opgelost')+'</small></div>';
 }).join('')+'</div>';
}
function openTeacher() {
  show('teacher');

  showRoomCode();mountTeacherCycle();
  $('demoControls').classList.toggle('hidden', !demo);

  render();

  if (timerHandle) clearInterval(timerHandle);

  // Alleen de leerkracht bestuurt de fases; geen automatische tijdslimieten.
  timerHandle = setInterval(renderClock, 500);

  listenJoins();
}

async function sendRequest(action, payload = {}) {
  if (demo) {
    await handleRequest({ action, teamId, ...payload });
    return;
  }

  if (!online) throw Error('Niet online');

  try { await firebase.push(
    firebase.ref(db, roomPath('requests')),
    {
      action,
      teamId,
      uid: auth.currentUser.uid,
      ...payload,
      at: Date.now()
    }
  ); } catch(error) {
    if(/permission.denied/i.test(error.message||'')) throw Error('Het antwoord kon niet worden doorgestuurd. Controleer de Firebase-toegangsregels en probeer opnieuw.');
    throw error;
  }
}

async function joinRoom() {
  const code = $('roomInput').value.trim().toUpperCase();
  const name = $('teamInput').value.trim();

  $('joinError').textContent = '';

  if (!/^[A-Z0-9]{6}$/.test(code) || name.length < 2) {
    $('joinError').textContent =
      'Vul een spelcode van 6 tekens en een teamnaam in.';
    return;
  }

  try {
    await initFirebase();

    online = true;
    host = false;
    room = code;

    const snapshot = await firebase.get(
      firebase.ref(db, roomPath('state'))
    );

    if (!snapshot.exists()) {
      throw Error('Spelcode niet gevonden.');
    }

    state = snapshot.val();

    if (state.phase !== 'lobby') {
      throw Error('Het spel is al begonnen.');
    }

    if (Object.keys(state.teams || {}).length >= 13) {
      throw Error('Er zijn al 13 teams.');
    }

    const requestId =
      'join' + Math.random().toString(36).slice(2);

    await firebase.set(
      firebase.ref(
        db,
        roomPath('joinRequests/' + requestId)
      ),
      {
        name,
        uid: auth.currentUser.uid,
        created: Date.now()
      }
    );

    let attempts = 0;

    const wait = setInterval(async () => {
      attempts++;

      try {
        const responseSnapshot = await firebase.get(
          firebase.ref(
            db,
            roomPath('joinResponses/' + requestId)
          )
        );

        if (responseSnapshot.exists()) {
          clearInterval(wait);

          const response = responseSnapshot.val();

          if (response.error) {
            $('joinError').textContent = response.error;
            return;
          }

          teamId = response.teamId;

          localStorage.setItem(
            'machtentempel-team-' + room,
            teamId
          );

          currentSignature = '';
          subscribeState();
          show('student');
          render();

          $('connection').textContent = '● Live verbonden';

        } else if (attempts > 25) {
          clearInterval(wait);

          $('joinError').textContent =
            'De leerkracht moet het spel openhouden. Probeer opnieuw.';
        }

      } catch (error) {
        clearInterval(wait);
        $('joinError').textContent = error.message;
      }
    }, 450);

  } catch (error) {
    $('joinError').textContent = error.message;
  }
}

function listenJoins() {
  if (!online || !host || joinUnsub) return;

  joinUnsub = firebase.onChildAdded(
    firebase.ref(db, roomPath('joinRequests')),
    snapshot => {
      requestQueue = requestQueue.then(async () => {
        const request = snapshot.val();

        if (!request || !request.uid) return;

        let response;

        if (state.phase !== 'lobby') {
          response = {
            error: 'Het spel is al begonnen.'
          };

        } else if (Object.keys(state.teams || {}).length >= 13) {
          response = {
            error: 'Maximum 13 teams.'
          };

        } else {
          const existing = Object.values(state.teams || {}).some(
            team =>
              team.name.toLowerCase() ===
              request.name.toLowerCase()
          );

          response = existing
            ? { error: 'Deze teamnaam is al in gebruik.' }
            : { teamId: addTeam(request.name) };

          if (response.teamId) {
            await firebase.set(
              firebase.ref(
                db,
                roomPath('teamOwners/' + response.teamId)
              ),
              request.uid
            );

            await writeState();
          }
        }

        await firebase.set(
          firebase.ref(
            db,
            roomPath('joinResponses/' + snapshot.key)
          ),
          {
            ...response,
            uid: request.uid
          }
        );

        await firebase.remove(snapshot.ref);
      }).catch(console.error);
    }
  );
}

async function startGame(){
 if(!host||!state)return;
 const teams=Object.values(state.teams||{});
 if(state.phase==='lobby'){
  if(teams.length<3){alert('Minstens 3 teams nodig.');return;}
  state.phase='avatars';flash('Alle teams mogen nu tegelijk een avatar kiezen.');
 }else if(state.phase==='avatars'){
  const missing=teams.filter(t=>!Number.isInteger(t.avatar));if(missing.length){alert('Deze teams moeten nog een avatar kiezen: '+missing.map(t=>t.name).join(', ')+'. Laat hen op hun computer de avatarselectie vernieuwen.');return;}
  state.phase='playing';state.started=Date.now();flash('De poorten openen!');
 }else return;
 await writeState();
}
function getQuestion(team) {
  return questions[
    team.solved % questions.length
  ];
}

function getActiveDuel(team) {
  return team.duel &&
    state.duels[team.duel] &&
    !state.duels[team.duel].done
      ? state.duels[team.duel]
      : null;
}

async function handleRequest(r){
 if(!host||!state)return;const t=state.teams?.[r.teamId];if(!t)return;
 const n=Number(r.answer);
 if(r.action==='answer'&&state.phase==='avatars'){
  if(!Number.isInteger(n)||n<0||n>=13||Number.isInteger(t.avatar))return;
  t.avatar=n;if(room==='SOLO'){state.phase='playing';state.started=Date.now();flash('Je oefenavontuur begint!');}else flash(t.name+' heeft een figuur gekozen.');await writeState();return;
 }
 if(r.action==='liveDraft'&&['playing','final'].includes(state.phase)){
   if(!Array.isArray(r.sequence)||r.sequence.length>16)return;
   const q=state.phase==='playing'?getQuestion(t):getActiveDuel(t)?duelQs[getActiveDuel(t).qIndex]:null;
   if(!q||r.sequence.some(i=>!Number.isInteger(i)||i<0||i>=q.tokens.length))return;
   if(r.atSolved!==undefined&&r.atSolved!==t.solved)return;
   t.liveDraft=[...r.sequence];await writeState();return;
  }
  if(r.action==='finalPreview'&&state.phase==='final'){
   if(!Number.isInteger(r.choice)||r.choice<0||r.choice>2)return;
   t.liveFinalChoice=r.choice;await writeState();return;
  }
  if(r.action==='resetTokens'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  t.progress=[];t.liveDraft=[];await writeState();return;
 }
 if(r.action==='resetTokens'&&state.phase==='final'&&getActiveDuel(t)){
  const duel=getActiveDuel(t);duel.progress[t.id]=[];await writeState();return;
 }
 if(r.action==='submitTokens'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  const q=getQuestion(t),selected=r.sequence;
  if(r.atSolved!==undefined&&(r.atSolved!==t.solved||r.atWrong!==t.wrong))return;
  if(!Array.isArray(selected)||selected.length!==q.answer.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=q.tokens.length)||new Set(selected).size!==selected.length)return;
  if(selected.every((v,i)=>v===q.answer[i])){
   t.score+=100;t.solved++;t.step=Math.min(routes[t.route%8].length-1,t.step+1);
   if(t.step===routes[t.route%8].length-1){t.finished=true;if(room==='SOLO'){state.phase='final';state.finalStarted=Date.now();state.finalQuestion=0;t.finalPos=1;t.finalAnswers=0;t.duel='';t.pendingFrom='';flash('⚡ Je hebt de zes avonturen voltooid! Nu begint de finale: los de finaleopgaven op en bereik vak 16!');}}
   flash(adventureStages[Math.max(0,t.step-1)]?.success||'Doorgang geopend!');templeAudio.cue('correct');
  }else{
   t.wrong++;t.score=Math.max(0,t.score-10);t.lastFeedback=adventureStage(t).fail;if(t.step===0)t.step=0;
   flash('❌ Fout antwoord van '+t.name);templeAudio.cue('wrong');
  }
  t.progress=[];t.liveDraft=[];await writeState();return;
 }
 if(r.action==='submitDuelTokens'&&state.phase==='final'&&!state.winner){
  const d=getActiveDuel(t);if(!d||d.winner)return;
  const q=duelQs[d.qIndex],selected=r.sequence;
  if(!Array.isArray(selected)||selected.length!==q.answer.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=q.tokens.length)||new Set(selected).size!==selected.length)return;
  if(selected.every((v,i)=>v===q.answer[i])){
   d.winner=t.id;d.done=true;t.finalPos=Math.min(16,(t.finalPos||0)+2);t.finalAnswers=(t.finalAnswers||0)+2;t.duel='';
   const other=state.teams[d.a===t.id?d.b:d.a];if(other)other.duel='';
   if(t.finalPos>=16){state.winner=t.id;state.phase='ended';flash('🏆 '+t.name+' wint de Machtentempel!');templeAudio.cue('win');}
   else flash('⚔ '+t.name+' wint het duel en gaat twee vakken vooruit!');
  }else{t.wrong++;d.progress[t.id]=[];flash('❌ Fout duelantwoord van '+t.name);}
  await writeState();return;
 }
 if(r.action==='answer'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  const q=getQuestion(t),p=t.progress||[];
  if(!Number.isInteger(n)||n<0||n>=q.tokens.length||p.includes(n))return;
  p.push(n);t.progress=p;
  if(p.length===q.answer.length){
   if(p.every((v,i)=>v===q.answer[i])){
    t.score+=100;t.solved++;t.step=Math.min(routes[t.route%8].length-1,t.step+1);
    flash(t.name+' opent een doorgang!');
    if(t.step===routes[t.route%8].length-1)t.finished=true;
   }else{t.wrong++;t.score=Math.max(0,t.score-10);t.lastFeedback=adventureStage(t).fail;flash(t.lastFeedback);}
   t.progress=[];
  }await writeState();return;
 }
 // A challenge starts immediately: opponents cannot refuse. Use the existing
 // Firebase-approved numeric 'answer' request for backwards-compatible rules.
 if((r.action==='challenge'||(r.action==='answer'&&r.challengeTarget===true))&&state.phase==='final'&&!state.winner){
  const other=Object.values(state.teams).find(v=>(Number.isInteger(v.slot)?v.slot:v.route)===n&&v.id!==t.id);
  if(!other||t.duel||other.duel||(t.challengesStarted||0)>=2||t.pendingFrom||other.pendingFrom)return;
  if(!Number.isInteger(t.finalPos)||!Number.isInteger(other.finalPos))return;
  const id='d'+(++state.duelNumber);
  state.duels[id]={id,a:t.id,b:other.id,qIndex:(state.duelNumber-1)%duelQs.length,done:false,winner:'',progress:{[t.id]:[],[other.id]:[]}};
  t.duel=id;other.duel=id;t.challengesStarted=(t.challengesStarted||0)+1;
  flash('⚔ Duel: '+t.name+' tegen '+other.name);templeAudio.cue('duel');
  await writeState();return;
 }
 if(r.action==='duel'&&state.phase==='final'&&!state.winner){
  const d=getActiveDuel(t);if(!d||d.winner)return;
  if(!d.progress||typeof d.progress!=='object')d.progress={};
  const q=duelQs[d.qIndex],p=d.progress[t.id]||[];
  if(!Number.isInteger(n)||n<0||n>=q.tokens.length||p.includes(n))return;
  p.push(n);d.progress[t.id]=p;
  if(p.length===q.answer.length){
   if(p.every((v,i)=>v===q.answer[i])){
    d.winner=t.id;d.done=true;t.finalPos=Math.min(16,(t.finalPos||0)+2);t.finalAnswers=(t.finalAnswers||0)+2;t.duel='';
    const other=state.teams[d.a===t.id?d.b:d.a];if(other)other.duel='';
    if(t.finalPos===16&&(t.finalAnswers||0)>=8){state.winner=t.id;state.phase='ended';flash('🏆 '+t.name+' wint de Machtentempel!');}
    else flash('⚔ '+t.name+' wint het duel en gaat twee vakken vooruit!');
   }else{t.wrong++;d.progress[t.id]=[];}
  }await writeState();return;
 }
 if(r.action==='final'&&state.phase==='final'&&!state.winner&&!t.duel&&!t.pendingFrom){
  if(!Number.isInteger(t.finalPos)||t.finalPos<1||t.finalPos>16)return;
  // Oude of dubbel ingestuurde antwoorden mogen geen extra vak opleveren.
  if(!Number.isInteger(Number(r.atPosition))||Number(r.atPosition)!==t.finalPos)return;
  t.liveFinalChoice=null;
   if(Number(r.answer??r.choice)===finaleChoices(finaleVraag(t)).correct){
   const previous=t.finalPos;
   t.finalPos=previous+1;
   t.finalAnswers=(t.finalAnswers||0)+1;
   if(t.finalPos!==previous+1)return;
   if(t.finalPos>=16){state.winner=t.id;state.phase='ended';state.finish=Date.now();t.score+=300;flash(room==='SOLO'?'🏆 Gelukt! Je hebt de finale gewonnen en de schatkamer geopend!':'🏆 '+t.name+' wint!');templeAudio.cue('win');}
   else flash('⚡ '+t.name+' bereikt vak '+t.finalPos);
  }else{t.wrong++;t.finalPos=Math.max(1,t.finalPos-1);flash('Fout finaleantwoord: '+t.name+' gaat één vak terug naar '+t.finalPos);}
  await writeState();
 }
}
function triggerDuel(moved) {
  const node = routes[moved.route%8][moved.step];

  if (node === 'vault' || node === 'entry') return;

  const opponent = Object.values(state.teams).find(
    team =>
      team.id !== moved.id &&
      !team.duel &&
      !team.finished &&
      routes[team.route%8][team.step] === node
  );

  if (!opponent) return;

  const id = 'd' + (++state.duelNumber);

  state.duels[id] = {
    id,
    a: moved.id,
    b: opponent.id,
    qIndex: (state.duelNumber - 1) % duelQs.length,
    done: false,
    winner: '',
    progress: {[moved.id]:[],[opponent.id]:[]}
  };

  moved.duel = id;
  opponent.duel = id;

  flash(
    '⚔ DUEL! ' +
    moved.name +
    ' tegen ' +
    opponent.name
  );
}

async function beginFinal(){
 if(!host||!state||state.phase!=='playing')return;
 state.phase='final';state.finalStarted=Date.now();state.finalQuestion=0;
 Object.values(state.teams||{}).sort((a,b)=>b.score-a.score||a.joined-b.joined).forEach((t,i)=>{t.duel='';t.pendingFrom='';t.challengesStarted=0;t.finalPos=i===0?4:i===1?3:i===2?2:1;t.finalAnswers=0;});
 Object.values(state.duels||{}).forEach(d=>d.done=true);
 flash('⚡ Finale: de punten bepalen de voorsprong. Race naar vak 16!');await writeState();
}
function renderClock() {
 if(!state||view!=='teacher')return;
 const since=state.phase==='playing'?state.started:state.phase==='final'?state.finalStarted:0;
 const elapsed=since?Math.max(0,Math.floor((Date.now()-since)/1000)):0;
 $('timer').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
}
async function finishGame(){
 if(!host||!state||state.phase!=='final')return;
 const teams=Object.values(state.teams||{});
 if(!teams.length)return;
 if(!confirm('Finale beëindigen en de winnaar bepalen op basis van de huidige stand?'))return;
 const ranking=teams.sort((a,b)=>(b.finalPos||0)-(a.finalPos||0)||b.score-a.score);
 state.winner=ranking[0].id;state.phase='ended';
 flash('🏆 '+ranking[0].name+' wint de Machtentempel!');
 templeAudio.cue('win');await writeState();
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );
}

function mathExpressionHtml(expression){
 // Render powers and true horizontal fraction bars without changing the stored answers.
 const src=String(expression);
 const escape=escapeHtml;
 const atom=(text)=>{
  let out='';
  for(let i=0;i<text.length;i++){
   if(text[i]!=='^'){out+=escape(text[i]);continue;}
   let exp='',j=i+1;
   if(text[j]==='('){let depth=1;j++;while(j<text.length&&depth){if(text[j]==='(')depth++;else if(text[j]===')')depth--;if(depth)exp+=text[j];j++;}}
   else{if(text[j]==='-'||text[j]==='+')exp+=text[j++];const pattern=/[0-9]/.test(text[j]||'')?/[0-9]/:/[a-zA-Z]/;while(j<text.length&&pattern.test(text[j]))exp+=text[j++];}
   out+='<sup>'+escape(exp)+'</sup>';i=j-1;
  }
  return out;
 };
 // Each slash binds its adjacent numerator and denominator, including powers.
 const power='(?:\\^(?:\\([^()]*\\)|[+-]?(?:\\d+|[a-zA-Z]+)))?';
 const letters='[a-zA-Z]'+power+'(?:[a-zA-Z]'+power+')*';
 const token='(?:\\([^()]*\\)|[+-]?(?:\\d+|'+letters+'))'+power;
 const fraction=new RegExp('('+token+')\\s*\\/\\s*('+token+')','g');
 let output='',last=0,match;
 while((match=fraction.exec(src))!==null){
  output+=atom(src.slice(last,match.index));
  output+='<span class="math-fraction"><span class="math-num">'+atom(match[1])+'</span><span class="math-den">'+atom(match[2])+'</span></span>';
  last=match.index+match[0].length;
 }
 output+=atom(src.slice(last));
 return output;
}

function showOverlay(message) {
  $('overlay').textContent = message;
  $('overlay').classList.remove('hidden');
}

function render(){
 if(!state)return;
 if(view==='teacher'){
  const teams=Object.values(state.teams||{}).sort((a,b)=>b.score-a.score);
  $('teamCount').textContent=teams.length+' / 13';
  $('scoreboard').innerHTML=teams.map(t=>'<div class="teamrow">'+avatarFace(t.avatar)+'<div><b>'+escapeHtml(t.name)+'</b><small>'+(state.phase==='final'?'Vak '+t.finalPos+'/16':t.duel?'⚔ Duel':t.solved+' opdrachten opgelost')+'</small></div><span class="pts">'+t.score+'</span><button type="button" class="remove-team" data-remove-team="'+escapeHtml(t.id)+'" title="Team verwijderen" aria-label="Verwijder team '+escapeHtml(t.name)+'">✕</button></div>').join('');
  $('scoreboard').querySelectorAll('[data-remove-team]').forEach(btn=>btn.addEventListener('click',()=>removeTeamFromTeacher(btn.dataset.removeTeam).catch(e=>alert('Verwijderen mislukt: '+e.message))));
  $('phaseLabel').textContent=({lobby:'Wachten op teams',avatars:'Avatarselectie',playing:'De tempel is geopend',final:'⚡ Finale',ended:'🏆 Spel afgelopen'})[state.phase];
  $('eventLabel').textContent=state.event||'';
  $('startBtn').disabled=!['lobby','avatars'].includes(state.phase);
  $('startBtn').textContent=state.phase==='lobby'?'🎭 Avatarselectie starten':state.phase==='avatars'?'▶ Start avontuur':'▶ Avontuur bezig';
  $('finalBtn').disabled=state.phase!=='playing';renderClock();
  $('overlay').classList.add('hidden');
  const stage=$('liveStage');stage.classList.add('hidden');stage.classList.remove('race-summary');
  if(state.phase==='avatars'){
   stage.classList.remove('hidden');stage.innerHTML='<h2>🎭 KIES JULLIE AVATAR</h2><div class="avatargrid">'+teams.map(t=>'<div class="avatarcard">'+avatarFace(t.avatar)+'<b>'+escapeHtml(t.name)+'</b><small>'+(Number.isInteger(t.avatar)?'Figuur gekozen':'Kiest nog...')+'</small></div>').join('')+'</div>';
  }else if(state.phase==='playing'){
   if(teams.length>0&&teams.every(t=>t.finished)){$('eventLabel').textContent='🏁 ALLE TEAMS HEBBEN DE TEMPEL BEREIKT — START DE FINALE!';}
   const d=Object.values(state.duels||{}).find(x=>!x.done);
   if(d){const q=duelQs[d.qIndex];stage.classList.remove('hidden');stage.innerHTML='<h2>⚔ LIVE DUEL</h2><p>'+escapeHtml(q.q)+'</p><div class="duelgrid">'+[d.a,d.b].map(id=>'<div class="duelteam"><h3>'+escapeHtml(state.teams[id]?.name||'Team')+'</h3><div class="tokenline">'+(d.progress?.[id]||[]).map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div></div>').join('')+'</div>';}
  }else if(['final','ended'].includes(state.phase)){
   stage.classList.remove('hidden');stage.classList.add('race-summary');stage.innerHTML='<details><summary>Stand van alle teams · '+teams.length+' teams</summary><div class="vault-race race-board"><div class="vault-race-heading"><span class="vault-crown">🏆</span><div><h2>DE RACE NAAR DE SCHATKAMER</h2><p>16 vakken · elk juist antwoord = één vak vooruit!</p></div></div><div class="race-board-scroll"><div class="race-board-lanes">'+teams.map((t,rank)=>{const pos=Math.max(0,Math.min(16,t.finalPos||0));return '<div class="race-board-row" style="--teamcolor:'+t.color+'"><div class="race-board-team"><span class="race-board-portrait">'+avatarFace(t.avatar)+'</span><strong>'+escapeHtml(t.name)+'</strong><small>'+pos+'/16</small></div><div class="race-board-track"><div class="race-board-start '+(pos===0?'occupied':'')+'">'+(pos===0?'<span class="race-board-runner">'+avatarFace(t.avatar)+'</span>':'⚑')+'</div>'+Array.from({length:16},(_,i)=>{const step=i+1;return '<div class="race-board-cell '+(step<pos?'passed ':'')+(step===pos?'occupied ':'')+(step===16?'last ':'')+'"><span class="race-board-number">'+step+'</span>'+(step===pos?'<span class="race-board-runner">'+avatarFace(t.avatar)+'</span>':'')+'</div>';}).join('')+'<div class="race-board-vault">🏰<span>SCHAT</span></div></div></div>';}).join('')+'</div></div><div class="race-board-legend">⚑ START <span>Elke tegel is één oefening</span> 🏰 SCHATKAMER</div></div>'+(Object.values(state.duels||{}).filter(d=>!d.done).map(d=>'<div class="final-duel"><h3>⚔ LIVE DUEL: '+escapeHtml(state.teams[d.a]?.name||'')+' tegen '+escapeHtml(state.teams[d.b]?.name||'')+'</h3><p>'+escapeHtml(duelQs[d.qIndex].q)+'</p>'+[d.a,d.b].map(id=>'<div><b>'+escapeHtml(state.teams[id]?.name||'')+'</b> · '+(d.progress?.[id]||[]).length+' / '+duelQs[d.qIndex].tokens.length+' onderdelen</div>').join('')+'</div>').join(''))+(state.winner?'<h2>🏆 '+escapeHtml(state.teams[state.winner]?.name||'')+' wint!</h2>':'')+'</details>';
  }
 }
 if(view==='student')renderStudent();
}
let tokenDraft=null;
function tokenPuzzle(q,action,progress){
 const publishDraft=()=>{if(room!=='SOLO'&&online&&state?.phase==='playing')sendRequest('liveDraft',{sequence:[...selected],atSolved:state.teams[teamId].solved}).catch(error=>{$('feedback').textContent='Live meekijken kon deze keuze niet doorsturen: '+error.message;console.warn(error);});};
 const box=$('options'),kind=action==='duel'?'duel':'adventure';
 const key=kind+':'+(kind==='duel'?(getActiveDuel(state.teams[teamId])?.id||''):((state.teams[teamId]?.solved||0)+':'+(state.teams[teamId]?.route||0)))+':'+(state.teams[teamId]?.wrong||0);
 if(!tokenDraft||tokenDraft.key!==key)tokenDraft={key,sequence:[]};
 const selected=tokenDraft.sequence;
 const paint=()=>{
  box.innerHTML=(q.fullRule?'<div class="full-rule">'+escapeHtml(q.fullRule)+'</div>':'')+
   '';
  const line=document.createElement('div');line.className='tokenline token-dropzone';
  line.setAttribute('aria-label','Samengestelde formule; sleep een stuk hierheen');
  line.ondragover=e=>e.preventDefault();
  line.ondrop=e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain');const i=Number(raw);if(!Number.isInteger(i)||i<0||i>=q.tokens.length)return;if(raw.startsWith('placed:'))return;if(!selected.includes(i)){selected.push(i);paint();publishDraft();}};
  selected.forEach((index,at)=>{
   const b=document.createElement('button');b.type='button';b.className='placed token-placed';
   b.textContent=q.tokens[index];b.title='Klik om dit stuk terug te leggen';b.draggable=true;
   b.ondragstart=e=>e.dataTransfer.setData('text/plain','placed:'+at);
   b.onclick=()=>{selected.splice(at,1);paint();publishDraft();};line.appendChild(b);
  });
  if(!selected.length){const hint=document.createElement('span');hint.className='token-empty';hint.textContent='Sleep of klik hier de formule samen';line.appendChild(hint);}
  box.appendChild(line);
  const choices=document.createElement('div');choices.className='tokenchoices token-source';
  choices.ondragover=e=>e.preventDefault();
  choices.ondrop=e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain');if(!raw.startsWith('placed:'))return;const at=Number(raw.slice(7));if(Number.isInteger(at)&&at>=0&&at<selected.length){selected.splice(at,1);paint();publishDraft();}};
  q.tokens.forEach((word,i)=>{
   if(selected.includes(i))return;
   const b=document.createElement('button');b.type='button';b.textContent=word;b.draggable=true;
   b.ondragstart=e=>e.dataTransfer.setData('text/plain',String(i));
   b.onclick=()=>{selected.push(i);paint();publishDraft();};choices.appendChild(b);
  });
  box.appendChild(choices);
  const actions=document.createElement('div');actions.className='token-actions';
  const undo=document.createElement('button');undo.type='button';undo.textContent='↶ Laatste stap terug';undo.disabled=!selected.length;
  undo.onclick=()=>{selected.pop();paint();publishDraft();};actions.appendChild(undo);
  const reset=document.createElement('button');reset.type='button';reset.textContent='↺ Alles wissen';reset.disabled=!selected.length;
  reset.onclick=()=>{selected.length=0;paint();publishDraft();};actions.appendChild(reset);
  const check=document.createElement('button');check.type='button';check.className='primary';check.textContent='✓ Nakijken';
  check.disabled=selected.length!==q.answer.length;
  check.onclick=async()=>{
   check.disabled=true;
   try{await sendRequest(kind==='duel'?'submitDuelTokens':'submitTokens',{sequence:[...selected],atSolved:state.teams[teamId].solved,atWrong:state.teams[teamId].wrong});if(!demo)$('feedback').textContent='Antwoord ingediend…';}
   catch(e){$('feedback').textContent=e.message;check.disabled=false;}
  };
  actions.appendChild(check);box.appendChild(actions);
 };
 paint();
}

function renderStudent(){
 const t=state.teams?.[teamId];if(!t){$('myTeam').textContent='Team verwijderd';$('studentStatus').textContent='Dit team is door de leerkracht verwijderd.';$('questTitle').textContent='Aanmelding beëindigd';$('questText').textContent='Ga terug naar het startscherm en meld je opnieuw aan.';$('options').innerHTML='';$('numberBox').classList.add('hidden');return;}
 $('myTeam').textContent=t.name;
 $('myScore').textContent=t.score+' punten';
 $('myPosition').textContent=state.phase==='final'?'Vak '+t.finalPos+'/16':t.finished?'In de schatkamer':adventureStage(t).name;
 const d=getActiveDuel(t),p=d?(d.progress?.[t.id]||[]):(t.progress||[]);
 const sig=[state.phase,t.solved,t.wrong,t.duel,t.pendingFrom,t.challengesStarted,t.avatar,t.finalPos,state.winner,p.join(','),Object.values(state.teams||{}).map(v=>[v.avatar,v.pendingFrom,v.duel].join('/')).join(',')].join(':');
 if(currentSignature===sig)return;const previousSignature=currentSignature;const previousWrong=Number(renderStudent.lastWrong??0);renderStudent.lastWrong=t.wrong||0;currentSignature=sig;
 $('feedback').textContent=t.wrong>previousWrong&&previousSignature?(state.phase==='playing'?adventureStage(t).fail:'Nog niet juist. Probeer opnieuw.'):'';$('numberBox').classList.add('hidden');$('options').innerHTML='';
 const title=$('questTitle'),txt=$('questText'),status=$('studentStatus');
 if(state.phase==='lobby'){status.textContent='Wachten op de leerkracht';title.textContent='Je team is aangemeld';txt.textContent='De avatarselectie start zodra alle teams er zijn.';return;}
 if(state.phase==='avatars'){
  status.textContent='Alle teams kiezen tegelijk';title.textContent=Number.isInteger(t.avatar)?'Jullie figuur is gekozen':'Kies je figuur';txt.textContent='Kies je favoriete avatar. Meerdere teams mogen dezelfde avatar gebruiken; jullie teamnaam blijft uniek.';
  if(!Number.isInteger(t.avatar)){
   const grid=document.createElement('div');grid.className='avatargrid';
   avatars.slice(0,13).forEach((a,i)=>{const b=document.createElement('button');b.className='avatarcard';b.innerHTML=avatarFace(i);b.setAttribute('aria-label',a[0]);b.onclick=async()=>{b.disabled=true;$('feedback').textContent='Avatar wordt geregistreerd…';try{await sendRequest('answer',{answer:i});setTimeout(()=>{if(state?.phase==='avatars'&&!Number.isInteger(state.teams?.[teamId]?.avatar)){$('feedback').textContent='Nog geen bevestiging ontvangen. Wacht even op de bevestiging. Als die uitblijft, vraag de leerkracht om hulp.';currentSignature='';renderStudent();}},3500);}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};grid.appendChild(b);});$('options').appendChild(grid);
  }return;
 }
 if(state.phase==='ended'){const w=state.teams[state.winner];status.textContent=room==='SOLO'?'🏆 Avontuur voltooid!':'Spel afgelopen';title.textContent=room==='SOLO'?'🏆 GELUKT! DE SCHATKAMER IS OPEN!':w?.id===t.id?'🏆 JULLIE WINNEN!':'De schat is geopend';txt.textContent=room==='SOLO'?'Fantastisch! Je hebt de zes avonturen én de finale met de rekenoefeningen succesvol voltooid en de schatkamer geopend. Je eindscore: '+t.score+' punten. Klik op Menu om opnieuw te spelen.':'Winnaar: '+(w?.name||'Onbekend');return;}
 if(state.phase==='final'){
  status.textContent='⚡ Finale · vak '+t.finalPos+'/16';
  if(d){title.textContent='⚔ DUEL tegen '+(state.teams[d.a===t.id?d.b:d.a]?.name||'');const q=duelQs[d.qIndex];txt.textContent=q.fullRule||q.q;tokenPuzzle(q,'duel',p);return;}
  if(t.pendingFrom){
   const challenger=state.teams[t.pendingFrom];title.textContent='⚔ Uitdaging ontvangen';txt.textContent=(challenger?.name||'Een team')+' daagt jullie uit. Aanvaarden jullie het duel?';
   for(const [label,action] of [['⚔ Aanvaarden','accept'],['Weigeren','decline']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>sendRequest(action,{answer:1}).catch(e=>$('feedback').textContent=e.message);$('options').appendChild(b);}return;
  }
  title.textContent='DE LAATSTE RACE';const q=finaleVraag(t);
  txt.innerHTML='<span class="exercise-label">Werk uit · oefenreeks '+q.set+'</span><span class="math-exercise">'+mathExpressionHtml(q.q)+'</span>';
  const choices=finaleChoices(q);
  const grid=document.createElement('div');grid.className='finale-choices';
  choices.options.forEach((answer,index)=>{
   const button=document.createElement('button');button.type='button';button.className='finale-choice';
   button.innerHTML='<span class="finale-choice-letter">'+String.fromCharCode(65+index)+'</span><span class="math-exercise">'+mathExpressionHtml(answer)+'</span>';
   button.onclick=async()=>{
    grid.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await sendRequest('final',{answer:index,atPosition:t.finalPos});if(!demo)$('feedback').textContent='Antwoord ontvangen…';}
    catch(e){$('feedback').textContent=e.message;grid.querySelectorAll('button').forEach(b=>b.disabled=false);}
   };
   grid.appendChild(button);
  });
  $('options').appendChild(grid);
  if((t.challengesStarted||0)<2&&!Object.values(state.teams).some(v=>v.pendingFrom===t.id)){
   const area=document.createElement('details');area.className='challenge-area';area.innerHTML='<summary>⚔ Daag een team uit ('+(2-(t.challengesStarted||0))+' uitdagingen over)</summary><p>Het duel begint meteen. Het andere team kan niet weigeren. Win en ga twee vakken vooruit.</p>';
   Object.values(state.teams).filter(v=>v.id!==t.id&&!v.duel&&!v.pendingFrom).forEach(v=>{const b=document.createElement('button');b.textContent='⚔ '+v.name+' · vak '+v.finalPos;b.onclick=async()=>{b.disabled=true;try{await sendRequest('answer',{answer:Number.isInteger(v.slot)?v.slot:v.route,challengeTarget:true});$('feedback').textContent='⚔ Uitdaging verstuurd. Het duel begint!';}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};area.appendChild(b);});$('options').appendChild(area);
  }return;
 }
 if(d){status.textContent='⚔ Duel';title.textContent='DUEL tegen '+(state.teams[d.a===t.id?d.b:d.a]?.name||'');const q=duelQs[d.qIndex];txt.textContent=q.q;tokenPuzzle(q,'duel',p);return;}
 if(t.finished){status.textContent='In de schatkamer';title.textContent='Wacht op de finale';txt.textContent='Jullie hebben '+t.score+' punten verzameld.';return;}
 const stage=adventureStage(t);status.textContent='Hoofdstuk '+Math.min(6,(t.step||0)+1)+'/6 · +100 punten';const q=getQuestion(t);title.textContent=stage.name;txt.textContent=stage.intro+' '+(q.fullRule||q.q);tokenPuzzle(q,'answer',p);
}
function showNumber(kind) {
  $('numberBox').classList.remove('hidden');
  $('numberInput').value = '';

  $('numberSubmit').onclick = async () => {
    const value = $('numberInput').value.trim();

    if (!value) {
      $('feedback').textContent =
        'Vul eerst een antwoord in.';
      return;
    }

    $('numberSubmit').disabled = true;

    try {
      await sendRequest(kind, {
        answer: Number(value)
      });

      $('feedback').textContent =
        'Antwoord ingestuurd!';

      setTimeout(() => {
        $('numberSubmit').disabled = false;
      }, 650);

    } catch (error) {
      $('feedback').textContent = error.message;
      $('numberSubmit').disabled = false;
    }
  };
}

/* GETEKENDE SPELWERELD */

// Panoramische wereldweergave met tempel, watervallen en avatars.
// Geen bordspel-lijnen: de routes lopen onzichtbaar door het landschap.
let worldArtwork=null;
function loadWorldArtwork(){
 if(worldArtwork)return;
 const svg=document.querySelector('.temple-art svg');if(!svg)return;
 const image=new Image();
 image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
 worldArtwork=image;
}
const scenicRoutes=[
 [[.11,.84],[.23,.70],[.33,.61],[.43,.54],[.50,.48],[.51,.42],[.52,.37]],
 [[.89,.84],[.78,.71],[.69,.62],[.64,.53],[.59,.47],[.55,.42],[.52,.37]],
 [[.18,.88],[.27,.77],[.35,.67],[.41,.58],[.46,.50],[.50,.43],[.52,.37]],
 [[.82,.88],[.74,.76],[.66,.66],[.61,.56],[.57,.48],[.54,.42],[.52,.37]],
 [[.06,.76],[.18,.64],[.29,.55],[.39,.49],[.45,.43],[.49,.40],[.52,.37]],
 [[.94,.76],[.82,.64],[.71,.55],[.62,.49],[.57,.44],[.54,.40],[.52,.37]],
 [[.13,.94],[.24,.84],[.33,.73],[.41,.63],[.46,.54],[.50,.45],[.52,.37]],
 [[.87,.94],[.76,.84],[.67,.73],[.60,.63],[.56,.54],[.53,.45],[.52,.37]]
];
function drawWorld(canvas,time){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 loadWorldArtwork();
 if(worldArtwork?.complete&&worldArtwork.naturalWidth)ctx.drawImage(worldArtwork,0,0,w,h);
 else{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#193f53');g.addColorStop(1,'#ad8c5a');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 if(!state)return;
 const teams=Object.values(state.teams||{});
 for(const t of teams){
  const route=scenicRoutes[t.route%8]||scenicRoutes[0];
  let position;
  if(state.phase==='final'||state.phase==='ended'){
   const p=Math.min(1,(t.finalPos||0)/16);
   const from=route[Math.min(5,route.length-1)];
   position=[from[0]+(.52-from[0])*p,from[1]+(.37-from[1])*p];
  }else position=route[Math.min(t.step||0,route.length-1)];
  const x=position[0]*w,y=position[1]*h+Math.sin(time/350+t.route)*3;
  const scale=Math.max(.75,Math.min(1.2,w/1200));
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.shadowColor=t.color;ctx.shadowBlur=24;
  ctx.fillStyle='#10232ccc';ctx.beginPath();ctx.ellipse(0,22,22,9,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,-12,18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#10212b';ctx.font='bold 21px Inter,Arial';ctx.textAlign='center';ctx.fillText(avatars[t.avatar]?.[1]||'✦',0,-5);
  ctx.font='bold 15px Inter,Arial';ctx.lineWidth=5;ctx.strokeStyle='#071a20';
  ctx.restore();
 }
 if(state.phase==='final'||state.phase==='ended'){
  ctx.save();ctx.textAlign='center';ctx.font='bold '+Math.round(w*.025)+'px Cinzel,Georgia,serif';ctx.shadowBlur=20;ctx.shadowColor='#ffcf65';ctx.fillStyle='#ffedba';ctx.fillText('DE SCHATKAMER',w*.52,h*.28);ctx.restore();
 }
}

// Persoonlijke camera: de wereld blijft gesynchroniseerd, het beeld volgt de eigen avatar.
const studentWorldBuffer=document.createElement('canvas');
studentWorldBuffer.width=1200;studentWorldBuffer.height=760;
let cameraX=.5,cameraY=.5;
function drawStudentCamera(time){
 const canvas=$('studentWorld');if(!canvas||!state)return;
 const team=state.teams?.[teamId];if(!team)return;
 drawWorld(studentWorldBuffer,time);
 const route=routes[team.route%8]||routes[0];
 const node=route[Math.min(team.step||0,route.length-1)];
 const routePoints=scenicRoutes[team.route]||scenicRoutes[0];
 const target=(state.phase==='final'||state.phase==='ended')?[routePoints[5][0]+(.52-routePoints[5][0])*Math.min(1,(team.finalPos||0)/16),routePoints[5][1]+(.37-routePoints[5][1])*Math.min(1,(team.finalPos||0)/16)]:routePoints[Math.min(team.step||0,routePoints.length-1)];
 cameraX+=(target[0]-cameraX)*.065;
 cameraY+=(target[1]-cameraY)*.065;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const sw=studentWorldBuffer.width,sh=studentWorldBuffer.height;
 const cropW=sw*.67,cropH=cropW*canvas.height/canvas.width;
 const x=Math.max(0,Math.min(sw-cropW,cameraX*sw-cropW/2));
 const y=Math.max(0,Math.min(sh-cropH,cameraY*sh-cropH/2));
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(studentWorldBuffer,x,y,cropW,cropH,0,0,canvas.width,canvas.height);
 const glow=ctx.createRadialGradient(canvas.width/2,canvas.height/2,30,canvas.width/2,canvas.height/2,canvas.width*.72);
 glow.addColorStop(0,'#ffffff00');glow.addColorStop(1,'#03101899');ctx.fillStyle=glow;ctx.fillRect(0,0,canvas.width,canvas.height);
}

let draw3D=null,getFantasyPortraits=null,fantasyPortraits=null,portraitCheck=0,worldError='';
import('./world3d.js?v=meekijken2').then(module=>{draw3D=module.draw3D;getFantasyPortraits=module.getFantasyPortraits;}).catch(error=>{worldError='De 3D-wereld kon niet starten. Controleer of WebGL beschikbaar is.';console.warn(worldError,error);const loading=$('previewLoading');if(loading){loading.textContent=worldError;loading.classList.add('world-error');}for(const frame of document.querySelectorAll('.worldframe,.adventure-view')){const warning=document.createElement('div');warning.className='world-warning';warning.textContent=worldError;frame.appendChild(warning);}currentSignature='';if(state)render();});
function drawWelcomeFallback(canvas,time){
 if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#0b2735');grad.addColorStop(.65,'#386373');grad.addColorStop(1,'#b0a07d');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.fillStyle='#f3dfb6';ctx.font='bold 40px Georgia,serif';ctx.fillText('DE MACHTENTEMPEL',w/2,h*.45);
 ctx.font='22px Georgia,serif';ctx.fillText(worldError?'Open het spel in een browser met WebGL.':'De magische wereld wordt geladen…',w/2,h*.53);
}

function animate(time) {
  if(getFantasyPortraits&&state?.phase==='avatars'&&time-portraitCheck>2000){
   portraitCheck=time;
   try{const portraits=getFantasyPortraits();if(portraits?.length===30&&portraits!==fantasyPortraits){fantasyPortraits=portraits;currentSignature=null;render();}}catch(error){console.warn('3D-avatarportretten niet beschikbaar',error);getFantasyPortraits=null;}
  }
  if (view === 'teacher') {
    if(!draw3D||!draw3D($('worldCanvas'),state,'teacher',null,time))drawWorld($('worldCanvas'), time);
  } else if (view === 'welcome') {
    if(!draw3D||!draw3D($('previewCanvas'),null,'welcome',null,time))drawWelcomeFallback($('previewCanvas'),time);
  } else if (view === 'student') {
    if(!draw3D||!draw3D($('studentWorld'),state,'student',teamId,time))drawStudentCamera(time);
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
templeAudio.mount();

// The finale now uses three clickable answers; no exponent keyboard button is needed.

/* KNOPPEN */

$('teacherBtn').onclick = () => show('setup');
$('studentBtn').onclick = () => show('join');

$('homeBtn').onclick = () => {
  if (
    state?.phase === 'playing' &&
    host &&
    !confirm(
      'Terug naar het menu? ' +
      'De sessie blijft alleen actief zolang dit tabblad open is.'
    )
  ) return;

  show('welcome');
};

$('soloBtn').onclick = startSoloPractice;

$('onlineBtn').onclick = () => {
  if (!configured) {
    $('firebaseHelp').classList.remove('hidden');
    $('configStatus').textContent =
      'Firebase-configuratie ontbreekt nog.';
  } else {
    createOnline();
  }
};

$('joinBtn').onclick = joinRoom;
$('startBtn').onclick = startGame;
$('finalBtn').onclick = beginFinal;
$('finishBtn').onclick = finishGame;

$('demoAdd').onclick = async () => {
  if (
    state.phase !== 'lobby' ||
    Object.keys(state.teams || {}).length >= 13
  ) return;

  addTeam(
    'Testteam ' +
    (Object.keys(state.teams || {}).length + 1)
  );

  await writeState();
};

$('demoAnswer').onclick = async () => {
  if (state.phase !== 'playing') return;

  const pool = Object.values(state.teams).filter(
    team => !team.finished && !team.duel
  );

  if (!pool.length) return;

  const team = pool[
    Math.floor(Math.random() * pool.length)
  ];

  const sequence=[...getQuestion(team).answer];
  for(const answer of sequence)await handleRequest({action:'answer',teamId:team.id,answer});
};

if (configured) {
  $('connection').textContent = '● Online beschikbaar';
}

// Local-only, reproducible test sessions; never writes to Firebase.
function mountDemoControls(){
 const box=$('demoControls');
 box.innerHTML='<strong>Lokale test · '+Object.keys(state.teams).length+' teams</strong><label>Volg een team <select id="demoTeam"></select></label><button id="demoStudent">Leerlingweergave</button><button id="demoCorrect">Juist antwoord</button><button id="demoWrong">Fout antwoord</button><label>Hoofdstuk <select id="demoChapter"></select></label>';
 const select=$('demoTeam');
 for(const t of Object.values(state.teams)){const o=document.createElement('option');o.value=t.id;o.textContent=t.name;select.appendChild(o);}
 const chapters=$('demoChapter');adventureStages.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.name;chapters.appendChild(o);});
 chapters.onchange=()=>{const t=state.teams[select.value];t.step=Number(chapters.value);t.finished=false;state.phase='playing';currentSignature='';render();};
 $('demoStudent').onclick=()=>{teamId=select.value;currentSignature='';show('student');render();};
 const answer=async correct=>{const t=state.teams[select.value];if(state.phase==='playing'){const q=getQuestion(t),sequence=[...q.answer];if(!correct){if(sequence.length===1)sequence[0]=(sequence[0]+1)%q.tokens.length;else sequence.reverse();}await handleRequest({action:'submitTokens',teamId:t.id,sequence});}else if(state.phase==='final'){const c=finaleChoices(finaleVraag(t)).correct;await handleRequest({action:'final',teamId:t.id,answer:correct?c:(c+1)%3,atPosition:t.finalPos});}};
 $('demoCorrect').onclick=()=>answer(true);$('demoWrong').onclick=()=>answer(false);
 let back=$('demoTeacher');if(!back){back=document.createElement('button');back.id='demoTeacher';back.textContent='Terug naar leerkracht';document.querySelector('header .headright').appendChild(back);}back.onclick=()=>{show('teacher');render();};
}

