// Entitas dunia, fisika perisai & stamina, pantulan serpihan (biasa, cepat, berat 2-pantulan,
// pemecah beranak 2), tabrakan berantai, partikel ledakan, teks skor melayang (0,8 dtk),
// getaran layar, dan kilatan tepi merah.

import {
  MAX_WAVE,
  SHARD_FAST,
  SHARD_HEAVY,
  SHARD_NORMAL,
  SHARD_SPIRAL,
  SHARD_SPLITTER,
  createShard,
  getWaveConfig,
  pickShardKind,
} from './waves.js';
import { applyUpgrade, createDefaultMods, rollUpgradeChoices } from './upgrades.js';

export const FIELD_WIDTH = 1280;
export const FIELD_HEIGHT = 720;
export const CORE_X = FIELD_WIDTH / 2;
export const CORE_Y = FIELD_HEIGHT / 2;
export const CORE_RADIUS = 30;
export const SHIELD_RADIUS = 78;

export const EVENT_NONE = 0;
export const EVENT_DEFLECT = 1;
export const EVENT_CHAIN = 2;
export const EVENT_HIT = 4;
export const EVENT_UPGRADE = 8;
export const EVENT_WIN = 16;
export const EVENT_LOSE = 32;
export const EVENT_BRACE = 64;
export const EVENT_WAVE = 128;

function normalizeAngle(a) {
  let res = a % (Math.PI * 2);
  if (res <= -Math.PI) res += Math.PI * 2;
  if (res > Math.PI) res -= Math.PI * 2;
  return res;
}

function angleDiff(a, b) {
  return normalizeAngle(a - b);
}

export function createWorld(seed = 1337) {
  let rngState = (seed >>> 0) || 1337;
  function rand() {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  const state = {
    score: 0,
    bestScore: 0,
    wave: 1,
    waveTitle: '',
    integrity: 3,
    maxIntegrity: 3,
    chain: 1,
    maxChain: 1,
    chainTimer: 0,
    shieldAngle: -Math.PI / 2,
    shieldArc: 1.22,
    stamina: 100,
    maxStamina: 100,
    staminaExhausted: false,
    bracing: false,
    bracePulse: 0,
    shards: [],
    particles: [],
    popups: [],
    rings: [],
    upgrades: [],
    upgradeChoices: [],
    spawnedInWave: 0,
    totalInWave: 30,
    spawnTimer: 0,
    lastClusterAngle: -Math.PI / 3,
    waveBannerTimer: 0,
    shakeTime: 0,
    shakeMag: 0,
    coreFlash: 0,
    edgeFlash: 0,
    invulnTimer: 0,
    corePulse: 0,
    time: 0,
    nextId: 1,
    mods: createDefaultMods(),
  };

  function addShake(mag, duration = 0.2) {
    state.shakeMag = Math.max(state.shakeMag, mag);
    state.shakeTime = Math.max(state.shakeTime, duration);
  }

  // Teks skor melayang: lebih besar dan pekat, hilang dalam 0,8 detik
  function addPopup(x, y, text, color = '#ffd166', size = 26) {
    state.popups.push({
      x,
      y,
      vy: -62,
      text,
      color,
      size,
      life: 0.8,
      maxLife: 0.8,
    });
  }

  function addParticles(x, y, count, color, speed = 180, size = 5.2) {
    for (let i = 0; i < count; i += 1) {
      const ang = rand() * Math.PI * 2;
      const spd = speed * (0.35 + rand() * 0.9);
      const life = 0.32 + rand() * 0.38;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: size * (0.7 + rand() * 0.65),
        life,
        maxLife: life,
        spark: i % 3 === 0,
      });
    }
    if (state.particles.length > 260) {
      state.particles.splice(0, state.particles.length - 260);
    }
  }

  function addRing(x, y, maxRadius, color = '#ffd166', duration = 0.45) {
    state.rings.push({
      x,
      y,
      radius: 22,
      maxRadius,
      color,
      life: duration,
      maxLife: duration,
    });
  }

  function countHostileShards() {
    let count = 0;
    for (let i = 0; i < state.shards.length; i += 1) {
      if (!state.shards[i].deflected) count += 1;
    }
    return count;
  }

  // Spawn bergerombol (jeda masuk bergelombang tiap beberapa detik, bukan menetes satu-satu)
  function spawnCluster(forceCount = 0) {
    const cfg = getWaveConfig(state.wave);
    const remainingToSpawn = state.totalInWave - state.spawnedInWave;
    if (remainingToSpawn <= 0) return;

    const currentHostile = countHostileShards();
    const room = Math.max(0, cfg.maxActive - currentHostile);
    if (room <= 0 && forceCount === 0) return;

    const desired = forceCount > 0 ? forceCount : cfg.burstSize;
    const count = Math.min(remainingToSpawn, Math.max(1, Math.min(desired, room)));

    // Geser sudut sektor gerombolan secara terukur agar pemain dapat menyapu dari grup ke grup
    const stepTurn = (rand() > 0.5 ? 1 : -1) * (0.52 + rand() * 0.78);
    const baseAngle = normalizeAngle(state.lastClusterAngle + stepTurn);
    state.lastClusterAngle = baseAngle;

    const twoFlanks = count >= 5 && rand() > 0.52;
    for (let i = 0; i < count; i += 1) {
      const kind = pickShardKind(cfg, rand());
      let angleOffset = (i - (count - 1) / 2) * 0.16 + (rand() - 0.5) * 0.07;
      if (twoFlanks && i >= Math.ceil(count / 2)) {
        angleOffset += (i % 2 === 0 ? 1 : -1) * 0.46;
      }
      const angle = normalizeAngle(baseAngle + angleOffset);
      const distance = 425 + i * 26 + rand() * 20;
      const speedJitter = 0.92 + rand() * 0.16;
      const shard = createShard(
        kind,
        angle,
        distance,
        cfg.baseSpeed * speedJitter,
        CORE_X,
        CORE_Y,
        state.nextId++
      );
      state.shards.push(shard);
      state.spawnedInWave += 1;
    }
  }

  function setupWave(waveNum) {
    const cfg = getWaveConfig(waveNum);
    state.wave = cfg.wave;
    state.waveTitle = cfg.title;
    state.spawnedInWave = 0;
    state.totalInWave = cfg.totalShards;
    state.waveBannerTimer = 2.0;
    state.chain = 1;
    state.chainTimer = 0;
    // Langsung munculkan gerombolan pembuka agar layar langsung hidup sesuai target gelombang
    const openingCount = cfg.targetActive;
    spawnCluster(openingCount);
    state.spawnTimer = cfg.burstInterval * 0.75;
  }

  function reset(newSeed) {
    if (typeof newSeed === 'number') {
      rngState = (newSeed >>> 0) || 1337;
    }
    state.score = 0;
    state.integrity = 3;
    state.maxIntegrity = 3;
    state.chain = 1;
    state.maxChain = 1;
    state.chainTimer = 0;
    state.shieldAngle = -Math.PI / 2;
    state.stamina = 100;
    state.maxStamina = 100;
    state.staminaExhausted = false;
    state.bracing = false;
    state.bracePulse = 0;
    state.shards.length = 0;
    state.particles.length = 0;
    state.popups.length = 0;
    state.rings.length = 0;
    state.upgrades.length = 0;
    state.upgradeChoices = [];
    state.shakeTime = 0;
    state.shakeMag = 0;
    state.coreFlash = 0;
    state.edgeFlash = 0;
    state.invulnTimer = 0;
    state.corePulse = 0;
    state.time = 0;
    state.nextId = 1;
    state.lastClusterAngle = -Math.PI / 3;
    state.mods = createDefaultMods();
    state.shieldArc = state.mods.shieldArc;
    setupWave(1);
  }

  function findNearestDarkShard(fromShard, maxAngleDiff = Math.PI) {
    let best = null;
    let bestScore = Infinity;
    const moveAngle = Math.atan2(fromShard.vy, fromShard.vx);

    for (let i = 0; i < state.shards.length; i += 1) {
      const other = state.shards[i];
      if (other.deflected || other === fromShard) continue;
      const dx = other.x - fromShard.x;
      const dy = other.y - fromShard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10 || dist > 620) continue;
      const toOther = Math.atan2(dy, dx);
      const diff = Math.abs(angleDiff(toOther, moveAngle));
      if (diff > maxAngleDiff) continue;
      const metric = dist + diff * 110;
      if (metric < bestScore) {
        bestScore = metric;
        best = other;
      }
    }
    return best;
  }

  function spawnSplitChildren(parentShard, shardAngle) {
    const cfg = getWaveConfig(state.wave);
    const currentHostile = countHostileShards();
    const maxChildren = currentHostile >= cfg.maxActive + 2 ? 1 : 2;
    const offsets = maxChildren === 2 ? [-0.42, 0.42] : [0];

    for (let c = 0; c < offsets.length; c += 1) {
      const childAng = normalizeAngle(shardAngle + offsets[c]);
      const child = createShard(
        SHARD_SPLITTER,
        childAng,
        SHIELD_RADIUS + 18,
        cfg.baseSpeed,
        CORE_X,
        CORE_Y,
        state.nextId++,
        true
      );
      child.x = parentShard.x + Math.cos(childAng) * 10;
      child.y = parentShard.y + Math.sin(childAng) * 10;
      // Mental keluar sebentar sebelum kembali menyerang inti
      child.reboundTimer = 0.48;
      child.reboundVx = Math.cos(childAng) * 205;
      child.reboundVy = Math.sin(childAng) * 205;
      state.shards.push(child);
    }
  }

  function deflectShard(shard, normalAngle, bonusLabel = '') {
    shard.deflected = true;
    shard.bracedDeflect = state.bracing;
    shard.reboundTimer = 0;
    shard.pierceLeft = state.mods.pierceBonus + (state.bracing ? 1 : 0);
    shard.chainLevel = 1;

    const reboundSpeed = Math.max(380, shard.speed * (state.bracing ? 2.5 : 2.15));
    let outAngle = normalAngle;

    shard.vx = Math.cos(outAngle) * reboundSpeed;
    shard.vy = Math.sin(outAngle) * reboundSpeed;
    const target = findNearestDarkShard(shard, 1.45);
    if (target) {
      const targetAngle = Math.atan2(target.y - shard.y, target.x - shard.x);
      const diff = angleDiff(targetAngle, outAngle);
      outAngle += diff * 0.68;
    }

    shard.speed = reboundSpeed;
    shard.vx = Math.cos(outAngle) * reboundSpeed;
    shard.vy = Math.sin(outAngle) * reboundSpeed;
    shard.rotation = outAngle;

    const scoreMult = Math.min(8, Math.max(1, state.chain));
    const baseGain = Math.round(
      20 * state.mods.scoreBonus * (state.bracing ? 1.5 : 1) * scoreMult
    );
    state.score += baseGain;
    if (state.score > state.bestScore) state.bestScore = state.score;

    if (state.chainTimer <= 0) {
      state.chain = 1;
      state.chainTimer = 1.1;
    }
    addParticles(shard.x, shard.y, state.bracing ? 22 : 16, '#ffd166', 210, 5.2);
    addParticles(shard.x, shard.y, 8, '#fcf8ec', 160, 4.0);
    addRing(shard.x, shard.y, state.bracing ? 64 : 46, '#ffd166', 0.28);

    const popupText = bonusLabel
      ? `+${baseGain} ${bonusLabel}`
      : state.bracing
      ? `+${baseGain} TAHAN!`
      : `+${baseGain}`;
    addPopup(shard.x, shard.y - 14, popupText, '#fcf8ec', 24);

    // Efek peningkatan Prisma Ganda: memercikkan proyektil cahaya tambahan
    if (state.mods.splitCount > 0) {
      for (let s = 0; s < state.mods.splitCount; s += 1) {
        const offset = (s % 2 === 0 ? 1 : -1) * (0.26 + s * 0.14);
        const splitAngle = outAngle + offset;
        const bolt = createShard(
          SHARD_FAST,
          0,
          0,
          reboundSpeed * 0.96,
          CORE_X,
          CORE_Y,
          state.nextId++
        );
        bolt.x = shard.x;
        bolt.y = shard.y;
        bolt.deflected = true;
        bolt.bracedDeflect = state.bracing;
        bolt.pierceLeft = 1;
        bolt.radius = 7.5;
        bolt.speed = reboundSpeed * 0.96;
        bolt.vx = Math.cos(splitAngle) * bolt.speed;
        bolt.vy = Math.sin(splitAngle) * bolt.speed;
        bolt.rotation = splitAngle;
        state.shards.push(bolt);
      }
    }
  }

  /**
   * Autopilot cerdas untuk mode demo judul atau saat tanpa interaksi.
   */
  function computeAutoAngle() {
    let mostUrgent = null;
    let bestTime = Infinity;
    for (let i = 0; i < state.shards.length; i += 1) {
      const sh = state.shards[i];
      if (sh.deflected || sh.reboundTimer > 0) continue;
      const dist = Math.max(1, Math.hypot(sh.x - CORE_X, sh.y - CORE_Y) - SHIELD_RADIUS);
      const t = dist / Math.max(40, sh.speed);
      if (t < bestTime) {
        bestTime = t;
        mostUrgent = sh;
      }
    }
    if (!mostUrgent) return state.shieldAngle + 0.018;
    return Math.atan2(mostUrgent.y - CORE_Y, mostUrgent.x - CORE_X);
  }

  function step(dt, inputState = {}, autoSteer = false) {
    let events = EVENT_NONE;
    state.time += dt;
    state.corePulse += dt * 3.2;

    if (state.waveBannerTimer > 0) state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);
    if (state.coreFlash > 0) state.coreFlash = Math.max(0, state.coreFlash - dt * 2.4);
    if (state.edgeFlash > 0) state.edgeFlash = Math.max(0, state.edgeFlash - dt * 1.85);
    if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
    if (state.bracePulse > 0) state.bracePulse = Math.max(0, state.bracePulse - dt * 3.0);

    if (state.shakeTime > 0) {
      state.shakeTime = Math.max(0, state.shakeTime - dt);
      if (state.shakeTime === 0) state.shakeMag = 0;
    }

    if (state.chainTimer > 0) {
      state.chainTimer = Math.max(0, state.chainTimer - dt);
      if (state.chainTimer === 0) state.chain = 1;
    }

    // 1. Stamina & Tahan Perisai (Spasi)
    const wantBrace = Boolean(inputState.brace);
    const wasBracing = state.bracing;
    if (wantBrace && !state.staminaExhausted && state.stamina > 0) {
      state.bracing = true;
      state.stamina = Math.max(0, state.stamina - state.mods.staminaDrain * dt);
      if (state.stamina === 0) {
        state.staminaExhausted = true;
        state.bracing = false;
      }
      if (!wasBracing) {
        events |= EVENT_BRACE;
        state.bracePulse = 1;
        addRing(CORE_X, CORE_Y, SHIELD_RADIUS + 52 + state.mods.shockwavePower * 42, '#ffd166', 0.36);
        if (state.mods.shockwavePower > 0) {
          for (let i = 0; i < state.shards.length; i += 1) {
            const sh = state.shards[i];
            if (sh.deflected) continue;
            const d = Math.hypot(sh.x - CORE_X, sh.y - CORE_Y);
            if (d < SHIELD_RADIUS + 150) {
              sh.slowTimer = 1.7;
            }
          }
        }
      }
    } else {
      state.bracing = false;
      state.stamina = Math.min(state.maxStamina, state.stamina + state.mods.staminaRegen * dt);
      if (state.staminaExhausted && state.stamina >= 24) {
        state.staminaExhausted = false;
      }
    }

    state.shieldArc = state.mods.shieldArc + (state.bracing ? state.mods.braceArcBonus : 0);

    // 2. Rotasi Perisai (Mouse instan atau tombol <- -> / A D responsif)
    if (autoSteer) {
      const target = computeAutoAngle();
      const diff = angleDiff(target, state.shieldAngle);
      state.shieldAngle = normalizeAngle(state.shieldAngle + diff * Math.min(1, dt * 13));
    } else {
      const dir = inputState.dir || 0;
      if (dir !== 0) {
        const turnSpeed = 5.6;
        state.shieldAngle = normalizeAngle(state.shieldAngle + dir * turnSpeed * dt);
      } else if (typeof inputState.pointerAngle === 'number') {
        const diff = angleDiff(inputState.pointerAngle, state.shieldAngle);
        state.shieldAngle = normalizeAngle(state.shieldAngle + diff * Math.min(1, dt * 30));
      }
    }

    // 3. Kemunculan serpihan bergerombol (jeda masuk bergelombang & jaga kepadatan targetActive)
    const cfg = getWaveConfig(state.wave);
    if (state.spawnedInWave < state.totalInWave) {
      state.spawnTimer -= dt;
      const hostileNow = countHostileShards();
      const lowFloor = Math.max(3, Math.floor(cfg.targetActive * 0.75));
      if (state.spawnTimer <= 0 || (hostileNow < lowFloor && state.spawnTimer < cfg.burstInterval * 0.65)) {
        const deficit = Math.max(cfg.burstSize, cfg.targetActive + 2 - hostileNow);
        spawnCluster(deficit);
        state.spawnTimer = cfg.burstInterval * 0.78;
      }
    }

    // 4. Pembaruan gerak serpihan & deteksi pantulan perisai
    const halfArc = state.shieldArc / 2 + 0.14;
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const sh = state.shards[i];

      // Simpan jejak ekor (trail): serpihan cepat punya jejak lebih panjang
      sh.trail.push({ x: sh.x, y: sh.y });
      const maxTrail = sh.kind === SHARD_FAST ? 14 : sh.deflected ? 10 : 6;
      if (sh.trail.length > maxTrail) sh.trail.shift();

      if (!sh.deflected) {
        const slowFactor = sh.slowTimer > 0 ? 0.48 : 1;
        if (sh.slowTimer > 0) sh.slowTimer = Math.max(0, sh.slowTimer - dt);

        if (sh.reboundTimer > 0) {
          sh.reboundTimer = Math.max(0, sh.reboundTimer - dt);
          sh.vx = sh.reboundVx * (0.4 + 0.6 * (sh.reboundTimer / 0.52));
          sh.vy = sh.reboundVy * (0.4 + 0.6 * (sh.reboundTimer / 0.52));
        } else if (sh.kind === SHARD_SPIRAL) {
          const toCenter = Math.atan2(CORE_Y - sh.y, CORE_X - sh.x);
          const spiralAngle = toCenter + sh.spiralRate * 0.55;
          sh.vx = Math.cos(spiralAngle) * sh.speed * slowFactor;
          sh.vy = Math.sin(spiralAngle) * sh.speed * slowFactor;
        } else {
          const toCenter = Math.atan2(CORE_Y - sh.y, CORE_X - sh.x);
          const crackBoost = sh.cracked ? 1.15 : 1;
          sh.vx = Math.cos(toCenter) * sh.speed * crackBoost * slowFactor;
          sh.vy = Math.sin(toCenter) * sh.speed * crackBoost * slowFactor;
        }
      } else if (state.mods.homingStrength > 0) {
        const target = findNearestDarkShard(sh, 1.5);
        if (target) {
          const curAng = Math.atan2(sh.vy, sh.vx);
          const wantAng = Math.atan2(target.y - sh.y, target.x - sh.x);
          const diff = angleDiff(wantAng, curAng);
          const nextAng =
            curAng + Math.sign(diff) * Math.min(Math.abs(diff), state.mods.homingStrength * dt);
          sh.vx = Math.cos(nextAng) * sh.speed;
          sh.vy = Math.sin(nextAng) * sh.speed;
          sh.rotation = nextAng;
        }
      }

      const prevDist = Math.hypot(sh.x - CORE_X, sh.y - CORE_Y);
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.rotation += sh.spin * dt;

      const dist = Math.hypot(sh.x - CORE_X, sh.y - CORE_Y);

      if (!sh.deflected) {
        // Cek apakah melintasi busur perisai
        const hitBandInner = SHIELD_RADIUS - sh.radius - 11;
        const hitBandOuter = SHIELD_RADIUS + sh.radius + 11;
        if (sh.reboundTimer <= 0 && dist <= hitBandOuter && prevDist >= hitBandInner) {
          const shardAngle = Math.atan2(sh.y - CORE_Y, sh.x - CORE_X);
          const diff = Math.abs(angleDiff(shardAngle, state.shieldAngle));
          if (diff <= halfArc) {
            sh.x = CORE_X + Math.cos(shardAngle) * (SHIELD_RADIUS + sh.radius + 3);
            sh.y = CORE_Y + Math.sin(shardAngle) * (SHIELD_RADIUS + sh.radius + 3);

            // Serpihan BERAT: butuh 2 pantulan untuk pecah
            if (sh.kind === SHARD_HEAVY && sh.hp > 1) {
              sh.hp -= 1;
              sh.cracked = true;
              const rebAng = shardAngle + (rand() - 0.5) * 0.34;
              sh.reboundTimer = 0.52;
              sh.reboundVx = Math.cos(rebAng) * 210;
              sh.reboundVy = Math.sin(rebAng) * 210;

              const hitGain = Math.round(120 * state.mods.scoreBonus);
              state.score += hitGain;
              if (state.score > state.bestScore) state.bestScore = state.score;
              state.chainTimer = Math.max(state.chainTimer, 3.2);

              addParticles(sh.x, sh.y, 20, '#ff9f1c', 200, 5.4);
              addParticles(sh.x, sh.y, 10, '#ffd166', 170, 4.5);
              addRing(sh.x, sh.y, 58, '#ff9f1c', 0.32);
              addPopup(sh.x, sh.y - 16, `+${hitGain} RETAK 1/2!`, '#ff9f1c', 25);
              addShake(5.5, 0.16);
              events |= EVENT_DEFLECT;
              continue;
            }

            // Serpihan PEMECAH: pecah jadi 2 anak saat terpantul
            if (sh.kind === SHARD_SPLITTER && !sh.isChild) {
              spawnSplitChildren(sh, shardAngle);
              addParticles(sh.x, sh.y, 22, '#00f5d4', 210, 5.2);
              addRing(sh.x, sh.y, 66, '#00f5d4', 0.34);
              deflectShard(sh, shardAngle, 'PECAH x2!');
              addShake(5.0, 0.15);
              events |= EVENT_DEFLECT;
              continue;
            }

            const wasHeavy = sh.kind === SHARD_HEAVY;
            deflectShard(sh, shardAngle, wasHeavy ? 'HANCUR!' : '');
            if (wasHeavy) {
              addParticles(sh.x, sh.y, 26, '#ff2a55', 230, 5.8);
              addRing(sh.x, sh.y, 76, '#ffd166', 0.38);
            }
            addShake(state.bracing ? 5.0 : 3.0, 0.14);
            events |= EVENT_DEFLECT;
            continue;
          }
        }

        // Cek apakah mengenai inti cahaya
        if (dist <= CORE_RADIUS + sh.radius - 2) {
          state.shards.splice(i, 1);
          if (state.invulnTimer <= 0) {
            state.integrity = Math.max(0, state.integrity - 1);
            state.chain = 1;
            state.chainTimer = 0;
            state.coreFlash = 1.0;
            state.edgeFlash = 1.0;
            state.invulnTimer = 1.15;
            addShake(14, 0.36);
            addParticles(sh.x, sh.y, 36, '#ff2a55', 250, 6.2);
            addParticles(CORE_X, CORE_Y, 18, '#ffffff', 190, 4.8);
            addRing(CORE_X, CORE_Y, 155, '#ff2a55', 0.48);
            addRing(CORE_X, CORE_Y, 95, '#ffffff', 0.32);
            addPopup(CORE_X, CORE_Y - 42, 'INTI RETAK! -1', '#ff5a5f', 30);

            // Gelombang kejut pelindung saat inti kena agar gerombolan yang sama tidak langsung menguras nyawa
            for (let k = 0; k < state.shards.length; k += 1) {
              const other = state.shards[k];
              if (other.deflected) continue;
              const od = Math.hypot(other.x - CORE_X, other.y - CORE_Y);
              if (od < 190) {
                const pushAng = Math.atan2(other.y - CORE_Y, other.x - CORE_X);
                other.reboundTimer = 0.45;
                other.reboundVx = Math.cos(pushAng) * 210;
                other.reboundVy = Math.sin(pushAng) * 210;
                other.slowTimer = 1.2;
              }
            }

            events |= EVENT_HIT;
            if (state.integrity <= 0) {
              events |= EVENT_LOSE;
            }
          } else {
            addParticles(sh.x, sh.y, 14, '#ffd166', 160, 4.5);
          }
          continue;
        }
      } else if (
        sh.x < -90 ||
        sh.x > FIELD_WIDTH + 90 ||
        sh.y < -90 ||
        sh.y > FIELD_HEIGHT + 90
      ) {
        state.shards.splice(i, 1);
      }
    }

    // 5. Tabrakan berantai: serpihan terpantul menghancurkan serpihan gelap lain
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const proj = state.shards[i];
      if (!proj || !proj.deflected) continue;

      for (let j = state.shards.length - 1; j >= 0; j -= 1) {
        const target = state.shards[j];
        if (!target || target.deflected || i === j) continue;

        const dist = Math.hypot(proj.x - target.x, proj.y - target.y);
        if (dist <= proj.radius + target.radius + 9) {
          state.chain = Math.min(24, state.chain + 1);
          if (state.chain > state.maxChain) state.maxChain = state.chain;
          state.chainTimer = 1.45;

          const chainMult = Math.min(10, state.chain);
          const gained = Math.round(
            target.points * 0.25 * chainMult * state.mods.scoreBonus * (proj.bracedDeflect ? 1.25 : 1)
          );
          state.score += gained;
          if (state.score > state.bestScore) state.bestScore = state.score;

          addParticles(target.x, target.y, 24, '#ffd166', 235, 5.6);
          addParticles(
            target.x,
            target.y,
            14,
            target.kind === SHARD_SPLITTER ? '#00f5d4' : '#ff5a5f',
            185,
            4.5
          );
          addRing(target.x, target.y, 64 + Math.min(48, state.chain * 8), '#ffd166', 0.34);
          addPopup(
            target.x,
            target.y - 14,
            `+${gained} RANTAI x${state.chain}!`,
            state.chain >= 3 ? '#ffd166' : '#fcf8ec',
            Math.min(38, 25 + state.chain * 2)
          );
          addShake(Math.min(11, 4.0 + state.chain * 1.1), 0.18);
          events |= EVENT_CHAIN;

          // Serpihan BERAT butuh 2 kali kena/pantul untuk pecah
          if (target.kind === SHARD_HEAVY && target.hp > 1) {
            target.hp -= 1;
            target.cracked = true;
            const pushAng = Math.atan2(target.y - CORE_Y, target.x - CORE_X);
            target.reboundTimer = 0.34;
            target.reboundVx = Math.cos(pushAng) * 165;
            target.reboundVy = Math.sin(pushAng) * 165;
          } else if (target.kind === SHARD_HEAVY) {
            // Pantulan ke-2 pada serpihan berat mengubahnya jadi ledakan tombak cahaya!
            target.deflected = true;
            target.pierceLeft = 1;
            target.speed = 380;
            const burstAng = Math.atan2(target.y - CORE_Y, target.x - CORE_X);
            target.vx = Math.cos(burstAng) * target.speed;
            target.vy = Math.sin(burstAng) * target.speed;
          } else {
            state.shards.splice(j, 1);
            if (j < i) i -= 1;
          }

          proj.pierceLeft -= 1;
          if (proj.pierceLeft < 0) {
            state.shards.splice(i, 1);
            break;
          } else {
            const nextTarget = findNearestDarkShard(proj, Math.PI);
            if (nextTarget) {
              const ang = Math.atan2(nextTarget.y - proj.y, nextTarget.x - proj.x);
              proj.vx = Math.cos(ang) * proj.speed;
              proj.vy = Math.sin(ang) * proj.speed;
              proj.rotation = ang;
            }
          }
        }
      }
    }

    // 6. Pembaruan partikel, cincin, dan teks skor melayang
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.rings.length - 1; i >= 0; i -= 1) {
      const r = state.rings[i];
      r.life -= dt;
      if (r.life <= 0) state.rings.splice(i, 1);
    }

    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const pop = state.popups[i];
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
      pop.life -= dt;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }

    // 7. Cek penyelesaian gelombang
    const hostileRemaining = countHostileShards();
    if (state.integrity > 0 && state.spawnedInWave >= state.totalInWave && hostileRemaining === 0) {
      if (state.wave >= MAX_WAVE) {
        events |= EVENT_WIN;
      } else if (state.wave % 3 === 0) {
        // Pulihkan 1 integritas jika sempat terluka saat menyelesaikan gelombang boss/kelipatan 3
        if (state.integrity < state.maxIntegrity) {
          state.integrity += 1;
          addPopup(CORE_X, CORE_Y - 68, '+1 INTEGRITAS PULIH!', '#00f5d4', 26);
        }
        state.upgradeChoices = rollUpgradeChoices(state.wave, state.upgrades);
        events |= EVENT_UPGRADE;
      } else {
        setupWave(state.wave + 1);
        addPopup(CORE_X, CORE_Y - 100, `GELOMBANG ${state.wave}`, '#ffd166', 30);
        events |= EVENT_WAVE;
      }
    }

    return events;
  }

  function advanceAfterUpgrade(choiceIndex) {
    const chosen = state.upgradeChoices[choiceIndex] || state.upgradeChoices[0];
    if (chosen) {
      applyUpgrade(chosen, state.mods, state);
      state.shieldArc = state.mods.shieldArc;
      addRing(CORE_X, CORE_Y, 185, '#ffd166', 0.5);
      addPopup(CORE_X, CORE_Y - 78, `${chosen.nama} Aktif!`, '#ffd166', 28);
    }
    state.upgradeChoices = [];
    if (state.wave < MAX_WAVE) {
      setupWave(state.wave + 1);
    }
  }

  /**
   * Menyiapkan adegan aktif yang padat pada gelombang ke-n
   * (untuk kait window.__lumen.keGelombang dan tangkapan layar).
   */
  function jumpToWave(waveNum) {
    const w = Math.max(1, Math.min(MAX_WAVE, Math.floor(Number(waveNum) || 1)));
    const cfg = getWaveConfig(w);
    state.wave = cfg.wave;
    state.waveTitle = cfg.title;
    state.totalInWave = cfg.totalShards;
    state.spawnTimer = cfg.burstInterval;
    state.waveBannerTimer = 1.6;

    state.shards.length = 0;
    state.particles.length = 0;
    state.popups.length = 0;
    state.rings.length = 0;

    // Tempatkan sejumlah serpihan aktif sesuai targetActive gelombang (gel 1: 4, gel 6: 10, gel 10-12: 15-17)
    const count = cfg.targetActive;
    const kindCycle = [SHARD_NORMAL, SHARD_FAST, SHARD_SPLITTER, SHARD_HEAVY];

    for (let i = 0; i < count; i += 1) {
      const clusterIdx = Math.floor(i / 3);
      const inCluster = i % 3;
      const baseAng = -0.55 + clusterIdx * 1.35;
      const ang = normalizeAngle(baseAng + (inCluster - 1) * 0.24);
      const dist = 135 + inCluster * 52 + (clusterIdx % 2) * 38;
      let kind = kindCycle[i % kindCycle.length];
      if (w === 1 && (kind === SHARD_HEAVY || kind === SHARD_SPLITTER)) {
        kind = i % 2 === 0 ? SHARD_FAST : SHARD_NORMAL;
      } else if (w === 2 && kind === SHARD_HEAVY) {
        kind = SHARD_SPLITTER;
      }
      const isChild = kind === SHARD_SPLITTER && i >= 4 && i % 4 === 2;
      const sh = createShard(kind, ang, dist, cfg.baseSpeed, CORE_X, CORE_Y, state.nextId++, isChild);
      if (kind === SHARD_HEAVY && i % 2 === 1) {
        sh.hp = 1;
        sh.cracked = true;
      }
      const trailLen = kind === SHARD_FAST ? 12 : 5;
      for (let t = trailLen; t >= 1; t -= 1) {
        sh.trail.push({
          x: sh.x - (sh.vx * t) / 55,
          y: sh.y - (sh.vy * t) / 55,
        });
      }
      state.shards.push(sh);
    }
    state.spawnedInWave = count;

    // Tambahkan 2 proyektil pantulan emas + ledakan partikel + popup skor besar "+600 RANTAI x6!"
    state.shieldAngle = -0.42;
    const defAngles = [-0.25, 0.32];
    const defDists = [148, 195];
    for (let d = 0; d < defAngles.length; d += 1) {
      const def = createShard(
        SHARD_FAST,
        defAngles[d],
        defDists[d],
        cfg.baseSpeed * 2.2,
        CORE_X,
        CORE_Y,
        state.nextId++
      );
      def.deflected = true;
      def.pierceLeft = 2;
      def.vx = Math.cos(defAngles[d] + 0.12) * 410;
      def.vy = Math.sin(defAngles[d] + 0.12) * 410;
      def.rotation = Math.atan2(def.vy, def.vx);
      for (let t = 10; t >= 1; t -= 1) {
        def.trail.push({
          x: def.x - (def.vx * t) / 65,
          y: def.y - (def.vy * t) / 65,
        });
      }
      state.shards.push(def);
    }

    state.chain = Math.max(4, Math.min(8, 2 + Math.ceil(w / 2)));
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.chainTimer = 3.2;

    const fxX = CORE_X + Math.cos(-0.22) * 155;
    const fxY = CORE_Y + Math.sin(-0.22) * 155;
    addParticles(fxX, fxY, 28, '#ffd166', 210, 5.8);
    addParticles(fxX, fxY, 16, '#ff5a5f', 175, 4.8);
    addParticles(CORE_X + 120, CORE_Y + 65, 18, '#00f5d4', 180, 5.0);
    addRing(fxX, fxY, 78, '#ffd166', 0.36);
    addRing(CORE_X, CORE_Y, SHIELD_RADIUS + 36, '#ffd166', 0.42);
    addPopup(
      fxX - 10,
      fxY - 34,
      `+${100 * state.chain} RANTAI x${state.chain}!`,
      '#ffd166',
      32
    );
  }

  return {
    state,
    reset,
    step,
    jumpToWave,
    advanceAfterUpgrade,
    addPopup,
    addParticles,
    addRing,
  };
}
