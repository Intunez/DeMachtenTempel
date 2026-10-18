
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

/* Originele procedurele fantasy-soundtrack: geen externe audiobestanden of auteursrechten. */
const templeAudio=(()=>{
 let context=null,master=null,enabled=false,volume=.75,nextBeat=0,beat=0,lastScene='',timer=null;
 const chords={welcome:[[48,55,60,63],[46,53,58,62],[44,51,56,60],[43,50,55,59]],
  playing:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]],
  final:[[50,57,62,65],[46,53,58,62],[48,55,60,64],[43,50,55,59]],
  duel:[[45,52,57,60],[43,50,55,58],[41,48,53,57],[43,50,55,59]],
  ended:[[48,55,60,64],[53,60,65,69],[55,62,67,71],[48,55,60,72]]};
 const hz=n=>440*Math.pow(2,(n-69)/12);
 const sceneName=()=>state?.phase==='ended'?'ended':state?.phase==='final'?(view==='student'&&state?.teams?.[teamId]?.duel?'duel':'final'):state?.phase==='playing'?'playing':'welcome';
 function note(n,when,duration,level=.08,type='sine',pan=0){
  if(!context||!master)return;
  const osc=context.createOscillator(),gain=context.createGain(),stereo=context.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(hz(n),when);
  stereo.pan.value=pan;
  const end=when+duration;
  gain.gain.setValueAtTime(.0001,when);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),when+.06);
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  osc.connect(gain).connect(stereo).connect(master);
  osc.start(when);osc.stop(end+.02);
 }
 function cue(kind){
  if(!enabled||!context||context.state!=='running')return;
  const t=context.currentTime+.025;
  if(kind==='correct'){note(72,t,.22,.11,'sine',-.3);note(76,t+.13,.3,.11,'sine',.2);note(79,t+.26,.6,.12,'triangle');}
  if(kind==='wrong'){note(53,t,.24,.07,'triangle');note(49,t+.18,.42,.07,'sine');}
  if(kind==='duel'){note(45,t,.4,.15,'sawtooth');note(52,t+.19,.55,.09,'triangle');}
  if(kind==='win'){[60,64,67,72,76].forEach((n,i)=>note(n,t+i*.14,1.6,.10,'triangle',(i-2)*.18));}
 }
 function tick(){
  if(!enabled||!context||context.state!=='running')return;
  const scene=sceneName();
  if(scene!==lastScene){lastScene=scene;nextBeat=context.currentTime+.05;beat=0;}
  const tempo=scene==='final'||scene==='duel'?.34:scene==='ended'?.56:.67;
  while(nextBeat<context.currentTime+1.1){
   const chord=chords[scene][Math.floor(beat/8)%4],step=beat%8;
   if(step===0){note(chord[0]-12,nextBeat,tempo*7,.08,'sine');note(chord[0],nextBeat,tempo*6,.045,'triangle',-.5);}
   if(step%2===0){note(chord[step/2],nextBeat,tempo*1.8,.046,'sine',step%4===0?-.55:.55);}
   if(scene==='final'||scene==='duel'){
    if(step%2===0)note(chord[0]-24,nextBeat,.16,.065,'triangle');
    note(chord[(step+1)%4]+12,nextBeat,tempo*.8,.028,'triangle');
   }else if(step===3||step===7){note(chord[2]+12,nextBeat,tempo*2,.036,'sine',.4);}
   nextBeat+=tempo;beat++;
  }
 }
 function updateButton(){
  const b=document.getElementById('templeMusicToggle'),v=document.getElementById('templeMusicVolume');
  if(b){b.textContent=enabled?'♫ Muziek aan':'♪ Muziek uit';b.setAttribute('aria-pressed',String(enabled));}
  if(v)v.value=String(Math.round(volume*100));
 }
 async function toggle(){
  try{
   if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw Error('Audio niet ondersteund');context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);}
   if(enabled){enabled=false;master.gain.setTargetAtTime(0,context.currentTime,.06);clearInterval(timer);timer=null;}
   else{await context.resume();if(context.state!=='running')throw Error('Browser heeft audio geblokkeerd');enabled=true;master.gain.setTargetAtTime(volume,context.currentTime,.03);lastScene='';nextBeat=0;beat=0;cue('correct');timer=setInterval(tick,180);tick();}
   updateButton();
  }catch(e){console.warn('Muziek niet beschikbaar',e);const b=document.getElementById('templeMusicToggle');if(b)b.textContent='Audio geblokkeerd – probeer opnieuw';alert('De browser kon de muziek niet afspelen: '+e.message);}
 }
 function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)/100));if(master&&context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.05);}
 function mount(){
  const header=document.querySelector('header .headright');if(!header||document.getElementById('templeMusicToggle'))return;
  const wrap=document.createElement('div');wrap.className='temple-audio-controls';
  const button=document.createElement('button');button.id='templeMusicToggle';button.className='ghost';button.type='button';button.onclick=toggle;
  const label=document.createElement('label');label.textContent='Volume ';label.title='Volume van de spelmuziek';
  const slider=document.createElement('input');slider.id='templeMusicVolume';slider.type='range';slider.min='0';slider.max='100';slider.value='75';slider.setAttribute('aria-label','Muziekvolume');slider.oninput=()=>setVolume(slider.value);
  label.appendChild(slider);wrap.append(button,label);document.body.appendChild(wrap);updateButton();
 }
 return {mount,cue};
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

const avatars=[["Vermenigvuldiging","×"],["Wortel","√"],["Verschil","−"],["Macht","ⁿ"],["Onbekende","x"],["Oneindigheid","∞"],["Nul","0"],["Verandering","Δ"]];
const questions=[{"t":"De productspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["elke factor","tot die macht.","Om een product","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"De quotiëntspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["het deeltal en de deler","tot die macht.","Om een quotiënt","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"Het productzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["bⁿ","=","·","(a · b)ⁿ","aⁿ"],"answer":[3,1,4,2,0]},{"t":"Het quotiëntzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=",":","(a : b)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De productpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[1],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De quotiëntpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[0],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De x-y-inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["yⁿ","=","·","(x · y)ⁿ","xⁿ"],"answer":[3,1,4,2,0]},{"t":"De x-y-breuk","q":"Zet de symbolen in de juiste volgorde.","tokens":["xⁿ","yⁿ","=",":","(x : y)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De gouden spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[0],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De blauwe spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[1],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De drie factoren","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=","cⁿ","·","(a · b · c)ⁿ","·"],"answer":[5,2,0,4,1,6,3]},{"t":"De laatste inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["(p : q)ᵐ","pᵐ","qᵐ","=",":"],"answer":[0,3,1,4,2]}];
const duelQs=questions.slice(0,10);
const finalQs=[{"q":"(2a)^2","a":"4a^2","set":16},{"q":"(4c)^3","a":"64c^3","set":16},{"q":"(-ab)^2","a":"a^2b^2","set":16},{"q":"(-3c)^2","a":"9c^2","set":16},{"q":"(-2c)^3","a":"-8c^3","set":16},{"q":"(-2ab)^2","a":"4a^2b^2","set":16},{"q":"(2ac)^3","a":"8a^3c^3","set":16},{"q":"(a^2b)^2","a":"a^4b^2","set":16},{"q":"(-ab)^3","a":"-a^3b^3","set":16},{"q":"(-1/4 ac)^2","a":"1/16a^2c^2","set":16},{"q":"(2a^2b)^2","a":"4a^4b^2","set":17},{"q":"(4ac^4)^2","a":"16a^2c^8","set":17},{"q":"(10xy^2z^3)^2","a":"100x^2y^4z^6","set":17},{"q":"(-4/5 a^3b^4)^2","a":"16/25a^6b^8","set":17},{"q":"(-3x^2y^4)^3","a":"-27x^6y^12","set":17},{"q":"(2/3)^2","a":"4/9","set":19},{"q":"(-1/2)^3","a":"-1/8","set":19},{"q":"(4/5)^2","a":"16/25","set":19},{"q":"(-1/10)^3","a":"-1/1000","set":19},{"q":"(3/5)^(-2)","a":"25/9","set":19},{"q":"(1/3)^(-2)","a":"9","set":19},{"q":"(-3/5)^(-2)","a":"25/9","set":19},{"q":"(-1/3)^2","a":"1/9","set":19},{"q":"(4/5)^(-2)","a":"25/16","set":19},{"q":"(1/10)^(-3)","a":"1000","set":19},{"q":"(a/b)^2","a":"a^2/b^2","set":20},{"q":"(-x/2)^3","a":"-x^3/8","set":20},{"q":"(3/z^2)^2","a":"9/z^4","set":20},{"q":"(1/a)^4","a":"1/a^4","set":20},{"q":"(-c/2)^(-2)","a":"4/c^2","set":20},{"q":"(-x/y)^2","a":"x^2/y^2","set":20},{"q":"(a^2/b^3)^(-2)","a":"b^6/a^4","set":20},{"q":"(-3/y^3)^3","a":"-27/y^9","set":20},{"q":"(-1/ab)^2","a":"1/a^2b^2","set":20},{"q":"(x^2/y)^(-1)","a":"y/x^2","set":20},{"q":"(a/b)^m","a":"a^m/b^m","set":21},{"q":"(x/y)^(p+1)","a":"x^(p+1)/y^(p+1)","set":21},{"q":"(x/2)^(2+a)","a":"x^(2+a)/2^(2+a)","set":21},{"q":"(-3/2)^(2a)","a":"3^(2a)/2^(2a)","set":21},{"q":"(x^2/y)^(-m)","a":"y^m/x^(2m)","set":21}];
function avatarFace(n){
 if(!Number.isInteger(n))return '<span class="avatar-pending">✧</span>';
 const colors=['#2864b9','#398456','#e7c995','#c75537','#2e9ccc','#7650b7','#c79843','#ad376d'];
 const hair=['#513324','#352a1f','#f5e6b8','#a64225','#1b6c83','#3a263e','#b78235','#8d244f'];
 const skin=['#efbc95','#c88c64','#f3c7a7','#d39a72','#e3b18e','#b97c58','#e7b78e','#edb09b'];
 const mark=['∞','x','aⁿ','÷','√','◇','△','∑'];
 const c=colors[n],h=hair[n],face=skin[n],uid='avatar'+n;
 return '<span class="fantasy-avatar" aria-hidden="true"><svg viewBox="0 0 180 240" xmlns="http://www.w3.org/2000/svg" role="img">'+
 '<defs><linearGradient id="'+uid+'robe" x1="0" x2="1" y1="0" y2="1"><stop stop-color="'+c+'"/><stop offset="1" stop-color="#162336"/></linearGradient>'+
 '<radialGradient id="'+uid+'glow"><stop stop-color="'+c+'" stop-opacity=".6"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></radialGradient></defs>'+
 '<ellipse cx="90" cy="128" rx="80" ry="100" fill="url(#'+uid+'glow)"/>'+
 '<path d="M47 147 Q19 168 13 225 L167 225 Q159 170 130 145Z" fill="url(#'+uid+'robe)" stroke="#d7b66c" stroke-width="2"/>'+
 '<path d="M57 149 Q36 177 45 227 L137 227 Q142 180 121 148Z" fill="'+c+'" stroke="#d8bc82" stroke-width="2"/>'+
 '<path d="M65 154 L91 210 L115 154" fill="#172e42" opacity=".75"/>'+
 '<path d="M58 165 L46 202 M123 165 L135 202" stroke="#e5c17a" stroke-width="3" opacity=".8"/>'+
 '<rect x="52" y="185" width="78" height="9" rx="3" fill="#51372b"/><rect x="83" y="183" width="16" height="13" rx="2" fill="#e8c780"/>'+
 '<path d="M68 100 Q58 63 90 54 Q123 62 112 106 L111 130 Q105 147 90 149 Q73 147 68 129Z" fill="'+face+'"/>'+
 '<path d="M64 104 Q47 65 73 49 Q100 31 122 57 Q134 76 117 109 L115 86 Q103 79 99 66 Q86 84 68 84Z" fill="'+h+'" stroke="#281f29" stroke-width="2"/>'+
 '<path d="M67 83 Q75 53 98 58 Q122 60 122 82" fill="none" stroke="'+h+'" stroke-width="13" stroke-linecap="round"/>'+
 '<ellipse cx="78" cy="110" rx="4" ry="5" fill="#263345"/><ellipse cx="102" cy="110" rx="4" ry="5" fill="#263345"/>'+
 '<path d="M82 130 Q91 137 100 130" fill="none" stroke="#a45d54" stroke-width="2.5" stroke-linecap="round"/>'+
 '<path d="M62 146 Q40 151 34 179 L49 184 L73 160 M118 160 L139 184 L153 178 Q145 151 118 146" fill="'+c+'" stroke="#ddbd7d" stroke-width="3"/>'+
 '<circle cx="91" cy="168" r="17" fill="#182a41" stroke="#e5c37e" stroke-width="3"/>'+
 '<text x="91" y="176" text-anchor="middle" font-size="'+(n===2?19:26)+'" font-weight="bold" fill="#ffe9a6" font-family="Georgia,serif">'+mark[n]+'</text>'+
 (n===0||n===1||n===4?'<path d="M25 225 L31 85" stroke="#a7834d" stroke-width="7" stroke-linecap="round"/><circle cx="32" cy="76" r="16" fill="'+c+'" stroke="#e5c27a" stroke-width="4"/>':n===2||n===5?'<path d="M21 183 L58 177 L65 208 L27 215Z" fill="#664832" stroke="#e6c07b" stroke-width="3"/>':n===3?'<rect x="16" y="173" width="31" height="31" rx="5" fill="#ff704b" stroke="#e5b96c" stroke-width="3"/>':'<circle cx="28" cy="185" r="15" fill="none" stroke="#ffe1a2" stroke-width="5"/>')+
 '</svg></span>';
}
function norm(v){return String(v).replace(/\s/g,'').replace(/[·×*]/g,'').replace(/−/g,'-').replace(/[{}]/g,'').replace(/:/g,'/').replace(/\^\(([^()]+)\)/g,'^$1');}
function hash(v){let x=2166136261;for(const ch of norm(v)){x^=ch.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;}
function finaleVraag(t){return finalQs[((t.finalPos||0)+t.route*3)%finalQs.length];}
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
function createDemo() {
  online = false;
  demo = true;
  host = true;
  room = 'DEMO';
  state = newState();

  [
    'De Exponenten',
    'De Draken',
    'Team Bliksem',
    'De Rekentijgers',
    'De Breukbrekers',
    'De Getallenhelden'
  ].forEach((name,i)=>{const id=addTeam(name);state.teams[id].avatar=i;});

  openTeacher();

  $('demoControls').classList.remove('hidden');
  $('connection').textContent = '● Demonstratiemodus';
}

function addTeam(name) {
  const used=new Set(Object.values(state.teams||{}).map(t=>t.route));
  const index=Array.from({length:8},(_,i)=>i).find(i=>!used.has(i));
  if(index===undefined)throw Error('Maximum 8 teams.');

  const id = 't' + index + '_' +
    Math.random().toString(36).slice(2, 5);

  state.teams[id] = {
    id,
    name: name.slice(0, 22),
    color: colors[index % 8],
    route: index % 8,
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
function openTeacher() {
  show('teacher');

  showRoomCode();
  $('demoControls').classList.toggle('hidden', !demo);

  render();

  if (timerHandle) clearInterval(timerHandle);

  timerHandle = setInterval(() => {
    renderClock();

    if (
      host &&
      state?.phase === 'playing' &&
      Date.now() - state.started >= 12 * 60 * 1000
    ) {
      beginFinal();
    }
    if(host&&state?.phase==='final'&&state.finalStarted&&Date.now()-state.finalStarted>=3*60*1000){
      const ranking=Object.values(state.teams||{}).sort((a,b)=>(b.finalPos||0)-(a.finalPos||0)||b.score-a.score);
      if(ranking.length){state.winner=ranking[0].id;state.phase='ended';flash('🏆 De tijd is om! '+ranking[0].name+' wint!');writeState();}
    }
  }, 500);

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

    if (Object.keys(state.teams || {}).length >= 8) {
      throw Error('Er zijn al 8 teams.');
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

        } else if (Object.keys(state.teams || {}).length >= 8) {
          response = {
            error: 'Maximum 8 teams.'
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
  if(teams.length<2){alert('Minstens 2 teams nodig.');return;}
  state.phase='avatars';flash('Alle teams mogen nu tegelijk een avatar kiezen.');
 }else if(state.phase==='avatars'){
  if(teams.some(t=>!Number.isInteger(t.avatar))){alert('Wacht tot alle teams gekozen hebben.');return;}
  state.phase='playing';state.started=Date.now();flash('De poorten openen!');
 }else return;
 await writeState();
}
function getQuestion(team) {
  return questions[
    (team.solved + team.route * 2) % questions.length
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
  if(!Number.isInteger(n)||n<0||n>=8||Number.isInteger(t.avatar)||Object.values(state.teams).some(v=>v.avatar===n))return;
  t.avatar=n;if(room==='SOLO'){state.phase='playing';state.started=Date.now();flash('Je oefenavontuur begint!');}else flash(t.name+' heeft een figuur gekozen.');await writeState();return;
 }
 if(r.action==='resetTokens'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  t.progress=[];await writeState();return;
 }
 if(r.action==='resetTokens'&&state.phase==='final'&&getActiveDuel(t)){
  const duel=getActiveDuel(t);duel.progress[t.id]=[];await writeState();return;
 }
 if(r.action==='submitTokens'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  const q=getQuestion(t),selected=r.sequence;
  if(!Array.isArray(selected)||selected.length!==q.answer.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=q.tokens.length)||new Set(selected).size!==selected.length)return;
  if(selected.every((v,i)=>v===q.answer[i])){
   t.score+=100;t.solved++;t.step=Math.min(routes[t.route].length-1,t.step+1);
   if(t.step===routes[t.route].length-1){t.finished=true;if(room==='SOLO'){t.finished=false;t.step=0;t.route=(t.route+1)%8;flash('Nieuwe oefenronde!');}}
   flash(t.name+' opent een doorgang!');templeAudio.cue('correct');
  }else{
   t.wrong++;t.score=Math.max(0,t.score-10);t.lastFeedback='❌ FOUT ANTWOORD! Probeer opnieuw.';
   flash('❌ Fout antwoord van '+t.name);templeAudio.cue('wrong');
  }
  t.progress=[];await writeState();return;
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
    t.score+=100;t.solved++;t.step=Math.min(routes[t.route].length-1,t.step+1);
    flash(t.name+' opent een doorgang!');
    if(t.step===routes[t.route].length-1)t.finished=true;
   }else{t.wrong++;t.score=Math.max(0,t.score-10);t.lastFeedback='❌ FOUT ANTWOORD! Probeer opnieuw.';flash('❌ Fout antwoord van '+t.name);}
   t.progress=[];
  }await writeState();return;
 }
 // A challenge starts immediately: opponents cannot refuse. Use the existing
 // Firebase-approved numeric 'answer' request for backwards-compatible rules.
 if((r.action==='challenge'||(r.action==='answer'&&r.challengeTarget===true))&&state.phase==='final'&&!state.winner){
  const other=Object.values(state.teams).find(v=>v.route===n&&v.id!==t.id);
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
  if(Number(r.answer??r.choice)===finaleChoices(finaleVraag(t)).correct){
   const previous=t.finalPos;
   t.finalPos=previous+1;
   t.finalAnswers=(t.finalAnswers||0)+1;
   if(t.finalPos!==previous+1)return;
   if(t.finalPos>=16){state.winner=t.id;state.phase='ended';t.score+=300;flash('🏆 '+t.name+' wint!');templeAudio.cue('win');}
   else flash('⚡ '+t.name+' bereikt vak '+t.finalPos);
  }else{t.wrong++;flash('Fout finaleantwoord bij '+t.name);}
  await writeState();
 }
}
function triggerDuel(moved) {
  const node = routes[moved.route][moved.step];

  if (node === 'vault' || node === 'entry') return;

  const opponent = Object.values(state.teams).find(
    team =>
      team.id !== moved.id &&
      !team.duel &&
      !team.finished &&
      routes[team.route][team.step] === node
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
 Object.values(state.teams||{}).sort((a,b)=>b.score-a.score||a.joined-b.joined).forEach((t,i)=>{t.duel='';t.pendingFrom='';t.challengesStarted=0;t.finalPos=Math.max(1,8-i);t.finalAnswers=0;});
 Object.values(state.duels||{}).forEach(d=>d.done=true);
 flash('⚡ Finale: de punten bepalen de voorsprong. Race naar vak 16!');await writeState();
}
function renderClock() {
  if (!state || view !== 'teacher') return;

  const remaining =
    state.phase === 'lobby'
      ? 720
      : state.phase === 'playing'
        ? Math.max(
            0,
            720 - Math.floor(
              (Date.now() - state.started) / 1000
            )
          )
        : state.phase === 'final' ? Math.max(0,180-Math.floor((Date.now()-(state.finalStarted||Date.now()))/1000)) : 0;

  $('timer').textContent =
    String(Math.floor(remaining / 60)).padStart(2, '0') +
    ':' +
    String(remaining % 60).padStart(2, '0');
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
   else{if(text[j]==='-'||text[j]==='+')exp+=text[j++];while(j<text.length&&/[a-zA-Z0-9]/.test(text[j]))exp+=text[j++];}
   out+='<sup>'+escape(exp)+'</sup>';i=j-1;
  }
  return out;
 };
 // Each slash binds its adjacent numerator and denominator, including powers.
 const token='(?:\\([^()]*\\)|[+-]?(?:\\d+|[a-zA-Z]+))(?:\\^(?:\\([^()]*\\)|[+-]?[a-zA-Z0-9]+))?';
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
  $('teamCount').textContent=teams.length+' / 8';
  $('scoreboard').innerHTML=teams.map(t=>'<div class="teamrow">'+avatarFace(t.avatar)+'<div><b>'+escapeHtml(t.name)+'</b><small>'+(state.phase==='final'?'Vak '+t.finalPos+'/16':t.duel?'⚔ Duel':t.solved+' opdrachten opgelost')+'</small></div><span class="pts">'+t.score+'</span><button type="button" class="remove-team" data-remove-team="'+escapeHtml(t.id)+'" title="Team verwijderen" aria-label="Verwijder team '+escapeHtml(t.name)+'">✕</button></div>').join('');
  $('scoreboard').querySelectorAll('[data-remove-team]').forEach(btn=>btn.addEventListener('click',()=>removeTeamFromTeacher(btn.dataset.removeTeam).catch(e=>alert('Verwijderen mislukt: '+e.message))));
  $('phaseLabel').textContent=({lobby:'Wachten op teams',avatars:'Avatarselectie',playing:'De tempel is geopend',final:'⚡ Finale',ended:'🏆 Spel afgelopen'})[state.phase];
  $('eventLabel').textContent=state.event||'';
  $('startBtn').disabled=!['lobby','avatars'].includes(state.phase);
  $('startBtn').textContent=state.phase==='lobby'?'🎭 Avatarselectie starten':state.phase==='avatars'?'▶ Start avontuur':'▶ Avontuur bezig';
  $('finalBtn').disabled=state.phase!=='playing';renderClock();
  $('overlay').classList.add('hidden');
  const stage=$('liveStage');stage.classList.add('hidden');
  if(state.phase==='avatars'){
   stage.classList.remove('hidden');stage.innerHTML='<h2>🎭 KIES JULLIE AVATAR</h2><div class="avatargrid">'+teams.map(t=>'<div class="avatarcard">'+avatarFace(t.avatar)+'<b>'+escapeHtml(t.name)+'</b><small>'+(Number.isInteger(t.avatar)?'Figuur gekozen':'Kiest nog...')+'</small></div>').join('')+'</div>';
  }else if(state.phase==='playing'){
   if(teams.length>0&&teams.every(t=>t.finished)){$('eventLabel').textContent='🏁 ALLE TEAMS HEBBEN DE TEMPEL BEREIKT — START DE FINALE!';}
   const d=Object.values(state.duels||{}).find(x=>!x.done);
   if(d){const q=duelQs[d.qIndex];stage.classList.remove('hidden');stage.innerHTML='<h2>⚔ LIVE DUEL</h2><p>'+escapeHtml(q.q)+'</p><div class="duelgrid">'+[d.a,d.b].map(id=>'<div class="duelteam"><h3>'+escapeHtml(state.teams[id]?.name||'Team')+'</h3><div class="tokenline">'+(d.progress?.[id]||[]).map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div></div>').join('')+'</div>';}
  }else if(['final','ended'].includes(state.phase)){
   stage.classList.remove('hidden');stage.innerHTML='<div class="vault-race"><div class="vault-race-heading"><span class="vault-crown">♛</span><div><h2>DE LAATSTE TOCHT NAAR DE SCHATKAMER</h2><p>Elke juiste oefening brengt je een stap dichter bij de schat.</p></div></div><div class="vault-lanes">'+teams.map(t=>{const pos=Math.max(0,Math.min(16,t.finalPos||0));const pct=pos/16*100;return '<div class="vault-lane" style="--teamcolor:'+t.color+'"><div class="vault-lane-info"><span class="vault-avatar">'+avatarFace(t.avatar)+'</span><div class="vault-lane-name"><strong>'+escapeHtml(t.name)+'</strong><small>'+pos+' van 16 stappen</small></div><b>'+Math.round(pct)+'%</b></div><div class="vault-path"><div class="vault-path-fill" style="width:'+pct+'%"></div><span class="vault-path-start">⚑</span><span class="vault-path-marker" style="left:clamp(12px,'+pct+'%,calc(100% - 24px))">◆</span><span class="vault-path-end">🏰</span></div></div>';}).join('')+'</div><div class="vault-race-footer"><span>⚑ START</span><span>🏰 SCHATKAMER · 16 STAPPEN</span></div></div>'+(Object.values(state.duels||{}).filter(d=>!d.done).map(d=>'<div class="final-duel"><h3>⚔ LIVE DUEL: '+escapeHtml(state.teams[d.a]?.name||'')+' tegen '+escapeHtml(state.teams[d.b]?.name||'')+'</h3><p>'+escapeHtml(duelQs[d.qIndex].q)+'</p>'+[d.a,d.b].map(id=>'<div><b>'+escapeHtml(state.teams[id]?.name||'')+'</b> · '+(d.progress?.[id]||[]).length+' / '+duelQs[d.qIndex].tokens.length+' onderdelen</div>').join('')+'</div>').join(''))+(state.winner?'<h2>🏆 '+escapeHtml(state.teams[state.winner]?.name||'')+' wint!</h2>':'');
  }
 }
 if(view==='student')renderStudent();
}
let tokenDraft=null;
function tokenPuzzle(q,action,progress){
 const box=$('options'),kind=action==='duel'?'duel':'adventure';
 const key=kind+':'+(kind==='duel'?(getActiveDuel(state.teams[teamId])?.id||''):((state.teams[teamId]?.solved||0)+':'+(state.teams[teamId]?.route||0)))+':'+(state.teams[teamId]?.wrong||0);
 if(!tokenDraft||tokenDraft.key!==key)tokenDraft={key,sequence:[]};
 const selected=tokenDraft.sequence;
 const paint=()=>{
  box.innerHTML=(q.fullRule?'<div class="full-rule">'+escapeHtml(q.fullRule)+'</div>':'')+
   '<p class="token-instruction">Tik of sleep de stukken naar de antwoordbalk. Klik op een geplaatst stuk om het terug te leggen.</p>';
  const line=document.createElement('div');line.className='tokenline token-dropzone';
  line.setAttribute('aria-label','Samengestelde formule; sleep een stuk hierheen');
  line.ondragover=e=>e.preventDefault();
  line.ondrop=e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain');const i=Number(raw);if(!Number.isInteger(i))return;if(raw.startsWith('placed:'))return;if(!selected.includes(i)){selected.push(i);paint();}};
  selected.forEach((index,at)=>{
   const b=document.createElement('button');b.type='button';b.className='placed token-placed';
   b.textContent=q.tokens[index];b.title='Klik om dit stuk terug te leggen';b.draggable=true;
   b.ondragstart=e=>e.dataTransfer.setData('text/plain','placed:'+at);
   b.onclick=()=>{selected.splice(at,1);paint();};line.appendChild(b);
  });
  if(!selected.length){const hint=document.createElement('span');hint.className='token-empty';hint.textContent='Sleep of klik hier de formule samen';line.appendChild(hint);}
  box.appendChild(line);
  const choices=document.createElement('div');choices.className='tokenchoices token-source';
  choices.ondragover=e=>e.preventDefault();
  choices.ondrop=e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain');if(!raw.startsWith('placed:'))return;const at=Number(raw.slice(7));if(Number.isInteger(at)&&at>=0&&at<selected.length){selected.splice(at,1);paint();}};
  q.tokens.forEach((word,i)=>{
   if(selected.includes(i))return;
   const b=document.createElement('button');b.type='button';b.textContent=word;b.draggable=true;
   b.ondragstart=e=>e.dataTransfer.setData('text/plain',String(i));
   b.onclick=()=>{selected.push(i);paint();};choices.appendChild(b);
  });
  box.appendChild(choices);
  const actions=document.createElement('div');actions.className='token-actions';
  const undo=document.createElement('button');undo.type='button';undo.textContent='↶ Laatste stap terug';undo.disabled=!selected.length;
  undo.onclick=()=>{selected.pop();paint();};actions.appendChild(undo);
  const reset=document.createElement('button');reset.type='button';reset.textContent='↺ Alles wissen';reset.disabled=!selected.length;
  reset.onclick=()=>{selected.length=0;paint();};actions.appendChild(reset);
  const check=document.createElement('button');check.type='button';check.className='primary';check.textContent='✓ Nakijken';
  check.disabled=selected.length!==q.answer.length;
  check.onclick=async()=>{
   check.disabled=true;
   try{await sendRequest(kind==='duel'?'submitDuelTokens':'submitTokens',{sequence:[...selected]});if(!demo)$('feedback').textContent='Antwoord ingediend…';}
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
 $('myPosition').textContent=state.phase==='final'?'Vak '+t.finalPos+'/16':t.finished?'In de schatkamer':'Doorgang '+(t.step+1);
 const d=getActiveDuel(t),p=d?(d.progress?.[t.id]||[]):(t.progress||[]);
 const sig=[state.phase,t.solved,t.wrong,t.duel,t.pendingFrom,t.challengesStarted,t.avatar,t.finalPos,state.winner,p.join(','),Object.values(state.teams||{}).map(v=>[v.avatar,v.pendingFrom,v.duel].join('/')).join(',')].join(':');
 if(currentSignature===sig)return;const previousSignature=currentSignature;const previousWrong=Number(renderStudent.lastWrong??0);renderStudent.lastWrong=t.wrong||0;currentSignature=sig;
 $('feedback').textContent=t.wrong>previousWrong&&previousSignature&&state.phase==='playing'?'❌ FOUT ANTWOORD! Probeer opnieuw.':'';$('numberBox').classList.add('hidden');$('options').innerHTML='';
 const title=$('questTitle'),txt=$('questText'),status=$('studentStatus');
 if(state.phase==='lobby'){status.textContent='Wachten op de leerkracht';title.textContent='Je team is aangemeld';txt.textContent='De avatarselectie start zodra alle teams er zijn.';return;}
 if(state.phase==='avatars'){
  status.textContent='Alle teams kiezen tegelijk';title.textContent=Number.isInteger(t.avatar)?'Jullie figuur is gekozen':'Kies je figuur';txt.textContent='Wie het eerst kiest, krijgt de avatar.';
  if(!Number.isInteger(t.avatar)){
   const taken=new Set(Object.values(state.teams||{}).map(v=>v.avatar));
   const grid=document.createElement('div');grid.className='avatargrid';
   avatars.forEach((a,i)=>{const b=document.createElement('button');b.className='avatarcard';b.disabled=taken.has(i);b.innerHTML=avatarFace(i);b.setAttribute('aria-label','Figuur '+(i+1));b.onclick=async()=>{b.disabled=true;try{await sendRequest('answer',{answer:i});}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};grid.appendChild(b);});$('options').appendChild(grid);
  }return;
 }
 if(state.phase==='ended'){const w=state.teams[state.winner];status.textContent='Spel afgelopen';title.textContent=w?.id===t.id?'🏆 JULLIE WINNEN!':'De schat is geopend';txt.textContent='Winnaar: '+(w?.name||'Onbekend');return;}
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
    try{await sendRequest('final',{answer:index,atPosition:t.finalPos});$('feedback').textContent='Antwoord ontvangen…';}
    catch(e){$('feedback').textContent=e.message;grid.querySelectorAll('button').forEach(b=>b.disabled=false);}
   };
   grid.appendChild(button);
  });
  $('options').appendChild(grid);
  if((t.challengesStarted||0)<2&&!Object.values(state.teams).some(v=>v.pendingFrom===t.id)){
   const area=document.createElement('div');area.className='challenge-area';area.innerHTML='<h4>⚔ Daag een team uit ('+(2-(t.challengesStarted||0))+' uitdagingen over)</h4><p>Het duel begint meteen. Het andere team kan niet weigeren. Win en ga twee vakken vooruit.</p>';
   Object.values(state.teams).filter(v=>v.id!==t.id&&!v.duel&&!v.pendingFrom).forEach(v=>{const b=document.createElement('button');b.textContent='⚔ '+v.name+' · vak '+v.finalPos;b.onclick=async()=>{b.disabled=true;try{await sendRequest('answer',{answer:v.route,challengeTarget:true});$('feedback').textContent='⚔ Uitdaging verstuurd. Het duel begint!';}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};area.appendChild(b);});$('options').appendChild(area);
  }return;
 }
 if(d){status.textContent='⚔ Duel';title.textContent='DUEL tegen '+(state.teams[d.a===t.id?d.b:d.a]?.name||'');const q=duelQs[d.qIndex];txt.textContent=q.q;tokenPuzzle(q,'duel',p);return;}
 if(t.finished){status.textContent='In de schatkamer';title.textContent='Wacht op de finale';txt.textContent='Jullie hebben '+t.score+' punten verzameld.';return;}
 status.textContent='+100 punten per juiste spreuk';const q=getQuestion(t);title.textContent=q.t;txt.textContent=q.fullRule||q.q;tokenPuzzle(q,'answer',p);
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
  const route=scenicRoutes[t.route]||scenicRoutes[0];
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
  ctx.font='bold 15px Inter,Arial';ctx.lineWidth=5;ctx.strokeStyle='#071a20';ctx.strokeText(t.name,0,-40);ctx.fillStyle='#fff7df';ctx.fillText(t.name,0,-40);
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
 const route=routes[team.route]||routes[0];
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

let draw3D=null;
import('./world3d.js?v=mathfigures20261018').then(module=>{draw3D=module.draw3D;}).catch(error=>console.warn('3D-weergave niet beschikbaar; 2D-reserveweergave actief.',error));
function drawWelcomeFallback(canvas,time){
 if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#0b2735');grad.addColorStop(.65,'#386373');grad.addColorStop(1,'#b0a07d');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.fillStyle='#f3dfb6';ctx.font='bold 40px Georgia,serif';ctx.fillText('DE MACHTENTEMPEL',w/2,h*.45);
 ctx.font='22px Georgia,serif';ctx.fillText('De magische wereld wordt geladen…',w/2,h*.53);
}

function animate(time) {
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

$('demoAdd').onclick = async () => {
  if (
    state.phase !== 'lobby' ||
    Object.keys(state.teams || {}).length >= 8
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
