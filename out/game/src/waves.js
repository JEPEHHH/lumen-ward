// Pengaturan gelombang 1 sampai 12, variasi 4 jenis serpihan gelap
// (biasa, cepat, berat 2-pantulan, pemecah beranak 2), kepadatan aktif bertahap,
// dan jeda masuk bergerombol (burst spawning).

export const MAX_WAVE = 12;

export const SHARD_NORMAL = 'biasa';
export const SHARD_FAST = 'cepat';
export const SHARD_HEAVY = 'berat';
export const SHARD_SPLITTER = 'pemecah';
export const SHARD_SPIRAL = 'spiral';

const WAVE_NAMES = [
  'Fajar Pertama',
  'Bisikan Bayang',
  'Hujan Obsidian',
  'Pusaran Pecahan',
  'Tombak Kegelapan',
  'Badai Kristal Gelap',
  'Orbit Terbelah',
  'Benteng Raksasa',
  'Cincin Gerhana',
  'Gelombang Void',
  'Ambang Kehancuran',
  'Puncak Gerhana Abadi',
];

// Target jumlah serpihan hidup di layar: gelombang 1 ±4, gelombang 6 ±10, gelombang 10-12 ±16
const TARGET_ACTIVE_BY_WAVE = [4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 16];

// Ukuran gerombolan tiap jeda masuk (spawn bergelombang)
const BURST_SIZE_BY_WAVE = [3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8];

// Total serpihan induk yang muncul per gelombang (dirancang agar total 12 gelombang ~6-9 menit)
const TOTAL_SHARDS_BY_WAVE = [50, 64, 78, 94, 110, 128, 146, 164, 184, 204, 224, 246];

// Komposisi unik setiap gelombang [biasa, cepat, berat, pemecah]
const WAVE_WEIGHT_TABLE = [
  [10, 2, 0, 0], // Gel 1: Biasa + sedikit Cepat
  [8, 4, 0, 2],  // Gel 2: Pemecah mulai muncul
  [7, 4, 2, 2],  // Gel 3: Berat (2 pantulan) mulai hadir
  [6, 4, 2, 5],  // Gel 4: Fokus Pemecah beranak
  [5, 7, 2, 3],  // Gel 5: Serbuan Cepat beruntun
  [5, 4, 5, 4],  // Gel 6: Tengah permainan padat (±10 aktif)
  [4, 6, 3, 6],  // Gel 7: Kombinasi Cepat & Pemecah
  [4, 4, 6, 4],  // Gel 8: Gempuran Berat berlapis
  [4, 7, 4, 6],  // Gel 9: Kepungan Cepat & Pemecah
  [3, 6, 6, 6],  // Gel 10: Gelombang Void (±16 aktif)
  [3, 8, 6, 7],  // Gel 11: Badai kecepatan tinggi
  [3, 8, 8, 8],  // Gel 12: Puncak semua jenis serpihan
];

/**
 * Mengembalikan konfigurasi gelombang ke-n (1..12).
 */
export function getWaveConfig(wave) {
  const w = Math.max(1, Math.min(MAX_WAVE, Math.floor(wave || 1)));
  const idx = w - 1;
  const targetActive = TARGET_ACTIVE_BY_WAVE[idx];
  const maxActive = targetActive + 3;
  const burstSize = BURST_SIZE_BY_WAVE[idx];
  const burstInterval = Math.max(2.15, 3.15 - w * 0.075);
  const totalShards = TOTAL_SHARDS_BY_WAVE[idx];
  const baseSpeed = 82 + w * 4.2;
  const row = WAVE_WEIGHT_TABLE[idx];

  const weights = [
    { kind: SHARD_NORMAL, weight: row[0] },
    { kind: SHARD_FAST, weight: row[1] },
    { kind: SHARD_HEAVY, weight: row[2] },
    { kind: SHARD_SPLITTER, weight: row[3] },
  ];

  return {
    wave: w,
    title: WAVE_NAMES[idx] || `Gelombang ${w}`,
    totalShards,
    targetActive,
    maxActive,
    burstSize,
    burstInterval,
    spawnInterval: burstInterval / burstSize,
    baseSpeed,
    weights,
  };
}

/**
 * Memilih jenis serpihan berdasarkan bobot gelombang dan nilai acak [0, 1).
 */
export function pickShardKind(config, randValue) {
  let total = 0;
  for (let i = 0; i < config.weights.length; i += 1) {
    total += config.weights[i].weight;
  }
  let r = randValue * total;
  for (let i = 0; i < config.weights.length; i += 1) {
    const item = config.weights[i];
    if (r <= item.weight) return item.kind;
    r -= item.weight;
  }
  return SHARD_NORMAL;
}

/**
 * Membuat objek serpihan gelap baru yang muncul dari tepi arena menuju inti di (cx, cy).
 */
export function createShard(kind, angle, distance, baseSpeed, cx, cy, id = 0, isChild = false) {
  const x = cx + Math.cos(angle) * distance;
  const y = cy + Math.sin(angle) * distance;
  const toCenter = Math.atan2(cy - y, cx - x);

  let speed = baseSpeed;
  let radius = 11;
  let points = 100;
  let hp = 1;
  let maxHp = 1;
  let spiralRate = 0;

  if (kind === SHARD_FAST) {
    speed = baseSpeed * 1.48;
    radius = 8.5;
    points = 150;
  } else if (kind === SHARD_HEAVY) {
    speed = baseSpeed * 0.72;
    radius = 16;
    points = 240;
    hp = 2;
    maxHp = 2;
  } else if (kind === SHARD_SPLITTER) {
    if (isChild) {
      speed = baseSpeed * 1.15;
      radius = 8.5;
      points = 110;
    } else {
      speed = baseSpeed * 0.92;
      radius = 13.5;
      points = 170;
    }
  } else if (kind === SHARD_SPIRAL) {
    speed = baseSpeed * 0.95;
    radius = 11;
    points = 140;
    spiralRate = (id % 2 === 0 ? 1 : -1) * 0.65;
  }

  return {
    id,
    kind,
    isChild: Boolean(isChild),
    x,
    y,
    vx: Math.cos(toCenter) * speed,
    vy: Math.sin(toCenter) * speed,
    speed,
    radius,
    points,
    hp,
    maxHp,
    cracked: false,
    spiralRate,
    deflected: false,
    bracedDeflect: false,
    pierceLeft: 0,
    chainLevel: 0,
    reboundTimer: 0,
    reboundVx: 0,
    reboundVy: 0,
    trail: [],
    rotation: toCenter,
    spin: (id % 2 === 0 ? 1 : -1) * (kind === SHARD_FAST ? 3.4 : 2.2),
    slowTimer: 0,
  };
}
