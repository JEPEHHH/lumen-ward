// Penggambaran HUD (huruf minimal 20 px, angka skor besar & tebal) dan seluruh layar
// antarmuka LUMEN WARD: judul, pilih peningkatan (2 kartu besar bersebelahan dengan
// ikon vektor & 1 kalimat efek), jeda, kalah, dan menang.

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
const BTN_START = { x: 420, y: 530, w: 440, h: 62 };
const BTN_RESTART_END = { x: 430, y: 505, w: 420, h: 62 };
const BTN_PAUSE_RESUME = { x: 430, y: 420, w: 420, h: 56 };
const BTN_PAUSE_RESTART = { x: 430, y: 492, w: 420, h: 56 };
const CARD_LEFT = { x: 130, y: 185, w: 485, h: 350 };
const CARD_RIGHT = { x: 665, y: 185, w: 485, h: 350 };
const BTN_UPGRADE_RESTART = { x: 490, y: 552, w: 300, h: 48 };

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

// Gambar ikon vektor sederhana dan jelas untuk tiap kartu peningkatan
function drawUpgradeVectorIcon(ctx, id, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);

  // Medali lingkaran latar ikon
  ctx.fillStyle = 'rgba(11, 17, 36, 0.9)';
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = PALETTE.ivory;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id === 'busur_lebar') {
    // Ikon Busur Perisai Lebar + Inti Berlian
    ctx.strokeStyle = PALETTE.honeyBright;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 4, 24, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(9, 6);
    ctx.lineTo(0, 16);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'pantul_magnet') {
    // Ikon Pantulan Mengejar Target
    ctx.strokeStyle = PALETTE.honeyBright;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, 14);
    ctx.quadraticCurveTo(-4, -18, 16, -6);
    ctx.stroke();
    // Mata panah & target kristal
    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(18, -4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-20, 14, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'stamina_kilat') {
    // Ikon Petir Stamina Kilat
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.strokeStyle = PALETTE.ivory;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(-14, 2);
    ctx.lineTo(-1, 2);
    ctx.lineTo(-6, 22);
    ctx.lineTo(14, -4);
    ctx.lineTo(1, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === 'prisma_pecah') {
    // Ikon Prisma Ganda (3 Tombak Cahaya Menyebar)
    const angles = [-0.45, 0, 0.45];
    for (let i = 0; i < angles.length; i += 1) {
      ctx.save();
      ctx.rotate(angles[i]);
      ctx.strokeStyle = i === 1 ? PALETTE.ivory : PALETTE.honeyBright;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(0, -18);
      ctx.stroke();
      ctx.fillStyle = i === 1 ? PALETTE.ivory : PALETTE.honeyBright;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(-6, -12);
      ctx.lineTo(6, -12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (id === 'gelombang_kejut') {
    // Ikon Cincin Gelombang Kejut Konsentris
    ctx.strokeStyle = PALETTE.honeyBright;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ikon Restorasi Inti (+1 Kristal Hati/Inti)
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.strokeStyle = PALETTE.ivory;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 20);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#090d1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawUI(ctx, state, screen, isMuted) {
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

// Semua huruf HUD minimal 20 px, angka skor besar dan tebal agar tetap jelas saat diperkecil ke 768x480
function drawHud(ctx, state, isMuted) {
  ctx.save();

  // Panel Kiri Atas: SKOR & RANTAI
  roundRect(ctx, 18, 14, 390, 108, 14);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('SKOR', 34, 24);

  ctx.font = `900 42px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(String(state.score).padStart(6, '0'), 34, 48);

  // Indikator Pengali Rantai (Chain Multiplier)
  const chainActive = state.chain > 1 && state.chainTimer > 0;
  ctx.textAlign = 'right';
  ctx.font = `900 24px ${FONT_FAMILY}`;
  ctx.fillStyle = chainActive ? PALETTE.honeyBright : PALETTE.mutedIvory;
  ctx.fillText(`RANTAI x${state.chain}`, 392, 24);

  // Bar waktu rantai
  const chainRatio = chainActive ? Math.min(1, state.chainTimer / 3.5) : 0;
  roundRect(ctx, 232, 58, 160, 12, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  if (chainRatio > 0) {
    roundRect(ctx, 232, 58, Math.max(10, 160 * chainRatio), 12, 6);
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.fill();
  }

  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(`TERBAIK: ${state.bestScore}`, 392, 82);

  // Panel Tengah Atas: GELOMBANG
  roundRect(ctx, CORE_X - 195, 14, 390, 92, 14);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = `900 26px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`GELOMBANG ${state.wave} / ${MAX_WAVE}`, CORE_X, 24);

  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(state.waveTitle || 'Jaga Inti Cahaya', CORE_X, 62);

  // Panel Kanan Atas: INTEGRITAS INTI & STAMINA PERISAI
  roundRect(ctx, FIELD_WIDTH - 408, 14, 390, 108, 14);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('INTI', FIELD_WIDTH - 390, 26);

  const maxLives = state.maxIntegrity || 3;
  for (let i = 0; i < maxLives; i += 1) {
    const gx = FIELD_WIDTH - 285 + i * 34;
    const gy = 36;
    const alive = i < state.integrity;
    ctx.fillStyle = alive ? PALETTE.honeyBright : 'rgba(255, 90, 95, 0.24)';
    ctx.strokeStyle = alive ? PALETTE.ivory : '#ff5a5f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 10);
    ctx.lineTo(gx + 11, gy);
    ctx.lineTo(gx, gy + 10);
    ctx.lineTo(gx - 11, gy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = 'right';
  ctx.font = `900 22px ${FONT_FAMILY}`;
  ctx.fillStyle = state.integrity > 1 ? PALETTE.ivory : '#ff5a5f';
  ctx.fillText(`${state.integrity}/${maxLives}`, FIELD_WIDTH - 34, 25);

  // Bar Stamina Perisai
  ctx.textAlign = 'left';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText('STAMINA', FIELD_WIDTH - 390, 74);

  const stamRatio = Math.max(0, Math.min(1, state.stamina / state.maxStamina));
  roundRect(ctx, FIELD_WIDTH - 275, 78, 150, 16, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();
  if (stamRatio > 0) {
    roundRect(ctx, FIELD_WIDTH - 275, 78, Math.max(10, 150 * stamRatio), 16, 8);
    ctx.fillStyle = state.staminaExhausted
      ? '#ff5a5f'
      : state.bracing
      ? PALETTE.ivory
      : PALETTE.honeyBright;
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.fillStyle = state.bracing ? PALETTE.honeyBright : PALETTE.ivory;
  const stamText = state.staminaExhausted
    ? 'PULIH'
    : state.bracing
    ? 'TAHAN!'
    : `${Math.round(state.stamina)}%`;
  ctx.fillText(stamText, FIELD_WIDTH - 34, 74);

  // Baris Petunjuk Kendali Singkat di Bawah (huruf 20 px)
  roundRect(ctx, 90, FIELD_HEIGHT - 50, 1100, 38, 10);
  ctx.fillStyle = 'rgba(11, 17, 36, 0.86)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  const audioLabel = isMuted ? 'MATI' : 'NYALA';
  ctx.fillText(
    `[Mouse / ← →] Putar   •   [Spasi] Tahan   •   [P] Jeda   •   [R] Ulang   •   [M] Suara: ${audioLabel}`,
    CORE_X,
    FIELD_HEIGHT - 31
  );

  ctx.restore();
}

function drawButton(ctx, box, label, primary = true) {
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fillStyle = primary ? PALETTE.honey : 'rgba(25, 37, 74, 0.96)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.ivory;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 22px ${FONT_FAMILY}`;
  ctx.fillStyle = primary ? '#090d1c' : PALETTE.ivory;
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2);
}

function drawTitleScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.68)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 180, 125, 920, 490, 20);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 58px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText('LUMEN WARD', CORE_X, 148);

  ctx.font = `800 22px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText('PENJAGA INTI CAHAYA — PANTULAN BERANTAI', CORE_X, 218);

  const rules = [
    '1. Putar perisai mengelilingi Inti dengan Mouse atau tombol ← → (A / D).',
    '2. Pantulkan serpihan gelap (Biasa, Cepat, Berat 2x, Pemecah) untuk memicu RANTAI!',
    '3. Tahan SPASI untuk memperlebar & memperkuat pantulan perisai (pakai Stamina).',
    '4. Pilih 1 dari 2 Peningkatan tiap 3 gelombang. Menangkan Gelombang 12!',
  ];

  ctx.font = `600 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  for (let i = 0; i < rules.length; i += 1) {
    ctx.fillText(rules[i], CORE_X, 274 + i * 44);
  }

  ctx.font = `800 21px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(
    `Skor Tertinggi: ${state.bestScore}   •   [P] Jeda   [R] Ulang   [M] Suara`,
    CORE_X,
    468
  );

  drawButton(ctx, BTN_START, 'MULAI JAGA INTI (KLIK / ENTER)', true);
  ctx.restore();
}

function drawUpgradeScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.76)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 95, 105, 1090, 515, 20);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 38px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`GELOMBANG ${state.wave} SELESAI — PILIH PENINGKATAN`, CORE_X, 122);

  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(
    `Skor: ${state.score}   •   Tekan [1] atau [2] / Klik salah satu kartu di bawah`,
    CORE_X,
    164
  );

  const choices = state.upgradeChoices || [];
  const cards = [CARD_LEFT, CARD_RIGHT];

  for (let i = 0; i < 2; i += 1) {
    const up = choices[i];
    const box = cards[i];
    if (!up) continue;

    roundRect(ctx, box.x, box.y, box.w, box.h, 16);
    ctx.fillStyle = 'rgba(22, 34, 68, 0.98)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.honeyBright;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    const cx = box.x + box.w / 2;
    drawUpgradeVectorIcon(ctx, up.id, cx, box.y + 54);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `900 30px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.ivory;
    ctx.fillText(up.nama, cx, box.y + 104);

    ctx.font = `800 22px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.honeyBright;
    ctx.fillText(up.ringkas, cx, box.y + 144);

    ctx.font = `600 20px ${FONT_FAMILY}`;
    ctx.fillStyle = PALETTE.ivory;
    wrapText(ctx, up.deskripsi, cx, box.y + 186, box.w - 44, 28);

    const btn = { x: box.x + 32, y: box.y + box.h - 68, w: box.w - 64, h: 52 };
    drawButton(ctx, btn, `PILIH [${i + 1}] — ${up.nama.toUpperCase()}`, true);
  }

  drawButton(ctx, BTN_UPGRADE_RESTART, 'MULAI ULANG (R)', false);
  ctx.restore();
}

function drawPauseScreen(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.76)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 260, 150, 760, 430, 20);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.honeyBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 46px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText('PERMAINAN DIJEDA', CORE_X, 178);

  ctx.font = `800 24px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(`Skor: ${state.score}   •   Gelombang: ${state.wave} / ${MAX_WAVE}`, CORE_X, 248);

  ctx.font = `700 21px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(
    `Integritas Inti: ${state.integrity}/${state.maxIntegrity}   •   Rantai Terpanjang: x${state.maxChain}`,
    CORE_X,
    294
  );

  const upText =
    state.upgrades.length > 0
      ? `Peningkatan: ${state.upgrades.join(', ')}`
      : 'Peningkatan: Belum ada (pilih tiap 3 gelombang)';
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(upText, CORE_X, 344);

  drawButton(ctx, BTN_PAUSE_RESUME, 'LANJUTKAN BERMAIN (P)', true);
  drawButton(ctx, BTN_PAUSE_RESTART, 'MULAI ULANG (R)', false);
  ctx.restore();
}

function drawEndScreen(ctx, state, isWin) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.78)';
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  roundRect(ctx, 210, 130, 860, 465, 20);
  ctx.fillStyle = PALETTE.panelBg;
  ctx.fill();
  ctx.strokeStyle = isWin ? PALETTE.honeyBright : '#ff5a5f';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 52px ${FONT_FAMILY}`;
  ctx.fillStyle = isWin ? PALETTE.honeyBright : '#ff5a5f';
  ctx.fillText(isWin ? 'CAHAYA ABADI — MENANG!' : 'INTI PADAM — KALAH', CORE_X, 154);

  ctx.font = `700 21px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(
    isWin
      ? 'Selamat! Kamu berhasil menjaga Inti Cahaya menuntaskan seluruh 12 Gelombang!'
      : 'Serpihan gelap meretakkan Inti Cahaya. Bangkit dan pantulkan kembali!',
    CORE_X,
    220
  );

  // Kotak ringkasan: skor akhir, rantai terpanjang, gelombang tercapai
  roundRect(ctx, 270, 265, 740, 215, 14);
  ctx.fillStyle = 'rgba(19, 29, 59, 0.94)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 184, 65, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `900 44px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(`SKOR AKHIR: ${state.score}`, CORE_X, 282);

  ctx.font = `800 22px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.ivory;
  ctx.fillText(`Skor Tertinggi: ${state.bestScore}`, CORE_X, 340);

  ctx.font = `800 24px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.honeyBright;
  ctx.fillText(
    `Gelombang Tercapai: ${state.wave} / ${MAX_WAVE}   •   Rantai Terpanjang: x${state.maxChain}`,
    CORE_X,
    382
  );

  const upList = state.upgrades.length > 0 ? state.upgrades.join(', ') : '-';
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillStyle = PALETTE.mutedIvory;
  ctx.fillText(`Peningkatan: ${upList}`, CORE_X, 428);

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
