/* ═══════════════════════════════════════════════════
   N-QUEENS VISUALIZER — SCRIPT
   Modules: Config · State · Board · Algorithm · UI
═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const CFG = {
  N_MIN: 4,
  N_MAX: 14,
  SPEED_MAP: { 1: 1200, 2: 800, 3: 600, 4: 450, 5: 300, 6: 180, 7: 100, 8: 50, 9: 20, 10: 4 },
  MAX_TRACE: 120,
  QUEEN: '♛',
  KNOWN_SOLUTIONS: {
    4:2, 5:10, 6:4, 7:40, 8:92, 9:352, 10:724, 11:2680, 12:14200, 13:73712, 14:365596
  },
};

/* ─────────────────────────────────────────────
   STATE
───────────────────────────────────────────── */
const State = {
  N:          8,
  speed:      5,
  running:    false,
  paused:     false,
  stepMode:   false,
  stepResolve:null,
  queens:     [],      // queens[row] = col, -1 if none
  steps:      0,
  backtracks: 0,
  solutions:  [],      // array of queen arrays
  solIdx:     0,
  theme:      'dark',
  abort:      false,
};

/* ─────────────────────────────────────────────
   DOM REFS
───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const D = {
  board:         $('board'),
  nValue:        $('nValue'),
  nHint:         $('nHint'),
  nDec:          $('nDec'),
  nInc:          $('nInc'),
  startBtn:      $('startBtn'),
  pauseBtn:      $('pauseBtn'),
  stepBtn:       $('stepBtn'),
  resetBtn:      $('resetBtn'),
  speedSlider:   $('speedSlider'),
  sliderFill:    $('sliderFill'),
  speedDisplay:  $('speedDisplay'),
  statusDot:     $('statusDot'),
  statusText:    $('statusText'),
  stRow:         $('stRow'),
  stCol:         $('stCol'),
  stSteps:       $('stSteps'),
  stBack:        $('stBack'),
  stQueens:      $('stQueens'),
  traceLog:      $('traceLog'),
  clearTrace:    $('clearTrace'),
  solFound:      $('solFound'),
  solIdx:        $('solIdx'),
  prevSol:       $('prevSol'),
  nextSol:       $('nextSol'),
  totalHint:     $('totalHint'),
  refGrid:       $('refGrid'),
  themeBtn:      $('themeBtn'),
  themeIcon:     $('themeIcon'),
  successOverlay:$('successOverlay'),
  successMsg:    $('successMsg'),
  successStats:  $('successStats'),
  nextSolBtn:    $('nextSolBtn'),
  dismissBtn:    $('dismissBtn'),
  colLabels:     $('colLabels'),
  rowLabels:     $('rowLabels'),
  bgCanvas:      $('bgCanvas'),
};

/* ─────────────────────────────────────────────
   BOARD MODULE
───────────────────────────────────────────── */
const Board = {
  cells: [],   // cells[row][col] = div

  build() {
    const n = State.N;
    D.board.innerHTML = '';
    D.board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    this.cells = [];

    // Compute cell size based on available space
    const maxPx = Math.min(window.innerWidth * .45, 560);
    const cellPx = Math.max(32, Math.floor(maxPx / n));
    D.board.style.setProperty('--cell-size', cellPx + 'px');
    document.documentElement.style.setProperty('--cell-size', cellPx + 'px');

    for (let r = 0; r < n; r++) {
      this.cells[r] = [];
      for (let c = 0; c < n; c++) {
        const cell = document.createElement('div');
        cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        cell.style.width  = cellPx + 'px';
        cell.style.height = cellPx + 'px';
        cell.dataset.row = r;
        cell.dataset.col = c;
        D.board.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }
    this.buildLabels();
  },

  buildLabels() {
    const n = State.N;
    const maxPx = Math.min(window.innerWidth * .45, 560);
    const cellPx = Math.max(32, Math.floor(maxPx / n));

    D.colLabels.innerHTML = '';
    D.rowLabels.innerHTML = '';
    for (let c = 0; c < n; c++) {
      const el = document.createElement('div');
      el.className = 'board-label';
      el.style.width = cellPx + 'px';
      el.textContent = String.fromCharCode(65 + c);
      D.colLabels.appendChild(el);
    }
    for (let r = 0; r < n; r++) {
      const el = document.createElement('div');
      el.className = 'board-label';
      el.style.height = cellPx + 'px';
      el.textContent = n - r;
      D.rowLabels.appendChild(el);
    }
  },

  clear() {
    const n = State.N;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = this.cells[r][c];
        cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        cell.innerHTML = '';
      }
    }
  },

  clearHighlights() {
    const n = State.N;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = this.cells[r][c];
        cell.classList.remove('checking','safe','unsafe','attacked','queen-row','queen-col','solution');
      }
    }
  },

  placeQueen(row, col) {
    const cell = this.cells[row][col];
    cell.innerHTML = '';
    const q = document.createElement('span');
    q.className = 'queen';
    q.textContent = CFG.QUEEN;
    cell.appendChild(q);
    State.queens[row] = col;
  },

  removeQueen(row) {
    const col = State.queens[row];
    if (col === undefined || col === -1) return;
    const cell = this.cells[row][col];
    const q = cell.querySelector('.queen');
    if (q) {
      q.classList.add('removing');
      setTimeout(() => { if (cell.contains(q)) cell.removeChild(q); }, 240);
    }
    State.queens[row] = -1;
  },

  highlightCell(row, col, type) {
    if (row < 0 || col < 0 || row >= State.N || col >= State.N) return;
    const cell = this.cells[row][col];
    cell.classList.remove('checking','safe','unsafe','attacked','queen-row','queen-col');
    if (type) cell.classList.add(type);
  },

  highlightRow(row) {
    for (let c = 0; c < State.N; c++) {
      const cell = this.cells[row][c];
      if (!cell.querySelector('.queen')) cell.classList.add('queen-row');
    }
  },

  highlightAttacks(row, col) {
    const n = State.N;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = this.cells[r][c];
        if (cell.querySelector('.queen')) continue;
        // Same col
        if (c === col) { cell.classList.add('attacked'); continue; }
        // Diagonals
        if (Math.abs(r - row) === Math.abs(c - col)) cell.classList.add('attacked');
      }
    }
  },

  showSolution(queens) {
    this.clear();
    const n = State.N;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        this.cells[r][c].classList.add('solution');
      }
      const q = document.createElement('span');
      q.className = 'queen solution-queen';
      q.textContent = CFG.QUEEN;
      this.cells[r][queens[r]].appendChild(q);
    }
  },
};

/* ─────────────────────────────────────────────
   SLEEP / PAUSE HELPERS
───────────────────────────────────────────── */
function sleep(ms) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    // Store so we can clear on abort
    State._sleepTimer = timer;
  });
}

async function tick(fast = false) {
  if (State.abort) throw new Error('ABORT');
  while (State.paused && !State.stepMode && !State.abort) {
    await sleep(50);
  }
  if (State.abort) throw new Error('ABORT');
  if (State.stepMode) {
    State.paused = true;
    State.stepMode = false;
    await new Promise(resolve => { State.stepResolve = resolve; });
    if (State.abort) throw new Error('ABORT');
  }
  if (!fast) await sleep(CFG.SPEED_MAP[State.speed] || 300);
}

/* ─────────────────────────────────────────────
   ALGORITHM MODULE
───────────────────────────────────────────── */
const Algorithm = {

  isSafe(queens, row, col) {
    for (let r = 0; r < row; r++) {
      if (queens[r] === col) return false;
      if (Math.abs(queens[r] - col) === Math.abs(r - row)) return false;
    }
    return true;
  },

  async solve() {
    const n = State.N;
    State.queens = new Array(n).fill(-1);
    State.steps = 0;
    State.backtracks = 0;
    State.solutions = [];
    State.solIdx = 0;
    State.abort = false;

    UI.updateStats();
    UI.setStatus('running', 'Solving…');

    try {
      await this._backtrack(0);
    } catch (e) {
      if (e.message !== 'ABORT') throw e;
    }

    if (!State.abort) {
      if (State.solutions.length > 0) {
        UI.setStatus('done', `✓ Found ${State.solutions.length} solution${State.solutions.length > 1 ? 's' : ''}`);
        Board.showSolution(State.solutions[0]);
        State.solIdx = 0;
        UI.updateSolNav();
        UI.showSuccess();
      } else {
        UI.setStatus('done', 'No solution exists for N=' + n);
      }
    }

    State.running = false;
    UI.setControlState('done');
  },

  async _backtrack(row) {
    const n = State.N;
    if (row === n) {
      // Found a solution
      State.solutions.push([...State.queens]);
      UI.updateSolCounter();
      UI.addTrace('solve', `♛ Solution #${State.solutions.length} found!`);

      // Flash board
      Board.clearHighlights();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          Board.cells[r][c].classList.add('solution');
        }
      }
      await tick(true);
      await sleep(CFG.SPEED_MAP[State.speed] * 2);
      if (State.abort) throw new Error('ABORT');

      // Remove solution highlight before continuing
      Board.clearHighlights();
      return;
    }

    Board.highlightRow(row);
    UI.updateStat('stRow', row + 1);

    for (let col = 0; col < n; col++) {
      if (State.abort) throw new Error('ABORT');
      State.steps++;
      UI.updateStat('stSteps', State.steps);
      UI.updateStat('stCol', col + 1);

      // Highlight checking
      Board.clearHighlights();
      Board.highlightRow(row);
      Board.highlightCell(row, col, 'checking');
      UI.setStatus('running', `Checking row ${row+1}, col ${col+1}`);

      await tick();

      if (this.isSafe(State.queens, row, col)) {
        // Safe — place queen
        Board.highlightCell(row, col, 'safe');
        Board.highlightAttacks(row, col);
        UI.addTrace('place', `Place queen @ row ${row+1}, col ${col+1}`);
        Board.placeQueen(row, col);
        UI.updateStat('stQueens', row + 1);
        await tick();

        await this._backtrack(row + 1);
        if (State.abort) throw new Error('ABORT');

        // Backtrack
        State.backtracks++;
        UI.updateStat('stBack', State.backtracks);
        UI.addTrace('back', `Backtrack from row ${row+1}, col ${col+1}`);
        UI.setStatus('back', `Backtracking from row ${row+1}…`);

        Board.clearHighlights();
        Board.highlightRow(row);
        Board.highlightCell(row, col, 'unsafe');
        Board.removeQueen(row);
        UI.updateStat('stQueens', row);
        await tick();

      } else {
        // Unsafe
        Board.highlightCell(row, col, 'unsafe');
        UI.addTrace('check', `Unsafe @ row ${row+1}, col ${col+1}`);
        await tick();
      }
    }

    Board.clearHighlights();
    UI.updateStat('stRow', row + 1);
    UI.updateStat('stCol', '—');
  },
};

/* ─────────────────────────────────────────────
   UI MODULE
───────────────────────────────────────────── */
const UI = {

  setStatus(type, text) {
    D.statusDot.className = `status-dot ${type}`;
    D.statusText.textContent = text;
  },

  setControlState(state) {
    // states: 'idle' | 'running' | 'paused' | 'done'
    const isRunning = state === 'running' || state === 'paused';
    D.startBtn.disabled  = isRunning;
    D.pauseBtn.disabled  = state === 'idle' || state === 'done';
    D.stepBtn.disabled   = state === 'idle' || state === 'done';
    D.nDec.disabled      = isRunning;
    D.nInc.disabled      = isRunning;
    D.speedSlider.disabled = false;
    if (state === 'paused') {
      D.pauseBtn.innerHTML = '<span class="btn-icon">▶</span> Resume';
    } else {
      D.pauseBtn.innerHTML = '<span class="btn-icon">⏸</span> Pause';
    }
  },

  updateStats() {
    D.stRow.textContent    = '—';
    D.stCol.textContent    = '—';
    D.stSteps.textContent  = State.steps;
    D.stBack.textContent   = State.backtracks;
    D.stQueens.textContent = 0;
    D.solFound.textContent = State.solutions.length;
    D.solIdx.textContent   = '— / —';
  },

  updateStat(id, val) {
    D[id].textContent = val;
  },

  updateSolCounter() {
    D.solFound.textContent = State.solutions.length;
    D.solIdx.textContent = `${State.solIdx + 1} / ${State.solutions.length}`;
    D.prevSol.disabled = State.solIdx <= 0;
    D.nextSol.disabled = State.solIdx >= State.solutions.length - 1;
  },

  updateSolNav() {
    D.solIdx.textContent = `${State.solIdx + 1} / ${State.solutions.length}`;
    D.prevSol.disabled = State.solIdx <= 0;
    D.nextSol.disabled = State.solIdx >= State.solutions.length - 1;
    const known = CFG.KNOWN_SOLUTIONS[State.N];
    if (known) {
      D.totalHint.textContent = `Total known: ${known.toLocaleString()}`;
    }
  },

  addTrace(type, msg) {
    const el = document.createElement('div');
    el.className = `trace-entry ${type}`;
    el.textContent = msg;
    D.traceLog.insertBefore(el, D.traceLog.firstChild);
    // Limit entries
    while (D.traceLog.children.length > CFG.MAX_TRACE) {
      D.traceLog.removeChild(D.traceLog.lastChild);
    }
  },

  showSuccess() {
    const sol = State.solutions.length;
    D.successMsg.textContent = `Solution #${sol > 1 ? '1 of ' + sol : '1'} displayed on board`;
    D.successStats.innerHTML = `
      <div class="success-stat"><div class="success-stat-val">${State.steps}</div><div class="success-stat-lbl">Steps</div></div>
      <div class="success-stat"><div class="success-stat-val">${State.backtracks}</div><div class="success-stat-lbl">Backtracks</div></div>
      <div class="success-stat"><div class="success-stat-val">${sol}</div><div class="success-stat-lbl">Solutions</div></div>
    `;
    D.successOverlay.classList.add('active');
  },

  hideSuccess() {
    D.successOverlay.classList.remove('active');
  },

  updateNDisplay() {
    D.nValue.textContent = State.N;
    D.nHint.textContent  = State.N;
    D.nDec.disabled      = State.N <= CFG.N_MIN;
    D.nInc.disabled      = State.N >= CFG.N_MAX;
  },

  updateSpeedDisplay() {
    const ms = CFG.SPEED_MAP[State.speed];
    D.speedDisplay.textContent = ms >= 1000 ? (ms/1000).toFixed(1)+'s' : ms+'ms';
    // Fill bar
    const pct = ((State.speed - 1) / 9) * 100;
    D.sliderFill.style.width = pct + '%';
  },

  buildRefGrid() {
    D.refGrid.innerHTML = '';
    Object.entries(CFG.KNOWN_SOLUTIONS).forEach(([n, v]) => {
      const el = document.createElement('div');
      el.className = 'ref-item';
      el.innerHTML = `<div class="ref-n">N=${n}</div><div class="ref-v">${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}</div>`;
      D.refGrid.appendChild(el);
    });
  },
};

/* ─────────────────────────────────────────────
   AMBIENT CANVAS (subtle particles)
───────────────────────────────────────────── */
const AmbientCanvas = (() => {
  const canvas = D.bgCanvas;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size  = .4 + Math.random() * 1.2;
      this.alpha = .04 + Math.random() * .1;
      this.vx    = (Math.random() - .5) * .15;
      this.vy    = (Math.random() - .5) * .12;
      this.life  = Math.random();
      this.decay = .002 + Math.random() * .003;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.life -= this.decay;
      if (this.life <= 0) Object.assign(this, new Particle());
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha * this.life;
      ctx.fillStyle = '#f0a500';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    particles = Array.from({ length: 80 }, () => new Particle());
    loop();
    window.addEventListener('resize', resize);
  }

  return { init };
})();

/* ─────────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────────── */

// N controls
D.nDec.addEventListener('click', () => {
  if (State.N > CFG.N_MIN) {
    State.N--;
    UI.updateNDisplay();
    resetAll();
  }
});
D.nInc.addEventListener('click', () => {
  if (State.N < CFG.N_MAX) {
    State.N++;
    UI.updateNDisplay();
    resetAll();
  }
});

// Start
D.startBtn.addEventListener('click', async () => {
  if (State.running) return;
  State.running = true;
  State.paused  = false;
  State.abort   = false;
  D.traceLog.innerHTML = '';
  Board.build();
  UI.setControlState('running');
  UI.setStatus('running', 'Starting…');
  UI.updateStats();
  await Algorithm.solve();
});

// Pause / Resume
D.pauseBtn.addEventListener('click', () => {
  if (!State.running) return;
  State.paused = !State.paused;
  UI.setControlState(State.paused ? 'paused' : 'running');
  UI.setStatus(State.paused ? 'paused' : 'running', State.paused ? 'Paused' : 'Resuming…');
  if (!State.paused && State.stepResolve) {
    // If was in step-wait, keep paused until step pressed
  }
});

// Step
D.stepBtn.addEventListener('click', () => {
  if (!State.running) return;
  if (State.paused) {
    State.stepMode = true;
    if (State.stepResolve) {
      const r = State.stepResolve;
      State.stepResolve = null;
      r();
    }
  }
});

// Reset
D.resetBtn.addEventListener('click', resetAll);

// Speed
D.speedSlider.addEventListener('input', () => {
  State.speed = +D.speedSlider.value;
  UI.updateSpeedDisplay();
});

// Solution navigation
D.prevSol.addEventListener('click', () => {
  if (State.solIdx > 0) {
    State.solIdx--;
    Board.showSolution(State.solutions[State.solIdx]);
    UI.updateSolNav();
  }
});
D.nextSol.addEventListener('click', () => {
  if (State.solIdx < State.solutions.length - 1) {
    State.solIdx++;
    Board.showSolution(State.solutions[State.solIdx]);
    UI.updateSolNav();
  }
});

// Success overlay actions
D.nextSolBtn.addEventListener('click', () => {
  UI.hideSuccess();
  if (State.solutions.length > 1) {
    State.solIdx = Math.min(State.solIdx + 1, State.solutions.length - 1);
    Board.showSolution(State.solutions[State.solIdx]);
    UI.updateSolNav();
  }
});
D.dismissBtn.addEventListener('click', () => UI.hideSuccess());
D.successOverlay.addEventListener('click', e => {
  if (e.target === D.successOverlay) UI.hideSuccess();
});

// Trace clear
D.clearTrace.addEventListener('click', () => { D.traceLog.innerHTML = ''; });

// Theme toggle
D.themeBtn.addEventListener('click', () => {
  State.theme = State.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = State.theme;
  D.themeIcon.textContent = State.theme === 'dark' ? '◑' : '◐';
  try { localStorage.setItem('nq_theme', State.theme); } catch {}
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!State.running) D.startBtn.click();
    else D.pauseBtn.click();
  }
  if (e.code === 'KeyR') D.resetBtn.click();
  if (e.code === 'KeyS' && State.running && State.paused) D.stepBtn.click();
  if (e.code === 'ArrowLeft') D.prevSol.click();
  if (e.code === 'ArrowRight') D.nextSol.click();
});

/* ─────────────────────────────────────────────
   RESET
───────────────────────────────────────────── */
function resetAll() {
  State.abort     = true;
  State.running   = false;
  State.paused    = false;
  State.stepMode  = false;
  if (State.stepResolve) { State.stepResolve(); State.stepResolve = null; }
  if (State._sleepTimer)  clearTimeout(State._sleepTimer);

  State.queens     = [];
  State.steps      = 0;
  State.backtracks = 0;
  State.solutions  = [];
  State.solIdx     = 0;

  Board.build();
  UI.updateStats();
  UI.setControlState('idle');
  UI.setStatus('idle', 'Ready — select N and press Start');
  UI.hideSuccess();
  D.traceLog.innerHTML = '';
  D.totalHint.textContent = '';
  D.prevSol.disabled = true;
  D.nextSol.disabled = true;
  D.solIdx.textContent = '— / —';

  setTimeout(() => { State.abort = false; }, 100);
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
(function init() {
  // Restore theme
  try {
    const t = localStorage.getItem('nq_theme');
    if (t) {
      State.theme = t;
      document.documentElement.dataset.theme = t;
      D.themeIcon.textContent = t === 'dark' ? '◑' : '◐';
    }
  } catch {}

  // Build initial board
  Board.build();

  // UI init
  UI.updateNDisplay();
  UI.updateSpeedDisplay();
  UI.setControlState('idle');
  UI.setStatus('idle', 'Ready — select N and press Start');
  UI.buildRefGrid();

  // Ambient background
  AmbientCanvas.init();

  // Responsive rebuild
  window.addEventListener('resize', () => {
    if (!State.running) Board.build();
  });

  // Show keyboard hint
  setTimeout(() => {
    UI.setStatus('idle', 'Press Space to start · R to reset · S to step');
    setTimeout(() => {
      UI.setStatus('idle', 'Ready — select N and press Start');
    }, 3000);
  }, 1000);
})();
