// Loop utama, manajemen status layar, pemrosesan aksi input, dan kait deterministik
// window.__lumen untuk pengujian serta pengambilan tangkapan layar otomatis.

import { createAudio } from './audio.js';
import {
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_START,
  ACTION_UPGRADE_1,
  ACTION_UPGRADE_2,
  createInput,
} from './input.js';
import { createRenderer } from './render.js';
import {
  SCREEN_LOSE,
  SCREEN_PAUSE,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  SCREEN_WIN,
  drawUI,
  hitTestUI,
} from './ui.js';
import { rollUpgradeChoices } from './upgrades.js';
import { MAX_WAVE } from './waves.js';
import {
  CORE_X,
  CORE_Y,
  EVENT_BRACE,
  EVENT_CHAIN,
  EVENT_DEFLECT,
  EVENT_HIT,
  EVENT_LOSE,
  EVENT_UPGRADE,
  EVENT_WAVE,
  EVENT_WIN,
  createWorld,
} from './world.js';

const BEST_STORAGE_KEY = 'lumen_ward_best_v1';
const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const initialSeed = Number.isInteger(seedParam) ? seedParam : 20261118;

const audio = createAudio();
const world = createWorld(initialSeed);
const input = createInput(canvas);
const renderer = createRenderer(canvas);

let screen = SCREEN_TITLE;
let accumulator = 0;
let lastTime = performance.now();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_STORAGE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(val) {
  try {
    window.localStorage.setItem(BEST_STORAGE_KEY, String(val));
  } catch {
    // Abaikan jika penyimpanan lokal dibatasi
  }
}

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

world.state.bestScore = readBest();
// Siapkan adegan latar di layar judul agar langsung tampak menarik sejak frame pertama
world.jumpToWave(2);
world.state.score = 0;

function paintNow() {
  renderer.beginFrame(world.state);
  drawUI(renderer.ctx, world.state, screen, audio.isMuted());
}

function startNewGame() {
  const best = Math.max(world.state.bestScore, readBest());
  world.reset(initialSeed);
  world.state.bestScore = best;
  world.jumpToWave(1);
  world.state.score = 0;
  world.state.chain = 1;
  world.state.chainTimer = 0;
  world.state.popups.length = 0;
  accumulator = 0;
  screen = SCREEN_PLAY;
  audio.gelombangBaru();
  announce('Permainan dimulai. Gelombang 1 dari 12. Integritas inti 3.');
  paintNow();
}

function pickUpgrade(index) {
  if (!world.state.upgradeChoices || world.state.upgradeChoices.length === 0) {
    world.state.upgradeChoices = rollUpgradeChoices(world.state.wave, world.state.upgrades);
  }
  const idx = index === 1 ? 1 : 0;
  world.advanceAfterUpgrade(idx);
  audio.pilihNaik();
  screen = SCREEN_PLAY;
  announce(`Peningkatan dipilih. Memasuki Gelombang ${world.state.wave}.`);
  paintNow();
}

function triggerWin() {
  screen = SCREEN_WIN;
  if (world.state.score > world.state.bestScore) {
    world.state.bestScore = world.state.score;
    saveBest(world.state.bestScore);
  }
  audio.menang();
  announce(`Menang! Bertahan hingga gelombang 12. Skor akhir ${world.state.score}.`);
  paintNow();
}

function triggerLose() {
  screen = SCREEN_LOSE;
  if (world.state.score > world.state.bestScore) {
    world.state.bestScore = world.state.score;
    saveBest(world.state.bestScore);
  }
  audio.kalah();
  announce(`Kalah. Inti cahaya padam. Skor akhir ${world.state.score}.`);
  paintNow();
}

function handleEvents(events) {
  if (events & EVENT_BRACE) audio.tahan();
  if (events & EVENT_DEFLECT) audio.pantul(world.state.bracing);
  if (events & EVENT_CHAIN) audio.rantai(world.state.chain);
  if (events & EVENT_WAVE) audio.gelombangBaru();
  if (events & EVENT_HIT) {
    audio.kena();
    announce(`Inti terkena! Integritas tersisa ${world.state.integrity}.`);
  }
  if (events & EVENT_LOSE) {
    triggerLose();
  } else if (events & EVENT_WIN) {
    triggerWin();
  } else if (events & EVENT_UPGRADE) {
    screen = SCREEN_UPGRADE;
    audio.gelombangBaru();
    announce('Gelombang selesai. Pilih 1 dari 2 peningkatan dengan tombol 1 atau 2.');
  }
}

function processInput() {
  const actions = input.takeActions();
  const click = input.takeClick();

  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    announce(muted ? 'Suara dimatikan.' : 'Suara dinyalakan.');
  }

  if (actions & ACTION_RESTART) {
    startNewGame();
    return;
  }

  if (screen === SCREEN_TITLE) {
    if (actions & ACTION_START) {
      startNewGame();
      return;
    }
  } else if (screen === SCREEN_PLAY) {
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSE;
      announce('Permainan dijeda.');
      return;
    }
  } else if (screen === SCREEN_PAUSE) {
    if (actions & (ACTION_PAUSE | ACTION_START)) {
      screen = SCREEN_PLAY;
      announce('Permainan dilanjutkan.');
      return;
    }
  } else if (screen === SCREEN_UPGRADE) {
    if (actions & ACTION_UPGRADE_1) {
      pickUpgrade(0);
      return;
    }
    if (actions & ACTION_UPGRADE_2) {
      pickUpgrade(1);
      return;
    }
  } else if (screen === SCREEN_LOSE || screen === SCREEN_WIN) {
    if (actions & ACTION_START) {
      startNewGame();
      return;
    }
  }

  if (click) {
    const hit = hitTestUI(screen, click);
    if (!hit) return;
    if (hit.type === 'start' || hit.type === 'restart') {
      startNewGame();
    } else if (hit.type === 'resume') {
      screen = SCREEN_PLAY;
      announce('Permainan dilanjutkan.');
    } else if (hit.type === 'upgrade') {
      pickUpgrade(hit.index);
    }
  }
}

function stepSimulation() {
  if (screen === SCREEN_TITLE) {
    // Demo latar belakang otomatis di layar judul; jaga integritas tetap utuh
    world.step(STEP, { brace: false }, true);
    if (world.state.integrity < 3) world.state.integrity = 3;
    world.state.score = 0;
    return;
  }
  if (screen === SCREEN_PLAY) {
    const inp = input.getState();
    const autoMode = inp.dir === 0 && typeof inp.pointerAngle !== 'number';
    const events = world.step(STEP, inp, autoMode);
    if (world.state.score > world.state.bestScore) {
      world.state.bestScore = world.state.score;
      saveBest(world.state.bestScore);
    }
    handleEvents(events);
  }
}

// Kait deterministik wajib: window.__lumen
window.__lumen = {
  mulai() {
    startNewGame();
    world.jumpToWave(1);
    world.state.score = 300;
    paintNow();
    return world.state;
  },
  keGelombang(n) {
    const targetWave = Math.max(1, Math.min(MAX_WAVE, Math.floor(Number(n) || 1)));
    screen = SCREEN_PLAY;
    world.jumpToWave(targetWave);
    if (world.state.score < targetWave * 450) {
      world.state.score = targetWave * 650;
      world.state.bestScore = Math.max(world.state.bestScore, world.state.score);
    }
    paintNow();
    return world.state;
  },
  pilihNaik(i) {
    pickUpgrade(Number(i) || 0);
    world.jumpToWave(world.state.wave);
    paintNow();
    return world.state;
  },
  keadaan(nama) {
    const key = String(nama || '').toLowerCase().trim();
    if (key === 'judul' || key === 'title' || key === 'start') {
      world.jumpToWave(2);
      world.state.score = 0;
      screen = SCREEN_TITLE;
    } else if (key === 'main' || key === 'play') {
      if (world.state.shards.length === 0) world.jumpToWave(world.state.wave || 3);
      if (world.state.score === 0) world.state.score = 1850;
      screen = SCREEN_PLAY;
    } else if (key === 'naik' || key === 'upgrade') {
      const w = world.state.wave % 3 === 0 ? world.state.wave : 3;
      world.jumpToWave(w);
      world.state.upgradeChoices = rollUpgradeChoices(w, world.state.upgrades);
      if (world.state.score < 2400) world.state.score = 2450;
      world.state.bestScore = Math.max(world.state.bestScore, world.state.score);
      screen = SCREEN_UPGRADE;
    } else if (key === 'jeda' || key === 'pause' || key === 'paused') {
      if (world.state.shards.length === 0) world.jumpToWave(world.state.wave || 4);
      if (world.state.score < 1200) world.state.score = 3100;
      world.state.bestScore = Math.max(world.state.bestScore, world.state.score);
      screen = SCREEN_PAUSE;
    } else if (key === 'kalah' || key === 'lose' || key === 'over') {
      world.jumpToWave(Math.max(5, world.state.wave));
      world.state.integrity = 0;
      world.state.coreFlash = 0.8;
      world.addParticles(CORE_X, CORE_Y, 26, '#ff5a5f', 200, 5);
      if (world.state.score < 3800) world.state.score = 4650;
      world.state.bestScore = Math.max(world.state.bestScore, world.state.score);
      screen = SCREEN_LOSE;
    } else if (key === 'menang' || key === 'win') {
      world.jumpToWave(MAX_WAVE);
      world.state.wave = MAX_WAVE;
      world.state.integrity = Math.max(2, world.state.integrity);
      world.addRing(CORE_X, CORE_Y, 220, '#ffd166', 0.6);
      world.addParticles(CORE_X, CORE_Y, 28, '#ffd166', 210, 5);
      if (world.state.score < 12000) world.state.score = 15400;
      world.state.bestScore = Math.max(world.state.bestScore, world.state.score);
      if (world.state.upgrades.length === 0) {
        world.state.upgrades = ['Busur Surya', 'Pantulan Pencari', 'Prisma Ganda'];
      }
      screen = SCREEN_WIN;
    }
    paintNow();
    return screen;
  },
  skor(n) {
    const val = Math.max(0, Math.floor(Number(n) || 0));
    world.state.score = val;
    if (val > world.state.bestScore) {
      world.state.bestScore = val;
      saveBest(val);
    }
    paintNow();
    return val;
  },
  matikanAudio() {
    audio.matikan();
    paintNow();
    return true;
  },
};

function runShotMode(shotName) {
  audio.matikan();
  if (shotName === 'play') {
    window.__lumen.keGelombang(4);
    window.__lumen.skor(3450);
  } else if (shotName === 'upgrade' || shotName === 'naik') {
    window.__lumen.keadaan('naik');
  } else if (shotName === 'end' || shotName === 'over' || shotName === 'kalah') {
    window.__lumen.keadaan('kalah');
  } else if (shotName === 'win' || shotName === 'menang') {
    window.__lumen.keadaan('menang');
  } else {
    window.__lumen.keadaan('judul');
  }
  let frames = 0;
  function paintShot() {
    paintNow();
    frames += 1;
    if (frames < 2) window.requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  window.requestAnimationFrame(paintShot);
}

function loop(now) {
  window.requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, MAX_FRAME);
  lastTime = now;
  processInput();

  if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
    accumulator += dt;
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      stepSimulation();
      accumulator -= STEP;
    }
  } else {
    accumulator = 0;
  }

  paintNow();
}

if (shotParam) {
  runShotMode(shotParam);
} else {
  paintNow();
  window.requestAnimationFrame(loop);
}
