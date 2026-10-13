
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

const questions = [
  {
    t: 'De brug van het product',
    q: 'Welke formule is juist?',
    o: [
      '(a · b)ⁿ = aⁿ · bⁿ',
      '(a · b)ⁿ = aⁿ + bⁿ',
      '(a · b)ⁿ = a · bⁿ'
    ],
    a: 0
  },
  {
    t: 'Het geheim van het quotiënt',
    q: 'Welke formule is juist? (b ≠ 0)',
    o: [
      '(a / b)ⁿ = a / bⁿ',
      '(a / b)ⁿ = aⁿ / bⁿ',
      '(a / b)ⁿ = aⁿ / b'
    ],
    a: 1
  },
  {
    t: 'De stenen poort',
    q: '(2 · 3)² = ?',
    o: ['2² · 3²', '2² + 3²', '2 · 3²'],
    a: 0
  },
  {
    t: 'De magische bron',
    q: '(8 / 2)³ = ?',
    o: ['8³ / 2', '8³ / 2³', '8 / 2³'],
    a: 1
  },
  {
    t: 'De vervloekte inscriptie',
    q: 'Welke uitspraak klopt?',
    o: [
      'Je verheft bij een product alleen de eerste factor.',
      'Je verheft bij een product elke factor tot die macht.',
      'Je telt de exponenten van de factoren op.'
    ],
    a: 1
  },
  {
    t: 'De wachters van de breuk',
    q: '(a / b)⁴ = ?',
    o: ['a⁴ / b⁴', 'a⁴ / b', 'a / b⁴'],
    a: 0
  },
  {
    t: 'Het kristallen pad',
    q: '(5 · 2)³ = ?',
    o: ['5³ + 2³', '5³ · 2', '5³ · 2³'],
    a: 2
  },
  {
    t: 'De verborgen sleutel',
    q: '(12 / 3)² = ?',
    o: ['12² / 3²', '12² / 3', '12 / 3²'],
    a: 0
  },
  {
    t: 'De magische spreuk',
    q: 'Welke regel hoort bij (x · y)ⁿ?',
    o: [
      'Macht van een quotiënt',
      'Macht van een product',
      'Macht van een som'
    ],
    a: 1
  },
  {
    t: 'De laatste doorgang',
    q: 'Welke uitwerking is fout?',
    o: [
      '(3 · 4)² = 3² · 4²',
      '(6 / 2)³ = 6³ / 2³',
      '(3 · 4)² = 3² · 4'
    ],
    a: 2
  }
];

const duelQs = [
  { q: 'DUEL! Bereken (2 · 4)²', a: 64 },
  { q: 'DUEL! Bereken (12 / 3)²', a: 16 },
  { q: 'DUEL! Bereken (3 · 2)³', a: 216 },
  { q: 'DUEL! Bereken (18 / 3)²', a: 36 }
];

const finalQs = [
  { q: 'FINALE! Bereken (3 · 4)²', a: 144 },
  { q: 'FINALE! Bereken (24 / 6)³', a: 64 },
  { q: 'FINALE! Bereken (2 · 5)³', a: 1000 },
  { q: 'FINALE! Bereken (18 / 3)³', a: 216 }
];

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
        state = value;
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
  const index = Object.keys(state.teams).length;

  const id = 't' + index + '_' +
    Math.random().toString(36).slice(2, 5);

  state.teams[id] = {
    id,
    name: name.slice(0, 22),
    color: colors[index % 8],
    route: index % 8,
    step: 0,
    score: 0,
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

        } else if (Object.keys(state.teams).length >= 8) {
          response = {
            error: 'Maximum 8 teams.'
          };

        } else {
          const existing = Object.values(state.teams).some(
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

async function startGame() {
  if (!host || state.phase !== 'lobby') return;

  if (Object.keys(state.teams).length < 2) {
    alert('Er zijn minstens 2 teams nodig.');
    return;
  }

  state.phase = 'playing';
  state.started = Date.now();

  flash('De poorten openen! Los de opdrachten op.');

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

async function handleRequest(request) {
  if (!host || !state) return;

  const team = state.teams?.[request.teamId];
  if (!team) return;

  if (
    request.action === 'answer' &&
    state.phase === 'playing' &&
    !getActiveDuel(team) &&
    !team.finished
  ) {
    const question = getQuestion(team);

    if (Number(request.answer) === question.a) {
      team.score += 100;
      team.solved++;

      team.step = Math.min(
        routes[team.route].length - 1,
        team.step + 1
      );

      flash('✦ ' + team.name + ' opent een doorgang!');

      if (team.step === routes[team.route].length - 1) {
        team.finished = true;
        flash('✦ ' + team.name + ' bereikt de schatkamer!');
      } else {
        triggerDuel(team);
      }

    } else {
      team.wrong++;
      team.score = Math.max(0, team.score - 10);
      flash('Een spreuk mislukt bij ' + team.name + '.');
    }

    await writeState();

  } else if (
    request.action === 'duel' &&
    state.phase === 'playing'
  ) {
    const duel = getActiveDuel(team);

    if (!duel || duel.winner) return;

    if (Number(request.answer) === duelQs[duel.qIndex].a) {
      duel.winner = team.id;
      duel.done = true;

      const other = state.teams[
        duel.a === team.id ? duel.b : duel.a
      ];

      team.score += 150;
      team.duel = '';

      if (other) other.duel = '';

      flash(
        '⚔ ' + team.name +
        ' wint het duel! +150 punten'
      );

    } else {
      team.wrong++;
      team.score = Math.max(0, team.score - 10);
    }

    await writeState();

  } else if (
    request.action === 'final' &&
    state.phase === 'final' &&
    !state.winner
  ) {
    if (
      Number(request.answer) ===
      finalQs[state.finalQuestion].a
    ) {
      state.winner = team.id;
      state.phase = 'ended';
      team.score += 300;

      flash(
        '🏆 ' + team.name +
        ' wint DE MACHTENTEMPEL!'
      );

    } else {
      team.wrong++;
    }

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
    winner: ''
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

async function beginFinal() {
  if (!host || !state || state.phase !== 'playing') return;

  state.phase = 'final';

  state.finalQuestion = Math.floor(
    Math.random() * finalQs.length
  );

  Object.values(state.teams).forEach(team => {
    team.duel = '';
  });

  Object.values(state.duels).forEach(duel => {
    duel.done = true;
  });

  flash(
    '⚡ DE FINALE! Iedereen krijgt dezelfde eindopdracht.'
  );

  await writeState();
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

function render() {
  if (!state) return;

  if (view === 'teacher') {
    const teams = Object.values(state.teams || {})
      .sort((a, b) => b.score - a.score);

    $('teamCount').textContent = teams.length + ' / 8';

    $('scoreboard').innerHTML = teams.map(team => `
      <div class="teamrow">
        <span class="teamdot"
          style="background:${team.color};color:${team.color}">
        </span>
        <div>
          <b>${escapeHtml(team.name)}</b>
          <small>${
            team.duel
              ? '⚔ In duel'
              : team.finished
                ? '✦ Schatkamer'
                : team.solved + ' opdrachten opgelost'
          }</small>
        </div>
        <span class="pts">${team.score}</span>
      </div>
    `).join('');

    $('phaseLabel').textContent = ({
      lobby: 'Wachten op teams',
      playing: 'De tempel is geopend',
      final: '⚡ FINALE',
      ended: '🏆 SPEL AFGELOPEN'
    })[state.phase];

    $('eventLabel').textContent = state.event || '';

    $('startBtn').disabled = state.phase !== 'lobby';
    $('finalBtn').disabled = state.phase !== 'playing';

    renderClock();

    if (state.phase === 'final') {
      showOverlay(
        '⚡ DE FINALE ⚡\n' +
        'Wie lost de laatste macht het snelst op?'
      );

    } else if (state.phase === 'ended') {
      const winner = state.teams[state.winner];

      showOverlay(
        '🏆 DE SCHAT IS GEOPEND! 🏆\n' +
        (winner?.name || 'Een team') + ' wint!'
      );

    } else {
      $('overlay').classList.add('hidden');
    }
  }

  if (view === 'student') {
    renderStudent();
  }
}

function renderStudent() {
  const team = state.teams?.[teamId];
  if (!team) return;

  $('myTeam').textContent = team.name;
  $('myScore').textContent = team.score + ' punten';

  $('myPosition').textContent = team.finished
    ? 'In de schatkamer'
    : `Doorgang ${team.step + 1} van ${
        routes[team.route].length
      }`;

  const duel = getActiveDuel(team);

  const signature = [
    state.phase,
    team.solved,
    team.wrong,
    team.duel,
    state.finalQuestion,
    state.winner
  ].join(':');

  if (currentSignature === signature) return;

  currentSignature = signature;

  $('feedback').textContent = '';
  $('numberBox').classList.add('hidden');
  $('options').innerHTML = '';

  const title = $('questTitle');
  const questionText = $('questText');
  const status = $('studentStatus');

  if (state.phase === 'lobby') {
    status.textContent = 'Wachten op de leerkracht';
    title.textContent = 'Je avonturier is klaar';
    questionText.textContent =
      'Zodra het spel start, verschijnen hier opdrachten.';
    return;
  }

  if (state.phase === 'ended') {
    const winner = state.teams[state.winner];

    status.textContent = 'Spel afgelopen';

    title.textContent =
      winner?.id === team.id
        ? '🏆 JULLIE WINNEN!'
        : 'De schat is geopend';

    questionText.textContent =
      'Winnaar: ' +
      (winner?.name || 'Onbekend') +
      '. Jullie score: ' +
      team.score +
      ' punten.';

    return;
  }

  if (state.phase === 'final') {
    status.textContent =
      '⚡ Finale · antwoord zo snel mogelijk';

    title.textContent = 'DE LAATSTE SPREUK';
    questionText.textContent =
      finalQs[state.finalQuestion].q;

    showNumber('final');
    return;
  }

  if (duel) {
    const other = state.teams[
      duel.a === team.id ? duel.b : duel.a
    ];

    status.textContent =
      '⚔ Duel tegen ' +
      (other?.name || 'een team');

    title.textContent = '⚔ MAGISCH DUEL';
    questionText.textContent = duelQs[duel.qIndex].q;

    showNumber('duel');
    return;
  }

  if (team.finished) {
    status.textContent = 'Je hebt de schatkamer bereikt';
    title.textContent = '✦ De gouden poort';

    questionText.textContent =
      'Wacht op de gezamenlijke finale. ' +
      'Je verzamelde ' +
      team.score +
      ' punten.';

    return;
  }

  status.textContent =
    'Verken de tempel · +100 punten per juiste spreuk';

  const question = getQuestion(team);

  title.textContent = question.t;
  questionText.textContent = question.q;

  question.o.forEach((option, index) => {
    const button = document.createElement('button');
    button.textContent = option;

    button.onclick = async () => {
      const buttons = document.querySelectorAll(
        '#options button'
      );

      buttons.forEach(b => {
        b.disabled = true;
      });

      $('feedback').textContent =
        'Spreuk wordt gecontroleerd...';

      try {
        await sendRequest('answer', {
          answer: index
        });

      } catch (error) {
        $('feedback').textContent = error.message;

        buttons.forEach(b => {
          b.disabled = false;
        });
      }
    };

    $('options').appendChild(button);
  });
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
    Object.keys(state.teams).length >= 8
  ) return;

  addTeam(
    'Testteam ' +
    (Object.keys(state.teams).length + 1)
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
