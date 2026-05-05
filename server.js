const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const VOTE_DURATION_MS = 15000; // 15 seconds auto-close
let autoCloseTimer = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── STATE ───────────────────────────────────────────────────────────────────
let state = {
  phase: 'lobby',          // 'lobby' | 'question' | 'results' | 'finished'
  questions: [],           // [{ text, options:['Sí','No','Abstención'] }]
  currentIdx: -1,
  votes: {},               // { questionIdx: { 'Sí': 0, 'No': 0, 'Abstención': 0 } }
  attendeeCount: 0,
  votedThisRound: new Set(),
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function broadcast(data, includePresenter = true) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      if (!includePresenter && client.role === 'presenter') return;
      client.send(msg);
    }
  });
}

function broadcastToPresenter(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.role === 'presenter') {
      client.send(msg);
    }
  });
}

function getCurrentVotes() {
  const idx = state.currentIdx;
  return state.votes[idx] || { 'Sí': 0, 'No': 0, 'Abstención': 0 };
}

function countAttendees() {
  let n = 0;
  wss.clients.forEach(c => { if (c.role === 'attendee' && c.readyState === WebSocket.OPEN) n++; });
  return n;
}

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  ws.role = null;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ── Handshakes ──
      case 'JOIN_PRESENTER':
        ws.role = 'presenter';
        ws.send(JSON.stringify({ type: 'STATE_SYNC', state: {
          phase: state.phase,
          questions: state.questions,
          currentIdx: state.currentIdx,
          votes: state.votes,
          attendeeCount: countAttendees(),
        }}));
        break;

      case 'JOIN_ATTENDEE':
        ws.role = 'attendee';
        ws.attendeeId = msg.attendeeId || Math.random().toString(36).slice(2);
        // Tell attendee current state
        if (state.phase === 'question') {
          ws.send(JSON.stringify({
            type: 'NEW_QUESTION',
            idx: state.currentIdx,
            question: state.questions[state.currentIdx],
            total: state.questions.length,
            alreadyVoted: state.votedThisRound.has(ws.attendeeId),
          }));
        } else {
          ws.send(JSON.stringify({ type: 'LOBBY', message: 'Esperando al presentador...' }));
        }
        // Update presenter with new attendee count
        setTimeout(() => broadcastToPresenter({ type: 'ATTENDEE_COUNT', count: countAttendees() }), 100);
        break;

      // ── Presenter controls ──
      case 'SET_QUESTIONS':
        state.questions = msg.questions;
        state.votes = {};
        state.currentIdx = -1;
        state.phase = 'lobby';
        ws.send(JSON.stringify({ type: 'QUESTIONS_SAVED', count: msg.questions.length }));
        break;

      case 'START_QUESTION': {
        const idx = msg.idx;
        if (idx < 0 || idx >= state.questions.length) break;
        // Clear any existing auto-close timer
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        state.currentIdx = idx;
        state.phase = 'question';
        state.votedThisRound = new Set();
        if (!state.votes[idx]) {
          state.votes[idx] = { 'Sí': 0, 'No': 0, 'Abstención': 0 };
        }
        broadcast({
          type: 'NEW_QUESTION',
          idx,
          question: state.questions[idx],
          total: state.questions.length,
          alreadyVoted: false,
          duration: VOTE_DURATION_MS / 1000,
        });
        // Auto-close after VOTE_DURATION_MS
        autoCloseTimer = setTimeout(() => {
          if (state.phase !== 'question') return;
          state.phase = 'results';
          broadcast({ type: 'QUESTION_ENDED', idx: state.currentIdx, votes: getCurrentVotes(), autoClose: true });
          broadcastToPresenter({ type: 'QUESTION_ENDED', idx: state.currentIdx, votes: getCurrentVotes(), autoClose: true });
        }, VOTE_DURATION_MS);
        break;
      }

      case 'END_QUESTION':
        if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
        state.phase = 'results';
        broadcast({ type: 'QUESTION_ENDED', idx: state.currentIdx, votes: getCurrentVotes() });
        break;

      case 'FINISH_EVENT':
        state.phase = 'finished';
        broadcast({ type: 'EVENT_FINISHED', votes: state.votes, questions: state.questions });
        break;

      // ── Attendee votes ──
      case 'VOTE': {
        if (state.phase !== 'question') break;
        const { attendeeId, option, questionIdx } = msg;
        if (questionIdx !== state.currentIdx) break;
        if (state.votedThisRound.has(attendeeId)) {
          ws.send(JSON.stringify({ type: 'ALREADY_VOTED' }));
          break;
        }
        state.votedThisRound.add(attendeeId);
        if (!state.votes[questionIdx]) state.votes[questionIdx] = { 'Sí': 0, 'No': 0, 'Abstención': 0 };
        if (state.votes[questionIdx][option] !== undefined) {
          state.votes[questionIdx][option]++;
        }
        ws.send(JSON.stringify({ type: 'VOTE_CONFIRMED', option }));
        broadcastToPresenter({ type: 'VOTE_UPDATE', votes: state.votes[questionIdx], questionIdx, total: state.votedThisRound.size });
        break;
      }
    }
  });

  ws.on('close', () => {
    setTimeout(() => broadcastToPresenter({ type: 'ATTENDEE_COUNT', count: countAttendees() }), 100);
  });
});

// ─── REST: export data ────────────────────────────────────────────────────────
app.get('/api/results', (req, res) => {
  res.json({ questions: state.questions, votes: state.votes });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗳️  HandVote server running`);
  console.log(`   Presenter: http://localhost:${PORT}/presenter.html`);
  console.log(`   Attendees: http://localhost:${PORT}/vote.html\n`);
});
