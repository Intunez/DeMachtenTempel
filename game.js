
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

const routes = [
  ['entry', 'a', 'b', 'c', 'd', 'j', 'vault'],
  ['entry', 'a', 'i', 'h', 'g', 'f', 'k', 'vault'],
  ['entry', 'a', 'b', 'j', 'e', 'k', 'vault'],
  ['entry', 'a', 'i', 'j', 'c', 'd', 'vault'],
  ['entry', 'a', 'b', 'c', 'j', 'k', 'vault'],
  ['entry', 'a', 'i', 'h', 'k', 'f', 'vault'],
  ['entry', 'a', 'b', 'j', 'e', 'f', 'vault'],
  ['entry', 'a', 'i', 'j', 'd', 'e', 'vault']
];

const avatars=[["Xander","×"],["Rex","√"],["Nox","−"],["Vex","ⁿ"],["Axel","x"],["Nova","∞"],["Zero","0"],["Delta","Δ"]];
const questions=[{"t":"De productspreuk","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["Om een product","verheffen we","tot die macht.","tot een macht te verheffen,","elke factor"],"answer":[0,3,1,4,2]},{"t":"De quotiëntspreuk","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["het deeltal en de deler","Om een quotiënt","verheffen we","tot die macht.","tot een macht te verheffen,"],"answer":[1,4,2,0,3]},{"t":"Het productzegel","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["bⁿ","=","·","(a · b)ⁿ","aⁿ"],"answer":[3,1,4,2,0]},{"t":"Het quotiëntzegel","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=","/","(a / b)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De factorpoort","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["afzonderlijk","Bij de macht van een product","elke factor","tot die macht.","verheffen we"],"answer":[1,4,2,0,3]},{"t":"De breukpoort","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["verheffen we","afzonderlijk","Bij de macht van een quotiënt","het deeltal en de deler","tot die macht."],"answer":[2,0,3,1,4]},{"t":"De x-y-inscriptie","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["yⁿ","=","·","(x · y)ⁿ","xⁿ"],"answer":[3,1,4,2,0]},{"t":"De x-y-breuk","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["xⁿ","yⁿ","=","/","(x / y)ⁿ"],"answer":[4,2,0,3,1]},{"t":"De koppeling","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["Macht van een product","(a · b)ⁿ = aⁿ · bⁿ","→"],"answer":[0,2,1]},{"t":"De tweede koppeling","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["→","Macht van een quotiënt","(a / b)ⁿ = aⁿ / bⁿ"],"answer":[1,0,2]},{"t":"De drie factoren","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["aⁿ","bⁿ","=","cⁿ","·","(a · b · c)ⁿ","·"],"answer":[5,2,0,4,1,6,3]},{"t":"De laatste inscriptie","q":"Zet de woorden of symbolen in de juiste volgorde.","tokens":["(p / q)ᵐ","pᵐ","qᵐ","=","/"],"answer":[0,3,1,4,2]}];
const duelQs=questions.slice(0,8);
const finalQs=[{"q":"(2a)^2","a":"4a^2","set":16},{"q":"(4c)^3","a":"64c^3","set":16},{"q":"(-ab)^2","a":"a^2b^2","set":16},{"q":"(-3c)^2","a":"9c^2","set":16},{"q":"(-2c)^3","a":"-8c^3","set":16},{"q":"(-2ab)^2","a":"4a^2b^2","set":16},{"q":"(2ac)^3","a":"8a^3c^3","set":16},{"q":"(2a^2b)^2","a":"4a^4b^2","set":17},{"q":"(4ac^4)^2","a":"16a^2c^8","set":17},{"q":"(10xy^2z^3)^2","a":"100x^2y^4z^6","set":17},{"q":"(2ab^2)^4","a":"16a^4b^8","set":17},{"q":"(x·y)^k","a":"x^ky^k","set":18},{"q":"(r^2·s)^m","a":"r^(2m)s^m","set":18},{"q":"(2/3)^2","a":"4/9","set":19},{"q":"(-1/2)^3","a":"-1/8","set":19},{"q":"(4/5)^2","a":"16/25","set":19},{"q":"(-1/10)^3","a":"-1/1000","set":19},{"q":"(3/5)^(-2)","a":"25/9","set":19},{"q":"(a/b)^2","a":"a^2/b^2","set":20},{"q":"(-x/2)^3","a":"-x^3/8","set":20},{"q":"(3/x)^2","a":"9/x^2","set":20},{"q":"(x/y)^2","a":"x^2/y^2","set":20},{"q":"(a/b)^m","a":"a^m/b^m","set":21},{"q":"(x/y)^(-m)","a":"y^m/x^m","set":21}];
function avatarFace(n){if(!Number.isInteger(n))return '◈';return '<span class="mathavatar" style="--av:'+colors[n]+'"><span class="hair">▰</span><span class="eyes">• •</span><span class="mouth">⌣</span><span class="mathsymbol">'+avatars[n][1]+'</span></span>';}
function norm(v){return String(v).toLowerCase().replace(/\s/g,'').replace(/[·×*]/g,'').replace(/−/g,'-').replace(/[{}]/g,'').replace(/\^\(([^()]+)\)/g,'^$1');}
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
  ].forEach(addTeam);

  openTeacher();

  $('demoControls').classList.remove('hidden');
  $('connection').textContent = '● Demonstratiemodus';
}

function addTeam(name) {
  const index = Object.keys(state.teams || {}).length;

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
  t.avatar=n;flash(t.name+' kiest '+avatars[n][0]);await writeState();return;
 }
 if(r.action==='answer'&&state.phase==='playing'&&!getActiveDuel(t)&&!t.finished){
  const q=getQuestion(t),p=t.progress||[];
  if(!Number.isInteger(n)||n<0||n>=q.tokens.length||p.includes(n))return;
  p.push(n);t.progress=p;
  if(p.length===q.answer.length){
   if(p.every((v,i)=>v===q.answer[i])){
    t.score+=100;t.solved++;t.step=Math.min(routes[t.route].length-1,t.step+1);
    flash(t.name+' opent een doorgang!');
    if(t.step===routes[t.route].length-1)t.finished=true;else triggerDuel(t);
   }else{t.wrong++;t.score=Math.max(0,t.score-10);flash('Spreuk mislukt bij '+t.name);}
   t.progress=[];
  }await writeState();return;
 }
 if(r.action==='duel'&&state.phase==='playing'){
  const d=getActiveDuel(t);if(!d||d.winner)return;
  const q=duelQs[d.qIndex],p=d.progress?.[t.id]||[];
  if(!Number.isInteger(n)||n<0||n>=q.tokens.length||p.includes(n))return;
  p.push(n);d.progress[t.id]=p;
  if(p.length===q.answer.length){
   if(p.every((v,i)=>v===q.answer[i])){
    d.winner=t.id;d.done=true;t.score+=150;t.duel='';
    const other=state.teams[d.a===t.id?d.b:d.a];if(other)other.duel='';
    flash('⚔ '+t.name+' wint het duel! +150 punten');
   }else{t.wrong++;t.score=Math.max(0,t.score-10);d.progress[t.id]=[];}
  }await writeState();return;
 }
 if(r.action==='final'&&state.phase==='final'&&!state.winner){
  if(n===hash(finaleVraag(t).a)){
   t.finalPos=(t.finalPos||0)+1;
   if(t.finalPos>=16){state.winner=t.id;state.phase='ended';t.score+=300;flash('🏆 '+t.name+' wint!');}
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
 state.phase='final';state.finalQuestion=0;
 Object.values(state.teams||{}).sort((a,b)=>b.score-a.score||a.joined-b.joined).forEach((t,i)=>{t.duel='';t.finalPos=Math.max(1,8-i);});
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
        : 0;

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

function showOverlay(message) {
  $('overlay').textContent = message;
  $('overlay').classList.remove('hidden');
}

function render(){
 if(!state)return;
 if(view==='teacher'){
  const teams=Object.values(state.teams||{}).sort((a,b)=>b.score-a.score);
  $('teamCount').textContent=teams.length+' / 8';
  $('scoreboard').innerHTML=teams.map(t=>'<div class="teamrow">'+avatarFace(t.avatar)+'<div><b>'+escapeHtml(t.name)+'</b><small>'+(state.phase==='final'?'Vak '+t.finalPos+'/16':t.duel?'⚔ Duel':t.solved+' opdrachten opgelost')+'</small></div><span class="pts">'+t.score+'</span></div>').join('');
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
   const d=Object.values(state.duels||{}).find(x=>!x.done);
   if(d){const q=duelQs[d.qIndex];stage.classList.remove('hidden');stage.innerHTML='<h2>⚔ LIVE DUEL</h2><p>'+escapeHtml(q.q)+'</p><div class="duelgrid">'+[d.a,d.b].map(id=>'<div class="duelteam"><h3>'+escapeHtml(state.teams[id]?.name||'Team')+'</h3><div class="tokenline">'+(d.progress?.[id]||[]).map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div></div>').join('')+'</div>';}
  }else if(['final','ended'].includes(state.phase)){
   stage.classList.remove('hidden');stage.innerHTML='<h2>🏆 RACE NAAR DE SCHATKAMER</h2>'+teams.map(t=>'<div class="raceline"><b>'+escapeHtml(t.name)+'</b><div class="racebar"><div style="width:'+((t.finalPos||0)/16*100)+'%;background:'+t.color+'"></div></div><span>'+t.finalPos+'/16</span></div>').join('')+(state.winner?'<h2>🏆 '+escapeHtml(state.teams[state.winner]?.name||'')+' wint!</h2>':'');
  }
 }
 if(view==='student')renderStudent();
}
function tokenPuzzle(q,action,progress){
 const box=$('options');box.innerHTML='<div class="tokenline">'+progress.map(i=>'<span class="placed">'+escapeHtml(q.tokens[i])+'</span>').join('')+'</div>';
 const choices=document.createElement('div');choices.className='tokenchoices';
 q.tokens.forEach((word,i)=>{if(progress.includes(i))return;const b=document.createElement('button');b.textContent=word;b.onclick=async()=>{b.disabled=true;try{await sendRequest(action,{answer:i});}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};choices.appendChild(b);});box.appendChild(choices);
}
function renderStudent(){
 const t=state.teams?.[teamId];if(!t)return;
 $('myTeam').textContent=t.name+(Number.isInteger(t.avatar)?' · '+avatars[t.avatar][0]:'');
 $('myScore').textContent=t.score+' punten';
 $('myPosition').textContent=state.phase==='final'?'Vak '+t.finalPos+'/16':t.finished?'In de schatkamer':'Doorgang '+(t.step+1);
 const d=getActiveDuel(t),p=d?(d.progress?.[t.id]||[]):(t.progress||[]);
 const sig=[state.phase,t.solved,t.wrong,t.duel,t.avatar,t.finalPos,state.winner,p.join(','),Object.values(state.teams||{}).map(v=>v.avatar).join(',')].join(':');
 if(currentSignature===sig)return;currentSignature=sig;
 $('feedback').textContent='';$('numberBox').classList.add('hidden');$('options').innerHTML='';
 const title=$('questTitle'),txt=$('questText'),status=$('studentStatus');
 if(state.phase==='lobby'){status.textContent='Wachten op de leerkracht';title.textContent='Je team is aangemeld';txt.textContent='De avatarselectie start zodra alle teams er zijn.';return;}
 if(state.phase==='avatars'){
  status.textContent='Alle teams kiezen tegelijk';title.textContent=Number.isInteger(t.avatar)?'Jullie zijn '+avatars[t.avatar][0]:'Kies je avatar';txt.textContent='Wie het eerst kiest, krijgt de avatar.';
  if(!Number.isInteger(t.avatar)){
   const taken=new Set(Object.values(state.teams||{}).map(v=>v.avatar));
   const grid=document.createElement('div');grid.className='avatargrid';
   avatars.forEach((a,i)=>{const b=document.createElement('button');b.className='avatarcard';b.disabled=taken.has(i);b.innerHTML=avatarFace(i)+'<b>'+a[0]+'</b>';b.onclick=async()=>{b.disabled=true;try{await sendRequest('answer',{answer:i});}catch(e){$('feedback').textContent=e.message;b.disabled=false;}};grid.appendChild(b);});$('options').appendChild(grid);
  }return;
 }
 if(state.phase==='ended'){const w=state.teams[state.winner];status.textContent='Spel afgelopen';title.textContent=w?.id===t.id?'🏆 JULLIE WINNEN!':'De schat is geopend';txt.textContent='Winnaar: '+(w?.name||'Onbekend');return;}
 if(state.phase==='final'){
  status.textContent='⚡ Finale · vak '+t.finalPos+'/16';title.textContent='DE LAATSTE RACE';const q=finaleVraag(t);txt.textContent='Werk uit (oefenreeks '+q.set+'): '+q.q;
  $('numberBox').classList.remove('hidden');$('numberInput').type='text';$('numberInput').placeholder='Bijv. 4a^2b^2';$('numberInput').value='';
  $('numberSubmit').onclick=async()=>{const v=$('numberInput').value.trim();if(!v){$('feedback').textContent='Vul een antwoord in.';return;}$('numberSubmit').disabled=true;try{await sendRequest('final',{answer:hash(v)});$('feedback').textContent='Antwoord ingestuurd!';}catch(e){$('feedback').textContent=e.message;}finally{$('numberSubmit').disabled=false;}};return;
 }
 if(d){status.textContent='⚔ Duel';title.textContent='DUEL tegen '+(state.teams[d.a===t.id?d.b:d.a]?.name||'');const q=duelQs[d.qIndex];txt.textContent=q.q;tokenPuzzle(q,'duel',p);return;}
 if(t.finished){status.textContent='In de schatkamer';title.textContent='Wacht op de finale';txt.textContent='Jullie hebben '+t.score+' punten verzameld.';return;}
 status.textContent='+100 punten per juiste spreuk';const q=getQuestion(t);title.textContent=q.t;txt.textContent=q.q;tokenPuzzle(q,'answer',p);
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

function drawWorld(canvas, time) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const pos = (x, y) => [x * w, y * h];

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#182d30');
  gradient.addColorStop(.5, '#172428');
  gradient.addColorStop(1, '#081218');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const rand = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

  // Rotsachtige ondergrond
  for (let i = 0; i < 105; i++) {
    const x = rand(i, 7) * w;
    const y = rand(i, 3) * h;
    const radius = 18 + rand(i, 11) * 70;

    ctx.beginPath();
    ctx.ellipse(
      x, y, radius, radius * .43,
      rand(i, 13) * Math.PI, 0, Math.PI * 2
    );

    ctx.fillStyle = `rgba(${
      18 + Math.floor(rand(i, 17) * 20)
    },${
      31 + Math.floor(rand(i, 19) * 21)
    },${
      30 + Math.floor(rand(i, 23) * 16)
    },.46)`;

    ctx.fill();
    ctx.strokeStyle = '#8b927020';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Rivier
  ctx.save();
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#1d8595';

  ctx.beginPath();
  ctx.moveTo(w * .02, h * .08);

  ctx.bezierCurveTo(
    w * .28, h * .2,
    w * .08, h * .44,
    w * .19, h * .6
  );

  ctx.bezierCurveTo(
    w * .25, h * .77,
    w * .35, h * .77,
    w * .37, h * .97
  );

  ctx.strokeStyle = '#214d57';
  ctx.lineWidth = w * .052;
  ctx.stroke();

  ctx.strokeStyle = '#4a9aa14a';
  ctx.lineWidth = w * .025;
  ctx.stroke();

  ctx.restore();

  // Paden
  const drawn = new Set();

  for (const route of routes) {
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];

      const key = [a, b].sort().join('-');
      if (drawn.has(key)) continue;
      drawn.add(key);

      const p = pos(...POINTS[a]);
      const q = pos(...POINTS[b]);

      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(...p);
      ctx.lineTo(...q);

      ctx.strokeStyle = '#080c0e';
      ctx.lineWidth = w * .038;
      ctx.stroke();

      ctx.strokeStyle = '#6e6550';
      ctx.lineWidth = w * .028;
      ctx.stroke();

      ctx.strokeStyle = '#958366';
      ctx.lineWidth = w * .021;
      ctx.stroke();

      ctx.strokeStyle = '#a99a7655';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Oude muren
  for (let i = 0; i < 55; i++) {
    const x = rand(i, 101) * w;
    const y = rand(i, 103) * h;
    const dx = rand(i, 105) * 24 + 10;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand(i, 107) * 6);

    ctx.fillStyle = '#4e5b51';
    ctx.fillRect(-dx / 2, -6, dx, 11);

    ctx.fillStyle = '#83908255';
    ctx.fillRect(-dx / 2, -8, dx, 3);

    ctx.restore();
  }

  // Kamers
  for (const [id, p] of Object.entries(POINTS)) {
    if (id === 'entry' || id === 'vault') continue;

    const [x, y] = pos(...p);

    ctx.beginPath();
    ctx.ellipse(
      x, y, w * .025, h * .027,
      0, 0, Math.PI * 2
    );

    ctx.fillStyle = '#131b1c';
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = '#74715a';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c9ae6c88';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#edc178';
    ctx.fill();
  }

  // Schatkamer
  const [vx, vy] = pos(...POINTS.vault);

  ctx.save();
  ctx.shadowColor = '#ffce6b';
  ctx.shadowBlur = 32 + 12 * Math.sin(time * .002);

  const glow = ctx.createRadialGradient(
    vx, vy, 4, vx, vy, w * .17
  );

  glow.addColorStop(0, '#f8d18e77');
  glow.addColorStop(.35, '#d89e4e33');
  glow.addColorStop(1, '#d89e4e00');

  ctx.fillStyle = glow;
  ctx.fillRect(
    vx - w * .18,
    vy - w * .18,
    w * .36,
    w * .36
  );

  ctx.restore();

  ctx.fillStyle = '#151d20';
  ctx.beginPath();
  ctx.ellipse(
    vx, vy + 17, w * .085, h * .10,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  ctx.strokeStyle = '#c1a66e';
  ctx.lineWidth = 8;
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = vx + Math.cos(angle) * w * .07;
    const y = vy + Math.sin(angle) * h * .086;

    ctx.fillStyle = '#899082';
    ctx.fillRect(x - 8, y - 15, 16, 29);

    ctx.fillStyle = '#d7bc7b';
    ctx.fillRect(x - 10, y - 17, 20, 5);
  }

  ctx.font = `bold ${Math.floor(w * .022)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4d494';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 7;
  ctx.fillText('SCHATKAMER', vx, vy - 50);
  ctx.shadowBlur = 0;

  // Fakkels
  for (const [id, p] of Object.entries(POINTS)) {
    if (id === 'vault') continue;

    const [x, y] = pos(...p);
    const flicker = 2 + Math.sin(time * .009 + x) * 2;

    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ff9d38';
    ctx.fillStyle = '#e89a45';

    ctx.beginPath();
    ctx.ellipse(
      x + 17, y - 19,
      3 + flicker, 7 + flicker,
      0, 0, Math.PI * 2
    );

    ctx.fill();
    ctx.restore();
  }

  // Avonturiers
  const teams = state
    ? Object.values(state.teams || {})
    : colors.slice(0, 6).map((color, i) => ({
        id: 'preview' + i,
        name: 'Team ' + (i + 1),
        color,
        route: i,
        step: 1 + i % 3
      }));

  teams.forEach((team, i) => {
    const route = routes[team.route];

    const node =
      state?.phase === 'final' ||
      state?.phase === 'ended'
        ? 'vault'
        : route[Math.min(team.step, route.length - 1)];

    const [x0, y0] = pos(...POINTS[node]);

    const siblings = teams.filter(other => {
      if (
        state?.phase === 'final' ||
        state?.phase === 'ended'
      ) return true;

      const otherRoute = routes[other.route];

      return otherRoute[
        Math.min(other.step, otherRoute.length - 1)
      ] === node;
    });

    const rank = siblings.findIndex(
      other => other.id === team.id
    );

    const angle = rank * 2.39996;
    const x = x0 + Math.cos(angle) * Math.sqrt(rank) * 17;
    const y = y0 + Math.sin(angle) * Math.sqrt(rank) * 13;
    const bob = Math.sin(time * .003 + i) * 2;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = team.color;

    ctx.beginPath();
    ctx.ellipse(x, y + 13, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000a';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#151d22';

    ctx.beginPath();
    ctx.moveTo(x - 8, y + 7);
    ctx.lineTo(x - 12, y - 12 + bob);
    ctx.lineTo(x, y - 23 + bob);
    ctx.lineTo(x + 12, y - 12 + bob);
    ctx.lineTo(x + 8, y + 7);
    ctx.fill();

    ctx.strokeStyle = team.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - 14 + bob, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#c4ad8a';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - 11, y - 20 + bob);
    ctx.lineTo(x, y - 35 + bob);
    ctx.lineTo(x + 11, y - 20 + bob);
    ctx.fillStyle = team.color;
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font =
      `bold ${Math.max(10, Math.floor(w * .011))}px Arial`;

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#051015';
    ctx.strokeText(team.name, x, y - 41 + bob);

    ctx.fillStyle = '#fff7e8';
    ctx.fillText(team.name, x, y - 41 + bob);

    ctx.restore();
  });

  // Donkere randen
  const vignette = ctx.createRadialGradient(
    w * .5, h * .5, w * .18,
    w * .5, h * .5, w * .78
  );

  vignette.addColorStop(0, '#0000');
  vignette.addColorStop(1, '#000a');

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Zwevende lichtdeeltjes
  for (let i = 0; i < 24; i++) {
    const x = (
      rand(i, 41) * w +
      time * (.006 + rand(i, 43) * .007)
    ) % w;

    const y =
      rand(i, 47) * h +
      Math.sin(time * .001 + i) * 6;

    ctx.beginPath();
    ctx.arc(x, y, 1 + rand(i, 49) * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#e4d5a655';
    ctx.fill();
  }
}

function animate(time) {
  if (view === 'teacher') {
    drawWorld($('worldCanvas'), time);
  } else if (view === 'welcome') {
    drawWorld($('previewCanvas'), time);
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

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

  await handleRequest({
    action: 'answer',
    teamId: team.id,
    answer: getQuestion(team).a
  });
};

if (configured) {
  $('connection').textContent = '● Online beschikbaar';
}
