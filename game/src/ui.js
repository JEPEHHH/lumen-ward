// Penggambaran HUD dan seluruh layar antarmuka LUMEN WARD:
// judul, sedang bermain, pilih peningkatan (2 kartu), jeda, kalah, dan menang,
// beserta deteksi klik tombol interaktif.

import { CORE_X, FIELD_HEIGHT, FIELD_WIDTH } from './world.js';
import { MAX_WAVE } from './waves.js';
import { PALETTE } from './render.js';

export const SCREEN_TITLE = 'judul';
export const SCREEN_PLAY = 'main';
export const SCREEN_UPGRADE = 'naik';
export const SCREEN_PAUSE = 'jeda';
export const SCREEN_LOSE = 'kalah';
export const SCREEN_WIN = 'menang';

const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Kotak tombol interaktif dalam koordinat 1280x720
const BTN_START = { x: 450, y: 525, w: 380, h: 58 };
const BTN_RESTART_END = { x: 450, y: 500, w: 380, h: 58 };
const BTN_PAUSE_RESUME = { x: 450, y: 425, w: 380, h: 52 };
const BTN_PAUSE_RESTART = { x: 450, y: 492, w: 380, h: 52 };
const CARD_LEFT = { x: 230, y: 230, w: 385, h: 275 };
const CARD_RIGHT = { x: 665, y: 230, w: 385, h: 275 };
const BTN_UPGRADE_RESTART = { x: 520, y: 545, w: 240, h: 42 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function inside(pt, box) {
  return pt && pt.x >= box.x && pt.x <= box.x + box.w && pt.y >= box.y && pt.y <= box.y + box.h;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[i];
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

export function drawUI(ctx, state, screen, isMuted) {
  // Selalu gambar HUD di latar atas saat bermain maupun saat layar overlay tampil
  drawHud(ctx, state, isMuted);

  if (screen === SCREEN_TITLE) {
    drawTitleScreen(ctx, state);
  } else if (screen === SCREEN_UPGRADE) {
    drawUpgradeScreen(ctx, state);
  } else if (screen === SCREEN_PAUSE) {
    drawPauseScreen(ctx, state);
  } else if (screen === SCREEN_LOSE) {
    drawEndScreen(ctx, state, false);
  } else if (screen === SCREEN_WIN) {
    drawEndScreen(ctx, state, true);
  }
}

function drawHud(ctx, state, isMuted) {
  ctx.save();

  // Panel Kiri Atas: SKOR & RANTAI
  roundRect(ctx, 22, 18, 290, 92, 12);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('SKOR CAHAYA', 38, 28);

  ctx.font = `800 30px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(String(state.score).padStart(6, '0'), 38, 45);

  // Indikator Pengali Rantai (Chain Multiplier)
  const chainActive = state.chain > 1 && state.chainTimer > 0;
  ctx.textAlign = 'right';
  ctx.font = `800 22px ${FONT_FAMILY}`;
  ctx.fillStyle = chainActive ? PALETTE.honeyBright : PALETTE.mutedIvory;
  ctx.fillText(`RANTAI x${state.chain}`, 296, 32);

  // Bar waktu rantai
  const chainRatio = chainActive ? Math.min(1, state.chainTimer / 3.4) : 0;
  roundRect(ctx, 180, 64, 116, 10, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  if (chainRatio > 0) {
    roundRect(ctx, 180, 64, Math.max(8, 116 * chainRatio), 10, 5);
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.fill();
  }

  ctx.font = `600 12px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(`TERBAIK: ${state.bestScore}`, 296, 82);

  // Panel Tengah Atas: GELOMBANG
  roundRect(ctx, CORE_X - 145, 18, 290, 74, 12);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.45)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = `800 22px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`GELOMBANG ${state.wave} / ${MAX_WAVE}`, CORE_X, 28);

  ctx.font = `600 14px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(state.waveTitle || 'Jaga Inti Cahaya', CORE_X, 58);

  // Panel Kanan Atas: INTEGRITAS INTI & STAMINA PERISAI
  roundRect(ctx, FIELD_WIDTH - 332, 18, 310, 92, 12);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.45)';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('INTEGRITAS INTI', FIELD_WIDTH - 316, 28);

  const maxLives = state.maxIntegrity || 3;
  for (let i = 0; i < maxLives; i += 1) {
    const gx = FIELD_WIDTH - 165 + i * 28;
    const gy = 35;
    const alive = i < state.integrity;
    ctx.fillStyle = alive ? PALETTE.honeyBright : 'rgba(255, 90, 95, 0.22)';
    ctx.strokeStyle = alive ? PALETTE.ivory : '#ff5a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 8);
    ctx.lineTo(gx + 9, gy);
    ctx.lineTo(gx, gy + 8);
    ctx.lineTo(gx - 9, gy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = 'right';
  ctx.font = `700 14px ${FONT_FAMILY}`;
  ctx.fillStyle = state.integrity > 1 ? PALETTE.ivory : '#ff5a5f';
  ctx.fillText(`${state.integrity}/${maxLives}`, FIELD_WIDTH - 36, 28);

  // Bar Stamina Perisai
  ctx.textAlign = 'left';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('STAMINA PERISAI', FIELD_WIDTH - 316, 64);

  const stamRatio = Math.max(0, Math.min(1, state.stamina / state.maxStamina));
  roundRect(ctx, FIELD_WIDTH - 316, 84, 195, 12, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  if (stamRatio > 0) {
    roundRect(ctx, FIELD_WIDTH - 316, 84, Math.max(8, 195 * stamRatio), 12, 6);
    ctx.fillStyle = state.staminaExhausted
      ? '#ff5a5f'
      : state.bracing
      ? PALETTE.ivory
      : PALETTE.honeyBright;
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.font = `700 12px ${FONT_FAMILY}`;
  ctx.fillStyle = state.bracing ? PALETTE.honeyBright : PALETTE.ivory;
  const stamText = state.staminaExhausted
    ? 'PULIH...'
    : state.bracing
    ? 'TAHAN!'
    : `${Math.round(state.stamina)}%`;
  ctx.fillText(stamText, FIELD_WIDTH - 36, 82);

  // Baris Petunjuk Kendali Singkat di Bawah
  roundRect(ctx, 190, FIELD_HEIGHT - 44, 900, 32, 8);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  const audioLabel = isMuted ? 'MATI' : 'NYALA';
  ctx.fillText(
    `[Mouse / ← →] Putar Perisai   •   [Spasi] Tahan Perisai   •   [P] Jeda   •   [R] Ulang   •   [M] Suara: ${audioLabel}`,
    CORE_X,
    FIELD_HEIGHT - 28
  );

  ctx.restore();
}

function drawButton(ctx, box, label, primary = true) {
  roundRect(ctx, box.x, box.y, box.w, box.h, 10);
  ctx.fillStyle = primary ? PALETTE.honey : 'rgba(25, 37, 74, 0.95)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.ivory;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = primary ? '#090d1c' : PALETTE.ivory;
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2);
}

function drawTitleScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.65)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 240, 125, 800, 485, 18);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 54px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText('LUMEN WARD', CORE_X, 155);

  ctx.font = `700 18px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText('PENJAGA INTI CAHAYA — PANTULAN BERANTAI', CORE_X, 220);

  const rules = [
    '1. Putar perisai mengelilingi Inti Cahaya dengan Mouse atau tombol panah ← → (A / D).',
    '2. Pantulkan serpihan gelap agar menabrak serpihan lain dan memicu SKOR BERANTAI!',
    '3. Tahan SPASI untuk memperlebar & memperkuat perisai (menggunakan Stamina).',
    '4. Pilih 1 dari 2 Peningkatan tiap 3 gelombang. Bertahan hingga Gelombang 12 untuk MENANG!',
    '5. Inti memiliki 3 nyawa Integritas. Jika terkena 3 kali, cahaya padam (KALAH).',
  ];

  ctx.font = `500 16.5px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  for (let i = 0; i < rules.length; i += 1) {
    ctx.fillText(rules[i], CORE_X, 272 + i * 36);
  }

  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(
    `Skor Tertinggi: ${state.bestScore}   •   Tombol Cepat: [P] Jeda  [R] Ulang  [M] Bisu`,
    CORE_X,
    472
  );

  drawButton(ctx, BTN_START, 'MULAI JAGA INTI (KLIK / ENTER)', true);
  ctx.restore();
}

function drawUpgradeScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.72)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 180, 120, 920, 485, 18);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 36px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`GELOMBANG ${state.wave} SELESAI — PILIH PENINGKATAN`, CORE_X, 145);

  ctx.font = `600 16px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(
    `Skor Saat Ini: ${state.score}   •   Pilih 1 dari 2 kekuatan di bawah (Tekan [1] / [2] atau Klik Kartu)`,
    CORE_X,
    190
  );

  const choices = state.upgradeChoices || [];
  const cards = [CARD_LEFT, CARD_RIGHT];

  for (let i = 0; i < 2; i += 1) {
    const up = choices[i];
    const box = cards[i];
    if (!up) continue;

    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fillStyle = 'rgba(22, 34, 68, 0.96)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.honeyBright;
    ctx.lineWidth = 2;
    ctx.stroke();

    const cx = box.x + box.w / 2;
    ctx.font = `800 28px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.fillText(up.ikon, cx, box.y + 24);

    ctx.font = `800 24px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.ivory;
    ctx.fillText(up.nama, cx, box.y + 68);

    ctx.font = `700 16px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.fillText(up.ringkas, cx, box.y + 104);

    ctx.font = `500 15px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.mutedIvory;
    wrapText(ctx, up.deskripsi, cx, box.y + 142, box.w - 44, 22);

    const btn = { x: box.x + 42, y: box.y + box.h - 62, w: box.w - 84, h: 44 };
    drawButton(ctx, btn, `PILIH [${i + 1}] — ${up.nama.toUpperCase()}`, true);
  }

  drawButton(ctx, BTN_UPGRADE_RESTART, 'MULAI ULANG (R)', false);
  ctx.restore();
}

function drawPauseScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.72)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 320, 165, 640, 415, 18);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 44px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText('PERMAINAN DIJEDA', CORE_X, 195);

  ctx.font = `700 22px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(`Skor Saat Ini: ${state.score}   •   Gelombang: ${state.wave} / ${MAX_WAVE}`, CORE_X, 265);

  ctx.font = `600 17px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(
    `Integritas Inti: ${state.integrity}/${state.maxIntegrity}   •   Rantai Tertinggi: x${state.maxChain}`,
    CORE_X,
    308
  );

  const upText =
    state.upgrades.length > 0
      ? `Peningkatan Aktif: ${state.upgrades.join(', ')}`
      : 'Peningkatan Aktif: Belum ada (pilih tiap 3 gelombang)';
  ctx.font = `600 15px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(upText, CORE_X, 355);

  drawButton(ctx, BTN_PAUSE_RESUME, 'LANJUTKAN BERMAIN (P)', true);
  drawButton(ctx, BTN_PAUSE_RESTART, 'MULAI ULANG (R)', false);
  ctx.restore();
}

function drawEndScreen(ctx, state, isWin) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.76)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 290, 145, 700, 445, 18);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = isWin ? PALETTE.honeyBright : '#ff5a5f';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 46px ${FONT_FAMILY}`;
  ctx.fillStyle = isWin ? PALETTE.honeyBright : '#ff5a5f';
  ctx.fillText(isWin ? 'CAHAYA ABADI — MENANG!' : 'INTI PADAM — KALAH', CORE_X, 175);

  ctx.font = `600 18px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(
    isWin
      ? 'Selamat! Kamu berhasil menjaga Inti Cahaya melewati seluruh 12 Gelombang!'
      : 'Serpihan gelap menghancurkan Inti Cahaya. Bangkit dan pantulkan kembali!',
    CORE_X,
    240
  );

  // Kotak ringkasan skor akhir
  roundRect(ctx, 370, 285, 540, 185, 12);
  ctx.fillStyle = 'rgba(19, 29, 59, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `800 34px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`SKOR AKHIR: ${state.score}`, CORE_X, 305);

  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(`Skor Tertinggi: ${state.bestScore}`, CORE_X, 355);

  ctx.font = `600 17px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(
    `Gelombang Tercapai: ${state.wave} / ${MAX_WAVE}   •   Rantai Maksimum: x${state.maxChain}`,
    CORE_X,
    395
  );

  const upList = state.upgrades.length > 0 ? state.upgrades.join(', ') : '-';
  ctx.font = `600 14px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`Peningkatan: ${upList}`, CORE_X, 432);

  drawButton(ctx, BTN_RESTART_END, 'MULAI ULANG (R / KLIK)', true);
  ctx.restore();
}

/**
 * Mengembalikan aksi UI jika pengguna mengklik tombol atau kartu peningkatan pada layar aktif.
 */
export function hitTestUI(screen, clickPt) {
  if (!clickPt) return null;
  if (screen === SCREEN_TITLE) {
    if (inside(clickPt, BTN_START)) return { type: 'start' };
    return { type: 'start' };
  }
  if (screen === SCREEN_UPGRADE) {
    if (inside(clickPt, CARD_LEFT)) return { type: 'upgrade', index: 0 };
    if (inside(clickPt, CARD_RIGHT)) return { type: 'upgrade', index: 1 };
    if (inside(clickPt, BTN_UPGRADE_RESTART)) return { type: 'restart' };
  }
  if (screen === SCREEN_PAUSE) {
    if (inside(clickPt, BTN_PAUSE_RESUME)) return { type: 'resume' };
    if (inside(clickPt, BTN_PAUSE_RESTART)) return { type: 'restart' };
  }
  if (screen === SCREEN_LOSE || screen === SCREEN_WIN) {
    if (inside(clickPt, BTN_RESTART_END)) return { type: 'restart' };
    return { type: 'restart' };
  }
  return null;
}
