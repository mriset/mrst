// ============================================================
// KELAS PEMBOHONG — Web App
// Firebase Realtime Database + Full Game Logic
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, off, push, remove, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { CARDS } from './cards.js';

// ===== FIREBASE INIT =====
const firebaseConfig = {
  apiKey: "AIzaSyAckkyGvNWjDvVRUa7HDrZAjBTbuau6w2Q",
  authDomain: "kelaspembo.firebaseapp.com",
  databaseURL: "https://kelaspembo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kelaspembo",
  storageBucket: "kelaspembo.firebasestorage.app",
  messagingSenderId: "444606262143",
  appId: "1:444606262143:web:94f8b5143da9895a4ec84a"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== STATE =====
let state = {
  roomCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  roomRef: null,
  listeners: [],
  roundCount: 10,
  selectedEdition: 'base',
  winMode: 'standard',
  gamePhase: null,
  currentQuestion: null,
  myLie: null,
  myVote: null,
  writeTimer: null,
  voteTimer: null,
  currentRound: 0,
  totalRounds: 10,
  usedCardIds: [],
  screenHistory: ['screen-splash'],
};

// ===== EDITIONS DATA =====
const EDITIONS = {
  base: {
    name: 'Fakta Gila Dunia',
    icon: '🌍',
    desc: '100 Kartu · 5 Kategori',
    difficulty: '⭐',
  },
  popkultur: { name: 'Pop Kultur', icon: '🍿', desc: 'Film, Musik & TV', difficulty: '⭐⭐' },
  olahraga: { name: 'Olahraga Gila', icon: '🏅', desc: 'Fakta Tersembunyi Sport', difficulty: '⭐⭐' },
  makanan: { name: 'Makanan Gila', icon: '🍔', desc: 'Fakta Kuliner Mengejutkan', difficulty: '⭐' },
  sains: { name: 'Sains Pusing', icon: '🔬', desc: 'Fakta Ilmiah Tergelap', difficulty: '⭐⭐⭐' },
  indonesia: { name: 'Indonesia Gila', icon: '🏙️', desc: 'Fakta Nusantara Tersembunyi', difficulty: '⭐⭐' },
  bisnis: { name: 'Uang & Bisnis', icon: '💰', desc: 'Fakta Ekonomi Mengejutkan', difficulty: '⭐⭐' },
  luar_angkasa: { name: 'Luar Angkasa', icon: '🌌', desc: 'Fakta Kosmik Mengguncang', difficulty: '⭐⭐⭐' },
  gelap: { name: 'Gelap Gulita', icon: '😨', desc: 'Psikologi Kelam · 17+', difficulty: '⭐⭐⭐' },
};

// ===== CARDS DATABASE =====
// Moved to cards.js

// ===== AVATAR COLORS =====
const AVATAR_COLORS = ['#f5c842','#ff6b35','#a855f7','#22c55e','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4','#84cc16','#ef4444','#f59e0b','#10b981','#6366f1','#e11d48'];

// ===== HELPERS =====
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function generatePlayerId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getRandomCard(edition, usedIds) {
  const cards = CARDS[edition] || CARDS.base;
  const available = cards.filter(c => !usedIds.includes(c.id));
  if (available.length === 0) return cards[Math.floor(Math.random() * cards.length)];
  return available[Math.floor(Math.random() * available.length)];
}
function labelFromIndex(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}
function showToast(msg, type='info', dur=2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), dur);
}
function showLoading(text='Memuat...') {
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loading-text').textContent = text;
}
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ===== SCREEN NAVIGATION =====
window.showScreen = function(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next || current === next) return;
  if (current) { current.classList.remove('active'); }
  next.classList.add('active', 'slide-in');
  setTimeout(() => next.classList.remove('slide-in'), 300);
  state.screenHistory.push(id);
};

// ===== INIT EDITIONS LIST =====
function initEditionList() {
  const el = document.getElementById('edition-list');
  el.innerHTML = Object.entries(EDITIONS).map(([key, ed]) => `
    <div class="edition-item ${key === state.selectedEdition ? 'selected' : ''}" onclick="selectEdition('${key}')">
      <div class="edition-icon">${ed.icon}</div>
      <div class="edition-info">
        <div class="edition-name">${ed.name}</div>
        <div class="edition-meta">${ed.desc} · Kesulitan: ${ed.difficulty}</div>
      </div>
      <div class="edition-check">✓</div>
    </div>
  `).join('');
}

window.selectEdition = function(key) {
  state.selectedEdition = key;
  document.querySelectorAll('.edition-item').forEach(el => {
    el.classList.toggle('selected', el.onclick.toString().includes(`'${key}'`));
  });
};

window.adjustRounds = function(delta) {
  state.roundCount = Math.max(5, Math.min(30, state.roundCount + delta));
  document.getElementById('round-count').textContent = state.roundCount;
};

window.selectWinMode = function(btn, mode) {
  state.winMode = mode;
  document.querySelectorAll('.win-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

// ===== CREATE ROOM =====
window.checkPinAndGoToCreate = function() {
  const pin = prompt('Masukkan PIN untuk membuat ruangan:');
  if (pin === '183729') {
    showScreen('screen-create');
  } else {
    showToast('PIN salah!', 'error');
  }
};

window.createRoom = async function() {
  const name = document.getElementById('host-name').value.trim();
  if (!name) { showToast('Masukkan nama panggilanmu!', 'error'); return; }

  showLoading('Membuat ruangan...');
  const code = generateRoomCode();
  const pid = generatePlayerId();
  state.playerId = pid;
  state.playerName = name;
  state.isHost = true;
  state.roomCode = code;
  saveSession();

  const roomData = {
    code,
    hostId: pid,
    edition: state.selectedEdition,
    totalRounds: state.roundCount,
    winMode: state.winMode,
    phase: 'lobby',
    currentRound: 0,
    usedCardIds: [],
    createdAt: serverTimestamp(),
    players: {
      [pid]: {
        name, isHost: true, score: 0, color: AVATAR_COLORS[0], joinedAt: Date.now()
      }
    }
  };

  try {
    await set(ref(db, `rooms/${code}`), roomData);
    hideLoading();
    enterLobby(code, pid);
  } catch(e) {
    hideLoading();
    showToast('Gagal membuat ruangan. Cek koneksi internet.', 'error');
    console.error(e);
  }
};

// ===== JOIN ROOM =====
window.joinRoom = async function() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const name = document.getElementById('join-name').value.trim();
  if (!code || code.length < 4) { showToast('Masukkan kode ruangan!', 'error'); return; }
  if (!name) { showToast('Masukkan nama panggilanmu!', 'error'); return; }

  showLoading('Bergabung...');
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) {
      hideLoading();
      showToast('Ruangan tidak ditemukan!', 'error');
      return;
    }
    const room = snap.val();
    if (room.phase !== 'lobby') {
      hideLoading();
      showToast('Game sudah dimulai! Tidak bisa bergabung.', 'error');
      return;
    }
    const playerCount = Object.keys(room.players || {}).length;
    if (playerCount >= 16) {
      hideLoading();
      showToast('Ruangan penuh (max 16 pemain)!', 'error');
      return;
    }

    const pid = generatePlayerId();
    state.playerId = pid;
    state.playerName = name;
    state.isHost = false;
    state.roomCode = code;
    saveSession();

    await set(ref(db, `rooms/${code}/players/${pid}`), {
      name, isHost: false, score: 0,
      color: AVATAR_COLORS[playerCount % AVATAR_COLORS.length],
      joinedAt: Date.now()
    });

    hideLoading();
    enterLobby(code, pid);
  } catch(e) {
    hideLoading();
    showToast('Gagal bergabung. Coba lagi.', 'error');
    console.error(e);
  }
};

// ===== LOBBY =====
function enterLobby(code, pid) {
  showScreen('screen-lobby');
  document.getElementById('lobby-room-code').textContent = code;
  state.roomRef = ref(db, `rooms/${code}`);

  const listener = onValue(state.roomRef, (snap) => {
    if (!snap.exists()) { 
      if (!state.isHost) showToast('Ruangan telah ditutup oleh host.', 'error', 4000);
      leaveRoom(true); 
      return; 
    }
    const room = snap.val();
    updateLobbyUI(room);
    if (room.phase !== 'lobby') {
      handlePhaseChange(room);
    } else if (state.gamePhase && state.gamePhase !== 'lobby') {
      state.gamePhase = 'lobby';
      showScreen('screen-lobby');
      clearTimers();
    }
  });
  state.listeners.push({ ref: state.roomRef, listener });
}

function updateLobbyUI(room) {
  const edition = EDITIONS[room.edition] || EDITIONS.base;
  document.getElementById('lobby-edition').textContent = `${edition.icon} ${edition.name}`;
  document.getElementById('lobby-rounds').textContent = `${room.totalRounds} Ronde`;
  const winModes = { standard:'Poin Tertinggi', race:'Balapan ke 15 Poin', elimination:'Eliminasi' };
  document.getElementById('lobby-winmode').textContent = winModes[room.winMode] || 'Standar';

  const players = Object.entries(room.players || {});
  document.getElementById('player-count').textContent = players.length;
  const list = document.getElementById('players-list');
  list.innerHTML = players.sort((a,b) => a[1].joinedAt - b[1].joinedAt).map(([id, p]) => `
    <div class="player-item">
      <div class="player-avatar" style="background:${p.color}20; color:${p.color}; border: 1.5px solid ${p.color}40">
        ${p.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div class="player-name">${p.name}</div>
        ${id === state.playerId ? '<div class="sb-you">Kamu</div>' : ''}
      </div>
      ${p.isHost ? '<span class="player-badge badge-host">HOST</span>' : '<span class="player-badge badge-ready">Siap</span>'}
    </div>
  `).join('');

  if (state.isHost) {
    document.getElementById('host-actions').style.display = 'block';
    document.getElementById('waiting-msg').style.display = 'none';
    const startBtn = document.getElementById('start-btn');
    const hint = document.getElementById('start-hint');
    const enough = players.length >= 3;
    startBtn.disabled = !enough;
    hint.textContent = enough ? `${players.length} pemain siap — Mulai game!` : `Butuh minimal 3 pemain (${players.length}/3)`;
  } else {
    document.getElementById('host-actions').style.display = 'none';
    document.getElementById('waiting-msg').style.display = 'flex';
  }
}

window.copyRoomCode = function() {
  navigator.clipboard.writeText(state.roomCode).then(() => showToast('Kode disalin!', 'success'));
};

window.exitGameMiddle = function() {
  if (state.isHost) {
    if (confirm('Akhiri permainan ini dan kembali ke lobby?')) {
      update(ref(db, `rooms/${state.roomCode}`), { phase: 'lobby' });
    }
  } else {
    if (confirm('Keluar dari ruangan ini?')) {
      leaveRoom();
    }
  }
};

window.leaveRoom = function(force = false) {
  if (state.isHost && !force) {
    if (!confirm('Apakah kamu yakin ingin menutup ruangan? Semua pemain akan dikeluarkan.')) return;
  }

  // Remove listeners
  state.listeners.forEach(l => off(l.ref, 'value', l.listener));
  state.listeners = [];
  clearTimers();

  if (state.roomCode && state.isHost) {
    remove(ref(db, `rooms/${state.roomCode}`)).catch(() => {});
  } else if (state.roomCode && state.playerId) {
    remove(ref(db, `rooms/${state.roomCode}/players/${state.playerId}`)).catch(() => {});
  }
  state.roomCode = null;
  state.playerId = null;
  state.playerName = null;
  state.isHost = false;
  state.roomRef = null;
  sessionStorage.removeItem('kp_session');
  showScreen('screen-home');
};

// ===== START GAME =====
window.startGame = async function() {
  showLoading('Memulai game...');
  const snap = await get(ref(db, `rooms/${state.roomCode}`));
  const room = snap.val();
  const card = getRandomCard(room.edition, []);

  await update(ref(db, `rooms/${state.roomCode}`), {
    phase: 'question',
    currentRound: 1,
    usedCardIds: [card.id],
    currentCard: card,
    answers: null,
    votes: null,
  });
  hideLoading();
};

// ===== PHASE HANDLER =====
function handlePhaseChange(room) {
  const phase = room.phase;
  state.gamePhase = phase;
  state.currentRound = room.currentRound;
  state.totalRounds = room.totalRounds;

  clearTimers();

  if (phase === 'question') showQuestionScreen(room);
  else if (phase === 'writing') showWritingScreen(room);
  else if (phase === 'voting') showVotingScreen(room);
  else if (phase === 'reveal') showRevealScreen(room);
  else if (phase === 'scoreboard') showScoreboardScreen(room);
  else if (phase === 'ended') showWinnerScreen(room);
}

// ===== QUESTION SCREEN =====
function showQuestionScreen(room) {
  showScreen('screen-question');
  const card = room.currentCard;
  state.currentQuestion = card;
  state.myLie = null;
  state.myVote = null;

  document.getElementById('q-ronde').textContent = `Ronde ${room.currentRound}/${room.totalRounds}`;
  document.getElementById('q-category').textContent = card.cat;
  document.getElementById('q-text').innerHTML = formatQuestion(card.q);

  updateMiniScores(room.players);

  if (state.isHost) {
    document.getElementById('host-next-btn').style.display = 'block';
    document.getElementById('waiting-host-start').style.display = 'none';
  } else {
    document.getElementById('host-next-btn').style.display = 'none';
    document.getElementById('waiting-host-start').style.display = 'flex';
  }
}

function formatQuestion(q) {
  return q.replace('[...]', '<span class="blank">  ...  </span>');
}

window.advancePhase = async function(nextPhase) {
  if (!state.isHost) return;
  if (nextPhase === 'writing') {
    await update(ref(db, `rooms/${state.roomCode}`), {
      phase: 'writing',
      writingStartedAt: serverTimestamp(),
      answers: null,
      votes: null,
    });
  } else if (nextPhase === 'voting') {
    // Collect all lies and add true answer, shuffle
    const snap = await get(ref(db, `rooms/${state.roomCode}/answers`));
    const answers = snap.val() || {};
    const card = state.currentQuestion;

    const entries = Object.entries(answers).map(([pid, a]) => ({ pid, text: a }));
    entries.push({ pid: '__truth__', text: card.a });
    const shuffled = shuffleArray(entries);

    await update(ref(db, `rooms/${state.roomCode}`), {
      phase: 'voting',
      shuffledAnswers: shuffled,
      votingStartedAt: serverTimestamp(),
      votes: null,
    });
  }
};

// ===== WRITING SCREEN =====
function showWritingScreen(room) {
  showScreen('screen-writing');
  const card = room.currentCard;
  state.currentQuestion = card;

  document.getElementById('w-ronde').textContent = `Ronde ${room.currentRound}/${room.totalRounds}`;
  document.getElementById('w-question-text').innerHTML = formatQuestion(card.q);

  const textarea = document.getElementById('lie-input');
  textarea.value = '';
  document.getElementById('char-count').textContent = '0';
  textarea.oninput = () => document.getElementById('char-count').textContent = textarea.value.length;

  document.getElementById('submitted-indicator').style.display = 'none';
  document.getElementById('submit-lie-btn').style.display = 'flex';

  // 90-second timer
  let timeLeft = 90;
  const timerEl = document.getElementById('w-timer');
  timerEl.textContent = timeLeft;
  timerEl.classList.remove('urgent');

  state.writeTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 10) timerEl.classList.add('urgent');
    if (timeLeft <= 0) {
      clearInterval(state.writeTimer);
      if (!state.myLie) autoSubmitLie();
      if (state.isHost) setTimeout(() => advancePhase('voting'), 2000);
    }
  }, 1000);

  // Watch for all answers
  const answersRef = ref(db, `rooms/${state.roomCode}/answers`);
  const playersRef = ref(db, `rooms/${state.roomCode}/players`);
  const l = onValue(answersRef, async (snap) => {
    const answers = snap.val() || {};
    const playerSnap = await get(playersRef);
    const players = playerSnap.val() || {};
    const total = Object.keys(players).length;
    const submitted = Object.keys(answers).length;
    document.getElementById('submitted-count').textContent = `${submitted}/${total} pemain sudah mengirim jawaban`;
    if (submitted >= total && state.isHost) {
      clearInterval(state.writeTimer);
      setTimeout(() => advancePhase('voting'), 1500);
    }
  });
  state.listeners.push({ ref: answersRef, listener: l });
}

async function autoSubmitLie() {
  if (state.myLie) return;
  const fallback = '—';
  state.myLie = fallback;
  await set(ref(db, `rooms/${state.roomCode}/answers/${state.playerId}`), fallback);
}

window.submitLie = async function() {
  const text = document.getElementById('lie-input').value.trim();
  if (!text) { showToast('Tulis jawabanmu dulu!', 'error'); return; }
  if (state.myLie) return;

  const card = state.currentQuestion;
  if (text.toLowerCase() === card.a.toLowerCase()) {
    showToast('Jawabanmu terlalu mirip dengan jawaban asli! Coba yang lain.', 'error');
    return;
  }

  state.myLie = text;
  await set(ref(db, `rooms/${state.roomCode}/answers/${state.playerId}`), text);

  document.getElementById('submit-lie-btn').style.display = 'none';
  document.getElementById('submitted-indicator').style.display = 'flex';
  showToast('Kebohonganmu terkirim! 🎭', 'success');
};

// ===== VOTING SCREEN =====
function showVotingScreen(room) {
  showScreen('screen-voting');
  const card = room.currentCard;
  state.currentQuestion = card;

  document.getElementById('v-ronde').textContent = `Ronde ${room.currentRound}/${room.totalRounds}`;
  document.getElementById('v-question-text').innerHTML = formatQuestion(card.q);

  const answers = room.shuffledAnswers || [];
  const grid = document.getElementById('answers-grid');
  grid.innerHTML = answers.map((a, i) => {
    const isOwn = a.pid === state.playerId;
    return `
      <div class="answer-option ${isOwn ? 'disabled' : ''}" 
           onclick="${!isOwn ? `castVote('${a.pid}', this)` : ''}"
           data-pid="${a.pid}">
        <div class="answer-label">${labelFromIndex(i)}</div>
        <div class="answer-text">${a.text}${isOwn ? ' <span style="font-size:0.7rem;color:var(--text3)">(milikmu)</span>' : ''}</div>
      </div>
    `;
  }).join('');

  document.getElementById('voted-indicator').style.display = 'none';

  // 30-second timer
  let timeLeft = 30;
  const timerEl = document.getElementById('v-timer');
  timerEl.textContent = timeLeft;
  timerEl.classList.remove('urgent');

  state.voteTimer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 10) timerEl.classList.add('urgent');
    if (timeLeft <= 0) {
      clearInterval(state.voteTimer);
      if (state.isHost) revealAnswers(room);
    }
  }, 1000);

  // Watch votes
  const votesRef = ref(db, `rooms/${state.roomCode}/votes`);
  const playersRef = ref(db, `rooms/${state.roomCode}/players`);
  const l = onValue(votesRef, async (snap) => {
    const votes = snap.val() || {};
    const playerSnap = await get(playersRef);
    const players = playerSnap.val() || {};
    const total = Object.keys(players).length;
    const voted = Object.keys(votes).length;
    document.getElementById('voted-count').textContent = `${voted}/${total} pemain sudah memilih`;
    if (voted >= total && state.isHost) {
      clearInterval(state.voteTimer);
      setTimeout(() => revealAnswers(room), 1000);
    }
  });
  state.listeners.push({ ref: votesRef, listener: l });
}

window.castVote = async function(pid, el) {
  if (state.myVote) return;
  if (pid === state.playerId) { showToast('Tidak bisa memilih jawabanmu sendiri!', 'error'); return; }

  state.myVote = pid;
  document.querySelectorAll('.answer-option').forEach(o => o.classList.remove('selected'));
  el.closest('.answer-option').classList.add('selected');

  await set(ref(db, `rooms/${state.roomCode}/votes/${state.playerId}`), pid);
  document.getElementById('voted-indicator').style.display = 'flex';
  showToast('Pilihanmu tercatat!', 'success');
};

// ===== REVEAL =====
async function revealAnswers(room) {
  if (!state.isHost) return;

  const answersSnap = await get(ref(db, `rooms/${state.roomCode}/answers`));
  const votesSnap = await get(ref(db, `rooms/${state.roomCode}/votes`));
  const playersSnap = await get(ref(db, `rooms/${state.roomCode}/players`));

  const answers = answersSnap.val() || {};
  const votes = votesSnap.val() || {};
  const players = playersSnap.val() || {};
  const shuffledAnswers = room.shuffledAnswers || [];
  const card = room.currentCard;

  // Calculate points
  const roundPoints = {};
  Object.keys(players).forEach(pid => roundPoints[pid] = 0);

  // +2 for guessing truth, +1 for each person fooled
  Object.entries(votes).forEach(([voterId, votedPid]) => {
    if (votedPid === '__truth__') {
      roundPoints[voterId] = (roundPoints[voterId] || 0) + 2;
    } else if (votedPid !== voterId) {
      roundPoints[votedPid] = (roundPoints[votedPid] || 0) + 1;
    }
  });

  // Update scores
  const scoreUpdates = {};
  Object.entries(roundPoints).forEach(([pid, pts]) => {
    if (players[pid]) {
      scoreUpdates[`rooms/${state.roomCode}/players/${pid}/score`] = (players[pid].score || 0) + pts;
    }
  });
  if (Object.keys(scoreUpdates).length > 0) await update(ref(db), scoreUpdates);

  await update(ref(db, `rooms/${state.roomCode}`), {
    phase: 'reveal',
    roundPoints,
    votes,
    answers,
  });
}

function showRevealScreen(room) {
  showScreen('screen-reveal');
  const card = room.currentCard;

  document.getElementById('r-ronde').textContent = `Ronde ${room.currentRound}/${room.totalRounds}`;
  document.getElementById('reveal-truth').textContent = card.a;
  document.getElementById('reveal-question').textContent = card.q.replace('[...]', '___');

  const shuffledAnswers = room.shuffledAnswers || [];
  const votes = room.votes || {};
  const roundPoints = room.roundPoints || {};
  const players = room.players || {};
  const myId = state.playerId;

  // Build answer reveals
  const revealEl = document.getElementById('reveal-answers');
  revealEl.innerHTML = shuffledAnswers.map((a, i) => {
    const isTruth = a.pid === '__truth__';
    const author = isTruth ? '✅ JAWABAN ASLI' : (players[a.pid]?.name || '?');
    const whoVoted = Object.entries(votes).filter(([,v]) => v === a.pid).map(([voterId]) => players[voterId]?.name || '?');
    const correct = Object.entries(votes).filter(([vid, v]) => v === '__truth__' && a.pid === '__truth__').map(([vid]) => players[vid]?.name || '?');

    return `
      <div class="reveal-answer-item ${isTruth ? 'is-truth' : ''}" style="animation-delay:${i * 0.1}s">
        <div class="reveal-answer-top">
          <div>
            <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text3)">${labelFromIndex(i)}.</span>
            <span class="reveal-answer-text"> ${a.text}</span>
          </div>
        </div>
        <div class="reveal-answer-author">${author}</div>
        ${whoVoted.length > 0 ? `<div class="reveal-votes">${whoVoted.map(n => `<span class="vote-chip ${isTruth ? 'correct' : 'fooled'}">+${isTruth ? '2' : '1'} ${n}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  // Round scores
  const sortedRoundPts = Object.entries(roundPoints).sort((a,b) => b[1]-a[1]);
  document.getElementById('round-scores').innerHTML = `
    <div class="round-scores-title">Poin Ronde Ini</div>
    ${sortedRoundPts.map(([pid, pts]) => `
      <div class="rs-item">
        <span>${players[pid]?.name || '?'}${pid === myId ? ' (kamu)' : ''}</span>
        <span class="rs-delta ${pts === 0 ? 'zero' : ''}">${pts > 0 ? '+'+pts : pts} poin</span>
      </div>
    `).join('')}
  `;

  if (state.isHost) {
    document.getElementById('host-reveal-next').style.display = 'block';
    document.getElementById('player-reveal-wait').style.display = 'none';
    const isLastRound = room.currentRound >= room.totalRounds;
    document.getElementById('next-round-btn').textContent = isLastRound ? 'Lihat Hasil Akhir 🏆' : 'Ronde Berikutnya →';
  } else {
    document.getElementById('host-reveal-next').style.display = 'none';
    document.getElementById('player-reveal-wait').style.display = 'flex';
  }
}

window.nextRound = async function() {
  if (!state.isHost) return;

  const snap = await get(ref(db, `rooms/${state.roomCode}`));
  const room = snap.val();

  // Check win condition for 'race' mode
  if (room.winMode === 'race') {
    const players = room.players || {};
    const winner = Object.entries(players).find(([,p]) => p.score >= 15);
    if (winner) {
      await update(ref(db, `rooms/${state.roomCode}`), { phase: 'ended' });
      return;
    }
  }

  if (room.currentRound >= room.totalRounds) {
    await update(ref(db, `rooms/${state.roomCode}`), { phase: 'scoreboard', showFinal: true });
    return;
  }

  showLoading('Memuat ronde berikutnya...');
  const usedIds = room.usedCardIds || [];
  const card = getRandomCard(room.edition, usedIds);
  usedIds.push(card.id);

  await update(ref(db, `rooms/${state.roomCode}`), {
    phase: 'question',
    currentRound: room.currentRound + 1,
    currentCard: card,
    usedCardIds: usedIds,
    answers: null,
    votes: null,
    shuffledAnswers: null,
    roundPoints: null,
  });
  hideLoading();
};

// ===== SCOREBOARD =====
function showScoreboardScreen(room) {
  showScreen('screen-scoreboard');
  const players = room.players || {};
  const sorted = Object.entries(players).sort((a,b) => b[1].score - a[1].score);
  const isFinal = room.showFinal;

  document.getElementById('score-ronde-info').textContent = isFinal 
    ? `Game Selesai! ${room.totalRounds} Ronde` 
    : `Setelah Ronde ${room.currentRound}/${room.totalRounds}`;

  const medals = ['🥇','🥈','🥉'];
  document.getElementById('scoreboard-list').innerHTML = sorted.map(([pid, p], i) => `
    <div class="sb-item" style="animation-delay:${i*0.1}s">
      <div class="sb-rank">${medals[i] || (i+1)}</div>
      <div class="player-avatar" style="background:${p.color}20;color:${p.color};border:1.5px solid ${p.color}40;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">
        ${p.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div class="sb-name">${p.name}</div>
        ${pid === state.playerId ? '<div class="sb-you">Kamu</div>' : ''}
      </div>
      <div class="sb-score">${p.score}</div>
    </div>
  `).join('');

  if (state.isHost) {
    document.getElementById('host-score-actions').style.display = 'flex';
    document.getElementById('host-score-actions').style.flexDirection = 'column';
    document.getElementById('host-score-actions').style.gap = '8px';
    document.getElementById('player-score-wait').style.display = 'none';
    document.getElementById('continue-game-btn').style.display = isFinal ? 'none' : 'flex';
  } else {
    document.getElementById('host-score-actions').style.display = 'none';
    document.getElementById('player-score-wait').style.display = 'flex';
  }
}

window.continueGame = async function() {
  const snap = await get(ref(db, `rooms/${state.roomCode}`));
  const room = snap.val();
  showLoading('Memuat ronde berikutnya...');
  const usedIds = room.usedCardIds || [];
  const card = getRandomCard(room.edition, usedIds);
  usedIds.push(card.id);

  await update(ref(db, `rooms/${state.roomCode}`), {
    phase: 'question',
    currentRound: room.currentRound + 1,
    currentCard: card,
    usedCardIds: usedIds,
    answers: null, votes: null, shuffledAnswers: null, roundPoints: null, showFinal: false
  });
  hideLoading();
};

window.endGame = async function() {
  await update(ref(db, `rooms/${state.roomCode}`), { phase: 'ended' });
};

// ===== WINNER =====
function showWinnerScreen(room) {
  showScreen('screen-winner');
  const players = room.players || {};
  const sorted = Object.entries(players).sort((a,b) => b[1].score - a[1].score);
  const [winId, winPlayer] = sorted[0] || ['?', { name: '???', score: 0 }];

  document.getElementById('winner-name').textContent = winPlayer.name;
  document.getElementById('winner-score').textContent = `${winPlayer.score} Poin`;

  const medals = ['🥇','🥈','🥉'];
  document.getElementById('final-scoreboard').innerHTML = sorted.map(([pid, p], i) => `
    <div class="fs-item">
      <span>${medals[i] || (i+1)} ${p.name}${pid === state.playerId ? ' (kamu)' : ''}</span>
      <span class="fs-score">${p.score} poin</span>
    </div>
  `).join('');

  launchConfetti();
}

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colors = ['#f5c842','#ff6b35','#a855f7','#22c55e','#3b82f6','#ec4899'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 3 + 's';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    container.appendChild(piece);
  }
}

window.returnToHome = function() {
  state.listeners.forEach(l => off(l.ref, 'value', l.listener));
  state.listeners = [];
  clearTimers();
  if (state.roomCode && state.isHost) {
    remove(ref(db, `rooms/${state.roomCode}`)).catch(() => {});
  } else if (state.roomCode && state.playerId) {
    remove(ref(db, `rooms/${state.roomCode}/players/${state.playerId}`)).catch(() => {});
  }
  state.roomCode = null;
  state.playerId = null;
  sessionStorage.removeItem('kp_session');
  showScreen('screen-home');
};

// ===== MINI SCORES =====
function updateMiniScores(players) {
  if (!players) return;
  const sorted = Object.entries(players).sort((a,b) => b[1].score - a[1].score).slice(0, 5);
  document.getElementById('scores-mini').innerHTML = sorted.map(([pid, p]) => `
    <div class="score-mini-item">
      <div class="smi-name">${p.name.substring(0,6)}</div>
      <div class="smi-score">${p.score}</div>
    </div>
  `).join('');
}

// ===== TIMER CLEANUP =====
function clearTimers() {
  if (state.writeTimer) clearInterval(state.writeTimer);
  if (state.voteTimer) clearInterval(state.voteTimer);
}

// ===== LISTEN TO ROOM PHASE (for non-host players) =====
function listenToRoom(code) {
  const r = ref(db, `rooms/${code}`);
  const l = onValue(r, (snap) => {
    if (!snap.exists()) {
      showToast('Ruangan telah ditutup oleh host.', 'error', 4000);
      leaveRoom(true);
      return;
    }
    const room = snap.val();
    if (room.phase !== 'lobby') {
      handlePhaseChange(room);
    } else if (state.gamePhase && state.gamePhase !== 'lobby') {
      state.gamePhase = 'lobby';
      showScreen('screen-lobby');
      clearTimers();
    }
  });
  state.listeners.push({ ref: r, listener: l });
}

// ===== INIT =====
function saveSession() {
  if (state.roomCode && state.playerId) {
    sessionStorage.setItem('kp_session', JSON.stringify({
      roomCode: state.roomCode,
      playerId: state.playerId,
      playerName: state.playerName,
      isHost: state.isHost
    }));
  }
}

async function tryReconnect() {
  const saved = sessionStorage.getItem('kp_session');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      showLoading('Menghubungkan kembali...');
      const snap = await get(ref(db, `rooms/${data.roomCode}`));
      if (snap.exists() && snap.val().players && snap.val().players[data.playerId]) {
        state.roomCode = data.roomCode;
        state.playerId = data.playerId;
        state.playerName = data.playerName;
        state.isHost = data.isHost;
        enterLobby(data.roomCode, data.playerId);
        hideLoading();
        return true;
      } else {
        sessionStorage.removeItem('kp_session');
      }
    } catch(e) {
      console.error(e);
      sessionStorage.removeItem('kp_session');
    }
    hideLoading();
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  initEditionList();
  const reconnected = await tryReconnect();
  if (!reconnected) {
    document.getElementById('screen-splash').classList.add('active');
  }
});
