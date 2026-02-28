// ═══════════════════════════════════════════════
//   2048 NEXUS v2.0 — Engine & UI
// ═══════════════════════════════════════════════

// ── Particles ──────────────────────────────────
const canvas = document.getElementById('particles');
const ctx    = canvas.getContext('2d');
const particles = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color = color;
    this.r  = Math.random() * 4 + 2;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5 - 2;
    this.life  = 1;
    this.decay = Math.random() * 0.03 + 0.02;
  }
  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.12;
    this.life -= this.decay;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle   = this.color;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

function spawnParticles(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function animParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  requestAnimationFrame(animParticles);
}
animParticles();

// ── State ──────────────────────────────────────
let bSize     = 4;
let board     = [];
let score     = 0, moves = 0;
let gameMode  = 'classic';
let gameActive = true, hasWon = false;
let prevState  = null;
let timerRef   = null, timeLeft = 180;
let comboCount = 0, bestCombo = 0, highestTile = 0;
let lastMergeTime = 0;
const COMBO_WINDOW = 800;

let achievements = JSON.parse(localStorage.getItem('2048-nexus-ach-v2')) || {};
let leaderboard  = JSON.parse(localStorage.getItem('2048-nexus-lb-v2'))  || [];
let bestScore    = parseInt(localStorage.getItem('2048-nexus-best-v2'))  || 0;

// ── DOM refs ───────────────────────────────────
const gameBoard   = document.getElementById('game-board');
const scoreEl     = document.getElementById('score');
const bestEl      = document.getElementById('best');
const movesEl     = document.getElementById('moves');
const timerPill   = document.getElementById('timer-pill');
const timerText   = document.getElementById('timer-text');
const comboBanner = document.getElementById('combo-banner');
const comboTextEl = document.getElementById('combo-text');
const modal       = document.getElementById('modal');
const modalIcon   = document.getElementById('modal-icon');
const modalTitle  = document.getElementById('modal-title');
const modalScore  = document.getElementById('modal-score');
const modalMsg    = document.getElementById('modal-msg');
const btnContinue = document.getElementById('btn-continue-modal');
const btnRestartM = document.getElementById('btn-restart-modal');
const btnUndo     = document.getElementById('btn-undo');
const btnRestart  = document.getElementById('btn-restart');
const ssTile      = document.getElementById('ss-tile');
const ssCombo     = document.getElementById('ss-combo');
const ssEff       = document.getElementById('ss-eff');
const lbList      = document.getElementById('lb-list');

// ── Init ───────────────────────────────────────
function initGame() {
  board      = Array(bSize).fill(null).map(() => Array(bSize).fill(0));
  score      = 0; moves = 0;
  gameActive = true; hasWon = false;
  prevState  = null;
  comboCount = 0; bestCombo = 0; highestTile = 0;

  if (timerRef) clearInterval(timerRef);
  timerPill.classList.remove('active', 'urgent');
  timerPill.classList.toggle('active', gameMode === 'time');

  if (gameMode === 'time') {
    timeLeft = 180;
    updateTimerDisplay();
    startTimer();
  }

  addTile(); addTile();
  renderBoard(false);
  updateStats();
  updateSession();
  modal.classList.remove('show');
  comboBanner.classList.remove('show');

  document.body.classList.toggle('zen-mode',     gameMode === 'zen');
  document.body.classList.toggle('extreme-mode', gameMode === 'extreme');
  gameBoard.className = `board-${bSize}`;
}

function startTimer() {
  timerRef = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 30) timerPill.classList.add('urgent');
    if (timeLeft <= 0) { clearInterval(timerRef); endGame(false, 'O tempo acabou!'); }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  timerText.textContent = `${m}:${s}`;
}

// ── Tile spawn ─────────────────────────────────
function addTile() {
  const empty = [];
  board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push({r, c}); }));
  if (!empty.length) return;
  const {r, c} = empty[Math.floor(Math.random() * empty.length)];
  board[r][c]  = gameMode === 'extreme' ? 4 : (Math.random() < 0.1 ? 4 : 2);
  return {r, c};
}

// ── Render ─────────────────────────────────────
let mergedCells = [];
let newCells    = [];

function renderBoard(animated = true) {
  const frag = document.createDocumentFragment();
  board.forEach((row, r) => {
    row.forEach((v, c) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (v > 0) {
        tile.textContent = v;
        tile.setAttribute('data-v', v);
        const isMerge = animated && mergedCells.some(m => m.r === r && m.c === c);
        const isNew   = animated && newCells.some(n => n.r === r && n.c === c);
        tile.classList.add(isMerge ? 'merged' : 'filled');
        if (isNew && !isMerge) tile.classList.add('filled');
      }
      frag.appendChild(tile);
    });
  });
  gameBoard.innerHTML = '';
  gameBoard.appendChild(frag);
}

function updateStats() {
  const prev = parseInt(scoreEl.textContent) || 0;
  scoreEl.textContent = score;
  movesEl.textContent = moves;
  bestEl.textContent  = bestScore;

  if (score > prev && prev > 0) {
    scoreEl.classList.remove('pulse-up');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pulse-up');
  }
  btnUndo.disabled = !prevState;
}

function updateSession() {
  ssTile.textContent  = highestTile || '–';
  ssCombo.textContent = bestCombo;
  ssEff.textContent   = moves > 0 ? Math.round(score / moves) : '–';
}

// ── Move logic (com tracking de posição) ──────
let isMoving = false;

function handleMoveWithPositions(dir) {
  if (!gameActive || isMoving) return;
  isMoving = true;

  const snap = JSON.stringify(board);
  saveState();
  mergedCells = [];

  const combineRowTracked = (row, rowIdx, colOffset = 0, transposed = false) => {
    let r = row.map((v, i) => ({v, orig: i})).filter(x => x.v > 0);
    for (let i = 0; i < r.length - 1; i++) {
      if (r[i].v === r[i + 1].v) {
        r[i].v *= 2;
        score  += r[i].v * Math.max(1, 1 + (comboCount - 1) * 0.5);
        score   = Math.floor(score);
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem('2048-nexus-best-v2', bestScore);
        }
        if (r[i].v > highestTile) highestTile = r[i].v;
        const finalPos = i + colOffset;
        if (!transposed) mergedCells.push({r: rowIdx,  c: finalPos, v: r[i].v});
        else             mergedCells.push({r: finalPos, c: rowIdx,  v: r[i].v});
        r[i + 1].v = 0;
      }
    }
    r = r.filter(x => x.v > 0).map(x => x.v);
    while (r.length < bSize) r.push(0);
    return r;
  };

  if (dir === 'left') {
    board = board.map((row, ri) => combineRowTracked(row, ri));
  } else if (dir === 'right') {
    board = board.map((row, ri) => {
      const rev    = combineRowTracked([...row].reverse(), ri, 0);
      const result = rev.reverse();
      mergedCells  = mergedCells.map(m => m.r === ri ? {...m, c: bSize - 1 - m.c} : m);
      return result;
    });
  } else if (dir === 'up') {
    const t   = transpose(board);
    const newT = t.map((row, ri) => combineRowTracked(row, ri, 0, true));
    board = transpose(newT);
  } else if (dir === 'down') {
    const t        = transpose(board);
    const flipped  = t.map(r => [...r].reverse());
    const combined = flipped.map((row, ri) => combineRowTracked(row, ri, 0, true));
    const reflipped = combined.map(r => r.reverse());
    board = transpose(reflipped);
    mergedCells = mergedCells.map(m => ({...m, r: bSize - 1 - m.r}));
  }

  if (JSON.stringify(board) !== snap) {
    moves++;

    const now = Date.now();
    if (mergedCells.length > 0) {
      if (now - lastMergeTime < COMBO_WINDOW) comboCount++;
      else comboCount = 1;
      lastMergeTime = now;
      if (comboCount > bestCombo) bestCombo = comboCount;
      showCombo(comboCount);

      const rect  = gameBoard.getBoundingClientRect();
      const cellW = rect.width / bSize;
      mergedCells.forEach(({r, c, v}) => {
        if (r >= 0 && c >= 0) {
          const px = rect.left + c * cellW + cellW / 2;
          const py = rect.top  + r * cellW + cellW / 2;
          spawnParticles(px, py, getTileColor(v), 10 + Math.min(comboCount, 8) * 2);
        }
      });
    } else {
      comboCount = 0;
      comboBanner.classList.remove('show');
    }

    newCells = [];
    const newT = addTile();
    if (newT) newCells = [newT];

    renderBoard(true);
    updateStats();
    updateSession();
    checkGameStatus();
    checkAchievements();
  } else {
    prevState = null;
  }

  setTimeout(() => { isMoving = false; }, 120);
}

function transpose(m) {
  return m[0].map((_, ci) => m.map(row => row[ci]));
}

// ── Save/Undo ──────────────────────────────────
function saveState() {
  prevState = {
    board: JSON.parse(JSON.stringify(board)),
    score, moves, comboCount, highestTile, bestCombo
  };
}

function undo() {
  if (!prevState) return;
  board       = JSON.parse(JSON.stringify(prevState.board));
  score       = prevState.score;
  moves       = prevState.moves;
  comboCount  = prevState.comboCount;
  highestTile = prevState.highestTile;
  bestCombo   = prevState.bestCombo;
  prevState   = null;
  mergedCells = []; newCells = [];
  renderBoard(false);
  updateStats();
  updateSession();
}

// ── Combo UI ───────────────────────────────────
let comboTimeout = null;
function showCombo(n) {
  if (n < 2) { comboBanner.classList.remove('show'); return; }
  comboTextEl.textContent = `COMBO ×${n}`;
  comboBanner.classList.remove('show');
  void comboBanner.offsetWidth;
  comboBanner.classList.add('show');
  if (comboTimeout) clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => comboBanner.classList.remove('show'), 1200);
}

// ── Game status ────────────────────────────────
function checkGameStatus() {
  let max = 0;
  board.forEach(row => row.forEach(v => { if (v > max) max = v; }));
  highestTile = Math.max(highestTile, max);

  if (max >= 2048 && !hasWon && gameMode !== 'zen') {
    hasWon = true;
    unlockAch('first-win');
    setTimeout(() => endGame(true, `Você chegou ao 2048! 🎉`), 300);
    return;
  }

  if (max >= 4096) unlockAch('4096-club');
  if (gameMode !== 'zen' && !hasMoves()) {
    setTimeout(() => endGame(false, `Sem movimentos disponíveis.`), 200);
  }
}

function hasMoves() {
  for (let r = 0; r < bSize; r++)
    for (let c = 0; c < bSize; c++) {
      if (!board[r][c]) return true;
      if (c < bSize - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < bSize - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  return false;
}

function endGame(win, msg) {
  if (!gameActive) return;
  if (gameMode === 'zen') return;
  gameActive = false;
  if (timerRef) clearInterval(timerRef);

  if (score > 0) {
    leaderboard.push({
      score, mode: gameMode,
      size: `${bSize}×${bSize}`,
      date: new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})
    });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem('2048-nexus-lb-v2', JSON.stringify(leaderboard));
    renderLeaderboard();
  }

  modalIcon.textContent  = win ? '🏆' : '💀';
  modalTitle.textContent = win ? 'VITÓRIA!' : 'FIM DE JOGO';
  modalTitle.className   = `modal-title ${win ? 'win' : 'lose'}`;
  modalScore.textContent = score.toLocaleString();
  modalMsg.textContent   = `${msg} ${moves} jogadas · Melhor tile: ${highestTile}`;
  btnContinue.style.display = win ? 'flex' : 'none';
  modal.classList.add('show');
}

// ── Achievements ───────────────────────────────
function checkAchievements() {
  if (hasWon)                                        unlockAch('first-win');
  if (gameMode === 'time' && score >= 1500)          unlockAch('speed-demon');
  if (bestCombo >= 5)                                unlockAch('combo-master');
  if (score >= 10000)                                unlockAch('high-scorer');
  if (moves <= 80 && score >= 2048)                  unlockAch('precision');
  if (bSize === 4 && moves >= 300)                   unlockAch('survivor');
  if (bSize === 5 && hasWon)                         unlockAch('5x5-master');
}

function unlockAch(id) {
  if (achievements[id]) return;
  achievements[id] = true;
  localStorage.setItem('2048-nexus-ach-v2', JSON.stringify(achievements));
  const el = document.querySelector(`[data-ach="${id}"]`);
  if (el) el.classList.add('unlocked');
  const name = el ? el.querySelector('.ach-name').textContent : id;
  showToast(`🏆 Conquista: ${name}`);
}

function loadAchievements() {
  Object.keys(achievements).forEach(id => {
    const el = document.querySelector(`[data-ach="${id}"]`);
    if (el) el.classList.add('unlocked');
  });
}

// ── Leaderboard ────────────────────────────────
function renderLeaderboard() {
  lbList.innerHTML = '';
  if (!leaderboard.length) {
    lbList.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:12px">Nenhum recorde ainda.</div>';
    return;
  }
  leaderboard.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div class="lb-rank">${i === 0 ? '👑' : i + 1}</div>
      <div class="lb-score">${entry.score.toLocaleString()}</div>
      <div class="lb-meta">${entry.size} · ${entry.mode} · ${entry.date}</div>
    `;
    lbList.appendChild(row);
  });
}

// ── Toast ──────────────────────────────────────
function showToast(msg) {
  const area = document.getElementById('toast-area');
  const t    = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  area.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 500);
  }, 2800);
}

// ── Tile color map ─────────────────────────────
function getTileColor(v) {
  const map = {
    2:'#a8d8ff', 4:'#7ec8ff', 8:'#55b8ff', 16:'#00f3ff',
    32:'#ff80ff', 64:'#ff55ff', 128:'#ff33dd', 256:'#ffcc55',
    512:'#ffbb00', 1024:'#66ffcc', 2048:'#00ffaa', 4096:'#cc66ff', 8192:'#ff6666'
  };
  return map[v] || '#ffffff';
}

// ── Event Listeners ────────────────────────────
document.addEventListener('keydown', e => {
  const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
  if (map[e.key]) { e.preventDefault(); handleMoveWithPositions(map[e.key]); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

// Touch swipe
let tx = 0, ty = 0;
document.addEventListener('touchstart', e => {
  if (!gameActive) return;
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });

document.addEventListener('touchend', e => {
  if (!gameActive) return;
  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) handleMoveWithPositions(dx > 0 ? 'right' : 'left');
  else                             handleMoveWithPositions(dy > 0 ? 'down'  : 'up');
});

// Mouse swipe
let mx = 0, my = 0, mdown = false;
gameBoard.addEventListener('mousedown', e => { if (!gameActive) return; mx = e.clientX; my = e.clientY; mdown = true; });
document.addEventListener('mouseup', e => {
  if (!mdown) return;
  mdown = false;
  const dx = e.clientX - mx, dy = e.clientY - my;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) handleMoveWithPositions(dx > 0 ? 'right' : 'left');
  else                             handleMoveWithPositions(dy > 0 ? 'down'  : 'up');
});

// Buttons
btnRestart.addEventListener('click', initGame);
btnUndo.addEventListener('click', undo);
btnRestartM.addEventListener('click', initGame);
btnContinue.addEventListener('click', () => { modal.classList.remove('show'); gameActive = true; });

// Size chips
document.getElementById('size-btns').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#size-btns .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  bSize = parseInt(chip.dataset.size);
  initGame();
});

// Mode chips
document.getElementById('mode-btns').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#mode-btns .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  gameMode = chip.dataset.mode;
  const msgs = {
    classic: '♟ Modo Clássico!',
    time:    '⏱ Modo Contra o Tempo — 3 minutos!',
    extreme: '💀 Modo Extremo — apenas tiles 4!',
    zen:     '🌿 Modo Zen — sem game over, relaxe!'
  };
  showToast(msgs[gameMode]);
  initGame();
});

// Auto-pause on tab blur
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameMode === 'time' && gameActive && timerRef) {
    clearInterval(timerRef);
  } else if (!document.hidden && gameMode === 'time' && gameActive) {
    startTimer();
  }
});

// ── Boot ───────────────────────────────────────
loadAchievements();
renderLeaderboard();
bestEl.textContent = bestScore;
initGame();
