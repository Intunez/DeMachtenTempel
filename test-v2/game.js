
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

const avatars=[["Xander","×"],["Rex","√"],["Nox","−"],["Vex","ⁿ"],["Axel","x"],["Nova","∞"],["Zero","0"],["Delta","Δ"]];
const questions=[{"t":"De productspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["elke factor","tot die macht.","Om een product","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"De quotiëntspreuk","q":"Zet de woordgroepen in de juiste volgorde.","tokens":["het deeltal en de deler","tot die macht.","Om een quotiënt","verheffen we","tot een macht te verheffen,"],"answer":[2,4,3,0,1]},{"t":"Het productzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["bⁿ","=","·","(a · b)ⁿ","aⁿ"],"answer":[3,1,4,2,0]},{"t":"Het quotiëntzegel","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=",":","(a : b)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De productpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[1],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De quotiëntpoort","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a : b)ⁿ = aⁿ : bⁿ","(a · b)ⁿ = aⁿ · bⁿ"],"answer":[0],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De x-y-inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["yⁿ","=","·","(x · y)ⁿ","xⁿ"],"answer":[3,1,4,2,0]},{"t":"De x-y-breuk","q":"Zet de symbolen in de juiste volgorde.","tokens":["xⁿ","yⁿ","=",":","(x : y)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De gouden spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[0],"fullRule":"Om een product tot een macht te verheffen, verheffen we elke factor tot die macht."},{"t":"De blauwe spreuk","q":"Koppel de volledige spreuk aan de juiste volledige formule. Kies de formule.","tokens":["(a · b)ⁿ = aⁿ · bⁿ","(a : b)ⁿ = aⁿ : bⁿ"],"answer":[1],"fullRule":"Om een quotiënt tot een macht te verheffen, verheffen we het deeltal en de deler tot die macht."},{"t":"De drie factoren","q":"Zet de symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=","cⁿ","·","(a · b · c)ⁿ","·"],"answer":[5,2,0,4,1,6,3]},{"t":"De laatste inscriptie","q":"Zet de symbolen in de juiste volgorde.","tokens":["(p : q)ᵐ","pᵐ","qᵐ","=",":"],"answer":[0,3,1,4,2]}];
const duelQs=questions.slice(0,10);
const finalQs=[{"q":"(2a)^2","a":"4a^2","set":16},{"q":"(4c)^3","a":"64c^3","set":16},{"q":"(-ab)^2","a":"a^2b^2","set":16},{"q":"(-3c)^2","a":"9c^2","set":16},{"q":"(-2c)^3","a":"-8c^3","set":16},{"q":"(-2ab)^2","a":"4a^2b^2","set":16},{"q":"(2ac)^3","a":"8a^3c^3","set":16},{"q":"(a^2b)^2","a":"a^4b^2","set":16},{"q":"(-ab)^3","a":"-a^3b^3","set":16},{"q":"(-1/4 ac)^2","a":"1/16a^2c^2","set":16},{"q":"(2a^2b)^2","a":"4a^4b^2","set":17},{"q":"(4ac^4)^2","a":"16a^2c^8","set":17},{"q":"(10xy^2z^3)^2","a":"100x^2y^4z^6","set":17},{"q":"(-4/5 a^3b^4)^2","a":"16/25a^6b^8","set":17},{"q":"(-3x^2y^4)^3","a":"-27x^6y^12","set":17},{"q":"(2/3)^2","a":"4/9","set":19},{"q":"(-1/2)^3","a":"-1/8","set":19},{"q":"(4/5)^2","a":"16/25","set":19},{"q":"(-1/10)^3","a":"-1/1000","set":19},{"q":"(3/5)^(-2)","a":"25/9","set":19},{"q":"(1/3)^(-2)","a":"9","set":19},{"q":"(-3/5)^(-2)","a":"25/9","set":19},{"q":"(-1/3)^2","a":"1/9","set":19},{"q":"(4/5)^(-2)","a":"25/16","set":19},{"q":"(1/10)^(-3)","a":"1000","set":19},{"q":"(a/b)^2","a":"a^2/b^2","set":20},{"q":"(-x/2)^3","a":"-x^3/8","set":20},{"q":"(3/z^2)^2","a":"9/z^4","set":20},{"q":"(1/a)^4","a":"1/a^4","set":20},{"q":"(-c/2)^(-2)","a":"4/c^2","set":20},{"q":"(-x/y)^2","a":"x^2/y^2","set":20},{"q":"(a^2/b^3)^(-2)","a":"b^6/a^4","set":20},{"q":"(-3/y^3)^3","a":"-27/y^9","set":20},{"q":"(-1/ab)^2","a":"1/a^2b^2","set":20},{"q":"(x^2/y)^(-1)","a":"y/x^2","set":20},{"q":"(a/b)^m","a":"a^m/b^m","set":21},{"q":"(x/y)^(p+1)","a":"x^(p+1)/y^(p+1)","set":21},{"q":"(x/2)^(2+a)","a":"x^(2+a)/2^(2+a)","set":21},{"q":"(-3/2)^(2a)","a":"3^(2a)/2^(2a)","set":21},{"q":"(x^2/y)^(-m)","a":"y^m/x^(2m)","set":21}];
function avatarFace(n){if(!Number.isInteger(n))return '◈';const symbols=['⚔','✦','♜','☽','♞','✧','❖','⚜'];return '<span class="mathavatar hero-avatar" style="--av:'+colors[n]+'"><span class="hero-icon">'+symbols[n]+'</span></span>';}
function norm(v){return String(v).replace(/\s/g,'').replace(/[·×*]/g,'').replace(/−/g,'-').replace(/[{}]/g,'').replace(/:/g,'/').replace(/\^\(([^()]+)\)/g,'^$1');}
function hash(v){let x=2166136261;for(const ch of norm(v)){x^=ch.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;}
function finaleVraag(t){return finalQs[((t.finalPos||0)+t.route*3)%finalQs.length];}

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

function openTeacher() {
  show('teacher');

  $('roomCode').textContent = room;
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

  await firebase.push(
    firebase.ref(db, roomPath('requests')),
    {
      action,
      teamId,
      uid: auth.currentUser.uid,
      ...payload,
      at: Date.now()
    }
  );
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
  t.avatar=n;flash(t.name+' heeft een figuur gekozen.');await writeState();return;
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
 if(r.action==='challenge'&&state.phase==='final'&&!state.winner){
  const other=Object.values(state.teams).find(v=>v.route===n&&v.id!==t.id);
  if(!other||t.duel||other.duel||(t.challengesStarted||0)>=2||Object.values(state.teams).some(v=>v.pendingFrom===t.id)||t.pendingFrom||other.pendingFrom)return;
  other.pendingFrom=t.id;flash('⚔ '+t.name+' daagt '+other.name+' uit!');await writeState();return;
 }
 if((r.action==='accept'||r.action==='decline')&&state.phase==='final'){
  const challenger=state.teams[t.pendingFrom];if(!challenger)return;
  t.pendingFrom='';
  if(r.action==='accept'&&!t.duel&&!challenger.duel){
   const id='d'+(++state.duelNumber);
   state.duels[id]={id,a:challenger.id,b:t.id,qIndex:(state.duelNumber-1)%duelQs.length,done:false,winner:'',progress:{[challenger.id]:[],[t.id]:[]}};
   t.duel=id;challenger.duel=id;challenger.challengesStarted=(challenger.challengesStarted||0)+1;
   flash('⚔ Duel: '+challenger.name+' tegen '+t.name);
  }else flash(t.name+' weigert de uitdaging.');
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
  if(n===hash(finaleVraag(t).a)){
   const previous=t.finalPos;
   t.finalPos=previous+1;
   t.finalAnswers=(t.finalAnswers||0)+1;
   if(t.finalPos!==previous+1)return;
   if(t.finalPos===16&&t.finalAnswers>=8){state.winner=t.id;state.phase='ended';t.score+=300;flash('🏆 '+t.name+' wint!');}
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
 const input=String(expression);
 let html='';
 for(let i=0;i<input.length;i++){
  if(input[i]==='^'){
   let exponent='';
   if(input[i+1]==='('){
    let depth=1,j=i+2;
    for(;j<input.length&&depth>0;j++){
     if(input[j]==='(')depth++;
     else if(input[j]===')')depth--;
     if(depth>0)exponent+=input[j];
    }
    i=j-1;
   }else{
    let j=i+1;
    if(input[j]==='-'||input[j]==='+')exponent+=input[j++];
    while(j<input.length&&/[0-9a-zA-Z]/.test(input[j]))exponent+=input[j++];
    i=j-1;
   }
   html+='<sup>'+escapeHtml(exponent)+'</sup>';
  }else html+=escapeHtml(input[i]==='/'?':':input[i]);
 }
 return html;
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
   stage.classList.remove('hidden');stage.innerHTML='<h2>🎭 KIES JULLIE AVATAR</h2><div class="avatargrid">'+teams.map(t=>'<div class="avatarcard">'+avatarFace(t.avatar)+'<b>'+escapeHtml(t.name)+'</b><small>'+(Number.isInteger(t.avatar)?avatars[t.avatar][0]:'Kiest nog...')+'</small></div>').join('')+'</div>';
  }else if(state.phase==='playing'){
   if(teams.length>0&&teams.every(t=>t.finished)){$('eventLabel').textContent='🏁 ALLE TEAMS HEBBEN DE TEMPEL BEREIKT — START DE FINALE!';}
   const d=Object.values(state.duels||{}).find(x=>!x.done);
   if(d){const q=duelQs[d.qIndex];stage.classList.remove('hidden');stage.innerHTML='<h2>⚔ LIVE DUEL</h2><p>'+escapeHtml(q.q)+'</p><div class="duelgrid">'+[d.a,d.b].map(id=>'<div class="duelteam"><h3>'+escapeHtml(state.teams[id]?.name||'Team')+'</h3><div class="tokenline">'+(d.progress?.[id]||[]).map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div></div>').join('')+'</div>';}
  }else if(['final','ended'].includes(state.phase)){
   stage.classList.remove('hidden');stage.innerHTML='<h2>🏆 RACE NAAR DE SCHATKAMER</h2><div class="race-track">'+teams.map(t=>'<div class="race-team"><b>'+escapeHtml(t.name)+'</b><div class="race-cells">'+Array.from({length:16},(_,i)=>'<span class="race-cell '+(i+1===(t.finalPos||0)?'occupied':'')+'" style="--teamcolor:'+t.color+'">'+(i+1===(t.finalPos||0)?'♟':i+1)+'</span>').join('')+'</div><strong>Vak '+t.finalPos+'/16</strong></div>').join('')+'</div>'+(Object.values(state.duels||{}).filter(d=>!d.done).map(d=>'<div class="final-duel"><h3>⚔ LIVE DUEL: '+escapeHtml(state.teams[d.a]?.name||'')+' tegen '+escapeHtml(state.teams[d.b]?.name||'')+'</h3><p>'+escapeHtml(duelQs[d.qIndex].q)+'</p>'+[d.a,d.b].map(id=>'<div><b>'+escapeHtml(state.teams[id]?.name||'')+'</b> · '+(d.progress?.[id]||[]).length+' / '+duelQs[d.qIndex].tokens.length+' onderdelen</div>').join('')+'</div>').join(''))+(state.winner?'<h2>🏆 '+escapeHtml(state.teams[state.winner]?.name||'')+' wint!</h2>':'');
  }
 }
 if(view==='student')renderStudent();
}
function tokenPuzzle(q,action,progress){
 const box=$('options');box.innerHTML=(q.fullRule?'<div class="full-rule">'+escapeHtml(q.fullRule)+'</div>':'')+'<div class="tokenline">'+progress.map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div>';
 const choices=document.createElement('div');choices.className='tokenchoices';
 q.tokens.forEach((word,i)=>{if(progress.includes(i))return;const b=document.createElement('button');b.textContent=word;b.onclick=async()=>{b.disabled=true;try{await sendRequest(action,{answer:i});}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};choices.appendChild(b);});box.appendChild(choices);
}
function renderStudent(){
 const t=state.teams?.[teamId];if(!t){$('myTeam').textContent='Team verwijderd';$('studentStatus').textContent='Dit team is door de leerkracht verwijderd.';$('questTitle').textContent='Aanmelding beëindigd';$('questText').textContent='Ga terug naar het startscherm en meld je opnieuw aan.';$('options').innerHTML='';$('numberBox').classList.add('hidden');return;}
 $('myTeam').textContent=t.name;
 $('myScore').textContent=t.score+' punten';
 $('myPosition').textContent=state.phase==='final'?'Vak '+t.finalPos+'/16':t.finished?'In de schatkamer':'Doorgang '+(t.step+1);
 const d=getActiveDuel(t),p=d?(d.progress?.[t.id]||[]):(t.progress||[]);
 const sig=[state.phase,t.solved,t.wrong,t.duel,t.pendingFrom,t.challengesStarted,t.avatar,t.finalPos,state.winner,p.join(','),Object.values(state.teams||{}).map(v=>[v.avatar,v.pendingFrom,v.duel].join('/')).join(',')].join(':');
 if(currentSignature===sig)return;const previousSignature=currentSignature;currentSignature=sig;
 $('feedback').textContent=t.wrong>0&&previousSignature&&previousSignature!==sig&&state.phase==='playing'?'❌ FOUT ANTWOORD! Probeer opnieuw.':'';$('numberBox').classList.add('hidden');$('options').innerHTML='';
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
  title.textContent='DE LAATSTE RACE';const q=finaleVraag(t);txt.innerHTML='<span class="exercise-label">Werk uit · oefenreeks '+q.set+'</span><span class="math-exercise">'+mathExpressionHtml(q.q)+'</span>';
  $('numberBox').classList.remove('hidden');$('numberInput').type='text';$('numberInput').placeholder='Bijv. 4a^2b^2';$('numberInput').value='';
  $('numberSubmit').onclick=async()=>{const v=$('numberInput').value.trim();if(!v){$('feedback').textContent='Vul een antwoord in.';return;}$('numberSubmit').disabled=true;try{await sendRequest('final',{answer:hash(v),atPosition:t.finalPos});$('feedback').textContent='Antwoord ontvangen. Controle wordt uitgevoerd…';}catch(e){$('feedback').textContent=e.message;}finally{$('numberSubmit').disabled=false;}};
  if((t.challengesStarted||0)<2&&!Object.values(state.teams).some(v=>v.pendingFrom===t.id)){
   const area=document.createElement('div');area.className='challenge-area';area.innerHTML='<h4>⚔ Optioneel: daag een team uit ('+(2-(t.challengesStarted||0))+' over)</h4><p>Win twee vakken. Het andere team mag weigeren.</p>';
   Object.values(state.teams).filter(v=>v.id!==t.id&&!v.duel&&!v.pendingFrom).forEach(v=>{const b=document.createElement('button');b.textContent='⚔ '+v.name+' · vak '+v.finalPos;b.onclick=()=>sendRequest('challenge',{answer:v.route}).catch(e=>$('feedback').textContent=e.message);area.appendChild(b);});$('options').appendChild(area);
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
import('./world3d.js?v=world20261017final2').then(module=>{draw3D=module.draw3D;}).catch(error=>console.warn('3D-weergave niet beschikbaar; 2D-reserveweergave actief.',error));
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

$('exponentBtn').onclick=()=>{const input=$('numberInput');const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;input.value=input.value.slice(0,start)+'^'+input.value.slice(end);input.focus();input.setSelectionRange(start+1,start+1);};

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

$('demoBtn').onclick = createDemo;

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
