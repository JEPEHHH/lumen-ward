// Entitas dunia, fisika perisai & stamina, pantulan serpihan, tabrakan berantai,
// partikel, angka skor mengambang (floating popups), dan getaran layar.

import {
  MAX_WAVE,
  SHARD_FAST,
  SHARD_HEAVY,
  SHARD_NORMAL,
  SHARD_SPIRAL,
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
    shieldArc: 1.18,
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
    totalInWave: 10,
    spawnTimer: 0,
    waveBannerTimer: 0,
    shakeTime: 0,
    shakeMag: 0,
    coreFlash: 0,
    corePulse: 0,
    time: 0,
    nextId: 1,
    mods: createDefaultMods(),
  };

  function addShake(mag, duration = 0.18) {
    state.shakeMag = Math.max(state.shakeMag, mag);
    state.shakeTime = Math.max(state.shakeTime, duration);
  }

  function addPopup(x, y, text, color = '#ffd166', size = 22) {
    state.popups.push({
      x,
      y,
      vy: -48,
      text,
      color,
      size,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  function addParticles(x, y, count, color, speed = 150, size = 4) {
    for (let i = 0; i < count; i += 1) {
      const ang = rand() * Math.PI * 2;
      const spd = speed * (0.35 + rand() * 0.85);
      const life = 0.28 + rand() * 0.35;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: size * (0.65 + rand() * 0.6),
        life,
        maxLife: life,
      });
    }
  }

  function addRing(x, y, maxRadius, color = '#ffd166', duration = 0.45) {
    state.rings.push({
      x,
      y,
      radius: 24,
      maxRadius,
      color,
      life: duration,
      maxLife: duration,
    });
  }

  function setupWave(waveNum) {
    const cfg = getWaveConfig(waveNum);
    state.wave = cfg.wave;
    state.waveTitle = cfg.title;
    state.spawnedInWave = 0;
    state.totalInWave = cfg.totalShards;
    state.spawnTimer = 0.35;
    state.waveBannerTimer = 2.0;
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
    state.corePulse = 0;
    state.time = 0;
    state.nextId = 1;
    state.mods = createDefaultMods();
    state.shieldArc = state.mods.shieldArc;
    setupWave(1);
  }

  function spawnOneShard() {
    const cfg = getWaveConfig(state.wave);
    const kind = pickShardKind(cfg, rand());
    const angle = rand() * Math.PI * 2;
    const distance = 430 + rand() * 60;
    const shard = createShard(kind, angle, distance, cfg.baseSpeed, CORE_X, CORE_Y, state.nextId++);
    state.shards.push(shard);
    state.spawnedInWave += 1;
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
      if (dist < 10 || dist > 560) continue;
      const toOther = Math.atan2(dy, dx);
      const diff = Math.abs(angleDiff(toOther, moveAngle));
      if (diff > maxAngleDiff) continue;
      const metric = dist + diff * 120;
      if (metric < bestScore) {
        bestScore = metric;
        best = other;
      }
    }
    return best;
  }

  function deflectShard(shard, normalAngle) {
    shard.deflected = true;
    shard.bracedDeflect = state.bracing;
    shard.pierceLeft = state.mods.pierceBonus + (state.bracing ? 1 : 0);
    shard.chainLevel = 1;

    const reboundSpeed = Math.max(360, shard.speed * (state.bracing ? 2.45 : 2.05));
    let outAngle = normalAngle;

    // Arahkan sedikit ke serpihan gelap terdekat di separuh bidang luar agar rantai mudah terjadi
    shard.vx = Math.cos(outAngle) * reboundSpeed;
    shard.vy = Math.sin(outAngle) * reboundSpeed;
    const target = findNearestDarkShard(shard, 1.35);
    if (target) {
      const targetAngle = Math.atan2(target.y - shard.y, target.x - shard.x);
      const diff = angleDiff(targetAngle, outAngle);
      outAngle += diff * 0.62;
    }

    shard.speed = reboundSpeed;
    shard.vx = Math.cos(outAngle) * reboundSpeed;
    shard.vy = Math.sin(outAngle) * reboundSpeed;
    shard.rotation = outAngle;

    const baseGain = Math.round(
      40 * state.mods.scoreBonus * (state.bracing ? 1.5 : 1) * Math.max(1, state.chain)
    );
    state.score += baseGain;
    if (state.score > state.bestScore) state.bestScore = state.score;

    state.chainTimer = Math.max(state.chainTimer, 3.0);
    addParticles(shard.x, shard.y, state.bracing ? 14 : 9, '#ffd166', 180, 4.2);
    addPopup(
      shard.x,
      shard.y - 12,
      state.bracing ? `+${baseGain} TAHAN!` : `+${baseGain}`,
      '#fcf8ec',
      18
    );

    // Efek peningkatan Prisma Ganda: memercikkan proyektil cahaya tambahan
    if (state.mods.splitCount > 0) {
      for (let s = 0; s < state.mods.splitCount; s += 1) {
        const offset = (s % 2 === 0 ? 1 : -1) * (0.28 + s * 0.14);
        const splitAngle = outAngle + offset;
        const bolt = createShard(
          SHARD_FAST,
          0,
          0,
          reboundSpeed * 0.95,
          CORE_X,
          CORE_Y,
          state.nextId++
        );
        bolt.x = shard.x;
        bolt.y = shard.y;
        bolt.deflected = true;
        bolt.bracedDeflect = state.bracing;
        bolt.pierceLeft = 1;
        bolt.radius = 7;
        bolt.speed = reboundSpeed * 0.95;
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
      if (sh.deflected) continue;
      const dist = Math.max(1, Math.hypot(sh.x - CORE_X, sh.y - CORE_Y) - SHIELD_RADIUS);
      const t = dist / Math.max(40, sh.speed);
      if (t < bestTime) {
        bestTime = t;
        mostUrgent = sh;
      }
    }
    if (!mostUrgent) return state.shieldAngle + 0.015;
    return Math.atan2(mostUrgent.y - CORE_Y, mostUrgent.x - CORE_X);
  }

  function step(dt, inputState = {}, autoSteer = false) {
    let events = EVENT_NONE;
    state.time += dt;
    state.corePulse += dt * 3.2;

    if (state.waveBannerTimer > 0) state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);
    if (state.coreFlash > 0) state.coreFlash = Math.max(0, state.coreFlash - dt * 2.5);
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
        addRing(CORE_X, CORE_Y, SHIELD_RADIUS + 46 + state.mods.shockwavePower * 38, '#ffd166', 0.35);
        if (state.mods.shockwavePower > 0) {
          for (let i = 0; i < state.shards.length; i += 1) {
            const sh = state.shards[i];
            if (sh.deflected) continue;
            const d = Math.hypot(sh.x - CORE_X, sh.y - CORE_Y);
            if (d < SHIELD_RADIUS + 135) {
              sh.slowTimer = 1.6;
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

    state.shieldArc =
      state.mods.shieldArc + (state.bracing ? state.mods.braceArcBonus : 0);

    // 2. Rotasi Perisai (Mouse instan atau tombol <- -> / A D halus)
    if (autoSteer) {
      const target = computeAutoAngle();
      const diff = angleDiff(target, state.shieldAngle);
      state.shieldAngle = normalizeAngle(state.shieldAngle + diff * Math.min(1, dt * 11));
    } else {
      const dir = inputState.dir || 0;
      if (dir !== 0) {
        const turnSpeed = 4.9;
        state.shieldAngle = normalizeAngle(state.shieldAngle + dir * turnSpeed * dt);
      } else if (typeof inputState.pointerAngle === 'number') {
        const diff = angleDiff(inputState.pointerAngle, state.shieldAngle);
        // Respons sangat halus tanpa lag mengikuti sudut mouse
        state.shieldAngle = normalizeAngle(state.shieldAngle + diff * Math.min(1, dt * 28));
      }
    }

    // 3. Kemunculan serpihan dalam gelombang
    const cfg = getWaveConfig(state.wave);
    if (state.spawnedInWave < state.totalInWave) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnOneShard();
        state.spawnTimer = cfg.spawnInterval;
      }
    }

    // 4. Pembaruan gerak serpihan & deteksi pantulan perisai
    const halfArc = state.shieldArc / 2 + 0.12;
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const sh = state.shards[i];

      // Simpan jejak ekor (trail)
      sh.trail.push({ x: sh.x, y: sh.y });
      if (sh.trail.length > (sh.deflected ? 8 : 5)) sh.trail.shift();

      if (!sh.deflected) {
        const slowFactor = sh.slowTimer > 0 ? 0.48 : 1;
        if (sh.slowTimer > 0) sh.slowTimer = Math.max(0, sh.slowTimer - dt);

        if (sh.kind === SHARD_SPIRAL) {
          const toCenter = Math.atan2(CORE_Y - sh.y, CORE_X - sh.x);
          const spiralAngle = toCenter + sh.spiralRate * 0.55;
          sh.vx = Math.cos(spiralAngle) * sh.speed * slowFactor;
          sh.vy = Math.sin(spiralAngle) * sh.speed * slowFactor;
        } else {
          const toCenter = Math.atan2(CORE_Y - sh.y, CORE_X - sh.x);
          sh.vx = Math.cos(toCenter) * sh.speed * slowFactor;
          sh.vy = Math.sin(toCenter) * sh.speed * slowFactor;
        }
      } else if (state.mods.homingStrength > 0) {
        // Serpihan terpantul berbelok halus mengejar serpihan gelap terdekat
        const target = findNearestDarkShard(sh, 1.45);
        if (target) {
          const curAng = Math.atan2(sh.vy, sh.vx);
          const wantAng = Math.atan2(target.y - sh.y, target.x - sh.x);
          const diff = angleDiff(wantAng, curAng);
          const nextAng = curAng + Math.sign(diff) * Math.min(Math.abs(diff), state.mods.homingStrength * dt);
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
        // Cek apakah melintasi cincin perisai
        const hitBandInner = SHIELD_RADIUS - sh.radius - 10;
        const hitBandOuter = SHIELD_RADIUS + sh.radius + 10;
        if (dist <= hitBandOuter && prevDist >= hitBandInner) {
          const shardAngle = Math.atan2(sh.y - CORE_Y, sh.x - CORE_X);
          const diff = Math.abs(angleDiff(shardAngle, state.shieldAngle));
          if (diff <= halfArc) {
            sh.x = CORE_X + Math.cos(shardAngle) * (SHIELD_RADIUS + sh.radius + 2);
            sh.y = CORE_Y + Math.sin(shardAngle) * (SHIELD_RADIUS + sh.radius + 2);
            deflectShard(sh, shardAngle);
            addShake(state.bracing ? 4.5 : 2.5, 0.12);
            events |= EVENT_DEFLECT;
            continue;
          }
        }

        // Cek apakah mengenai inti cahaya
        if (dist <= CORE_RADIUS + sh.radius - 2) {
          state.shards.splice(i, 1);
          state.integrity = Math.max(0, state.integrity - 1);
          state.chain = 1;
          state.chainTimer = 0;
          state.coreFlash = 1;
          addShake(11, 0.32);
          addParticles(sh.x, sh.y, 22, '#ff5a5f', 220, 5.2);
          addRing(CORE_X, CORE_Y, 130, '#ff5a5f', 0.45);
          addPopup(CORE_X, CORE_Y - 36, 'INTI RETAK! -1', '#ff5a5f', 24);
          events |= EVENT_HIT;
          if (state.integrity <= 0) {
            events |= EVENT_LOSE;
          }
          continue;
        }
      } else {
        // Hapus serpihan pantulan yang sudah keluar jauh dari layar
        if (
          sh.x < -80 ||
          sh.x > FIELD_WIDTH + 80 ||
          sh.y < -80 ||
          sh.y > FIELD_HEIGHT + 80
        ) {
          state.shards.splice(i, 1);
        }
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
        if (dist <= proj.radius + target.radius + 8) {
          state.chain += 1;
          if (state.chain > state.maxChain) state.maxChain = state.chain;
          state.chainTimer = 3.4;

          const gained = Math.round(
            target.points * state.chain * state.mods.scoreBonus * (proj.bracedDeflect ? 1.25 : 1)
          );
          state.score += gained;
          if (state.score > state.bestScore) state.bestScore = state.score;

          addParticles(target.x, target.y, 18, '#ffd166', 210, 4.8);
          addParticles(target.x, target.y, 10, '#ff5a5f', 160, 3.8);
          addRing(target.x, target.y, 58 + Math.min(40, state.chain * 8), '#ffd166', 0.32);
          addPopup(
            target.x,
            target.y - 10,
            `+${gained} RANTAI x${state.chain}!`,
            state.chain >= 3 ? '#ffd166' : '#fcf8ec',
            Math.min(30, 20 + state.chain * 2)
          );
          addShake(Math.min(10, 3.5 + state.chain * 1.2), 0.18);
          events |= EVENT_CHAIN;

          // Jika serpihan berat (SHARD_HEAVY) hancur, ubah jadi pecahan cahaya berantai!
          if (target.kind === SHARD_HEAVY) {
            target.deflected = true;
            target.pierceLeft = 1;
            target.speed = 360;
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
            // Belokkan proyektil menuju target berikutnya agar kombo berlanjut
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

    // 6. Pembaruan partikel, cincin, dan teks skor mengambang
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
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
      pop.vy *= 0.95;
      pop.life -= dt;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }

    // 7. Cek penyelesaian gelombang
    let hostileRemaining = 0;
    for (let i = 0; i < state.shards.length; i += 1) {
      if (!state.shards[i].deflected) hostileRemaining += 1;
    }

    if (state.integrity > 0 && state.spawnedInWave >= state.totalInWave && hostileRemaining === 0) {
      if (state.wave >= MAX_WAVE) {
        events |= EVENT_WIN;
      } else if (state.wave % 3 === 0) {
        state.upgradeChoices = rollUpgradeChoices(state.wave, state.upgrades);
        events |= EVENT_UPGRADE;
      } else {
        setupWave(state.wave + 1);
        addPopup(CORE_X, CORE_Y - 95, `GELOMBANG ${state.wave}`, '#ffd166', 26);
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
      addRing(CORE_X, CORE_Y, 175, '#ffd166', 0.5);
      addPopup(CORE_X, CORE_Y - 72, `${chosen.nama} Aktif!`, '#ffd166', 24);
    }
    state.upgradeChoices = [];
    if (state.wave < MAX_WAVE) {
      setupWave(state.wave + 1);
    }
  }

  /**
   * Menyiapkan adegan aktif pada gelombang ke-n (untuk kait window.__lumen.keGelombang dan tangkapan layar).
   */
  function jumpToWave(waveNum) {
    const w = Math.max(1, Math.min(MAX_WAVE, Math.floor(Number(waveNum) || 1)));
    setupWave(w);
    state.shards.length = 0;
    state.particles.length = 0;
    state.popups.length = 0;
    state.rings.length = 0;

    const cfg = getWaveConfig(w);
    const angles = [-0.45, 0.35, 1.15, 2.25, -2.1, -1.25];
    const dists = [135, 185, 230, 260, 195, 290];
    const kinds = [
      SHARD_NORMAL,
      w >= 2 ? SHARD_FAST : SHARD_NORMAL,
      w >= 4 ? SHARD_SPIRAL : SHARD_NORMAL,
      w >= 6 ? SHARD_HEAVY : SHARD_FAST,
      SHARD_NORMAL,
      w >= 2 ? SHARD_FAST : SHARD_NORMAL,
    ];

    for (let i = 0; i < angles.length; i += 1) {
      const sh = createShard(kinds[i], angles[i], dists[i], cfg.baseSpeed, CORE_X, CORE_Y, state.nextId++);
      for (let t = 4; t >= 1; t -= 1) {
        sh.trail.push({
          x: sh.x - (sh.vx * t) / 60,
          y: sh.y - (sh.vy * t) / 60,
        });
      }
      state.shards.push(sh);
    }
    state.spawnedInWave = angles.length;

    // Tambahkan 1 proyektil pantulan emas dan efek rantai agar visual gameplay langsung hidup
    state.shieldAngle = -0.35;
    const def = createShard(SHARD_FAST, 0.1, 145, cfg.baseSpeed * 2, CORE_X, CORE_Y, state.nextId++);
    def.deflected = true;
    def.pierceLeft = 2;
    def.vx = Math.cos(0.28) * 380;
    def.vy = Math.sin(0.28) * 380;
    def.trail = [
      { x: def.x - 28, y: def.y - 8 },
      { x: def.x - 14, y: def.y - 4 },
    ];
    state.shards.push(def);

    state.chain = Math.min(5, 1 + Math.ceil(w / 3));
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.chainTimer = 2.8;
    addParticles(def.x - 16, def.y - 6, 14, '#ffd166', 140, 4.2);
    addRing(def.x - 16, def.y - 6, 52, '#ffd166', 0.35);
    addPopup(def.x - 10, def.y - 26, `+${200 * state.chain} RANTAI x${state.chain}!`, '#ffd166', 22);
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
