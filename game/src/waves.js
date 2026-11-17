// Pengaturan gelombang 1 sampai 12, variasi tipe serpihan gelap, dan kurva kesulitan.
// Menang dicapai setelah pemain bertahan menuntaskan gelombang 12.

export const MAX_WAVE = 12;

export const SHARD_NORMAL = 'biasa';
export const SHARD_FAST = 'cepat';
export const SHARD_SPIRAL = 'spiral';
export const SHARD_HEAVY = 'berat';

const WAVE_NAMES = [
  'Fajar Pertama',
  'Bisikan Bayang',
  'Hujan Obsidian',
  'Pusaran Senja',
  'Tombak Kegelapan',
  'Badai Kristal Gelap',
  'Orbit Terkoyak',
  'Serbuan Tanpa Henti',
  'Cincin Gerhana',
  'Gelombang Void',
  'Ambang Kehancuran',
  'Puncak Gerhana Abadi',
];

/**
 * Mengembalikan konfigurasi gelombang ke-n (1..12).
 */
export function getWaveConfig(wave) {
  const w = Math.max(1, Math.min(MAX_WAVE, Math.floor(wave || 1)));
  const totalShards = 8 + w * 2;
  const spawnInterval = Math.max(0.28, 0.78 - w * 0.038);
  const baseSpeed = 112 + w * 11;

  // Bobot kemunculan tiap jenis serpihan berdasarkan nomor gelombang
  const weights = [
    { kind: SHARD_NORMAL, weight: 10 },
    { kind: SHARD_FAST, weight: w >= 2 ? 2 + Math.floor(w * 0.8) : 0 },
    { kind: SHARD_SPIRAL, weight: w >= 4 ? 2 + Math.floor((w - 3) * 0.9) : 0 },
    { kind: SHARD_HEAVY, weight: w >= 6 ? 1 + Math.floor((w - 5) * 0.7) : 0 },
  ];

  return {
    wave: w,
    title: WAVE_NAMES[w - 1] || `Gelombang ${w}`,
    totalShards,
    spawnInterval,
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
export function createShard(kind, angle, distance, baseSpeed, cx, cy, id = 0) {
  const x = cx + Math.cos(angle) * distance;
  const y = cy + Math.sin(angle) * distance;
  const toCenter = Math.atan2(cy - y, cx - x);

  let speed = baseSpeed;
  let radius = 11;
  let points = 100;
  let spiralRate = 0;

  if (kind === SHARD_FAST) {
    speed = baseSpeed * 1.42;
    radius = 9;
    points = 150;
  } else if (kind === SHARD_SPIRAL) {
    speed = baseSpeed * 0.95;
    radius = 11;
    points = 140;
    spiralRate = (id % 2 === 0 ? 1 : -1) * 0.68;
  } else if (kind === SHARD_HEAVY) {
    speed = baseSpeed * 0.76;
    radius = 15;
    points = 200;
  }

  return {
    id,
    kind,
    x,
    y,
    vx: Math.cos(toCenter) * speed,
    vy: Math.sin(toCenter) * speed,
    speed,
    radius,
    points,
    spiralRate,
    deflected: false,
    bracedDeflect: false,
    pierceLeft: 0,
    chainLevel: 0,
    trail: [],
    rotation: toCenter,
    spin: (id % 2 === 0 ? 1 : -1) * 2.4,
    slowTimer: 0,
  };
}
