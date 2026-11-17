// Penggambaran visual dunia permainan LUMEN WARD: latar kosmik dengan puluhan butiran
// debu ruang angkasa ber-parallax ringan, lingkaran konsentris berdenyut sesuai irama
// gelombang, vignette halus di tepi, 4 jenis serpihan + jejak tipis serpihan cepat,
// partikel ledakan pekat, teks skor melayang besar, dan kilatan tepi layar merah tipis.

import { CORE_RADIUS, CORE_X, CORE_Y, FIELD_HEIGHT, FIELD_WIDTH, SHIELD_RADIUS } from './world.js';
import { SHARD_FAST, SHARD_HEAVY, SHARD_SPIRAL, SHARD_SPLITTER } from './waves.js';

export const PALETTE = {
  backdrop: '#060913',
  nightDeep: '#0b1124',
  nightMid: '#131d3b',
  wardLine: '#23325e',
  honey: '#f5b841',
  honeyBright: '#ffd166',
  ivory: '#fcf8ec',
  mutedIvory: '#c5c0b2',
  shardDark: '#1c112b',
  shardRim: '#ff5a5f',
  shardFast: '#ff9f1c',
  shardSplitter: '#00f5d4',
  shardSpiral: '#c77dff',
  shardHeavy: '#ff2a55',
  panelBg: 'rgba(11, 17, 36, 0.94)',
  panelBorder: '#f5b841',
};

// 84 butiran debu ruang angkasa dalam 3 lapisan parallax yang bergerak pelan
const DUST = Array.from({ length: 84 }, (_, i) => {
  const layer = (i % 3) + 1;
  return {
    x: (i * 173 + 61) % FIELD_WIDTH,
    y: (i * 137 + 39) % FIELD_HEIGHT,
    vx: ((i % 2 === 0 ? 1 : -1) * (4 + layer * 3.2)) * (0.7 + (i % 5) * 0.12),
    vy: ((i % 3 === 0 ? 1 : -1) * (2.5 + layer * 2.1)) * (0.7 + (i % 4) * 0.12),
    r: 0.9 + layer * 0.65,
    layer,
    phase: i * 0.63,
    tint: i % 5 === 0 ? '#ffd166' : i % 7 === 0 ? '#00f5d4' : '#fcf8ec',
  };
});

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(window.innerWidth * ratio));
    const h = Math.max(1, Math.round(window.innerHeight * ratio));
    canvas.width = w;
    canvas.height = h;
    view.scale = Math.min(w / FIELD_WIDTH, h / FIELD_HEIGHT);
    view.x = (w - FIELD_WIDTH * view.scale) / 2;
    view.y = (h - FIELD_HEIGHT * view.scale) / 2;
  }

  function drawBackdrop(state) {
    const grad = ctx.createRadialGradient(CORE_X, CORE_Y, 24, CORE_X, CORE_Y, 680);
    grad.addColorStop(0, '#1c2c5c');
    grad.addColorStop(0.5, PALETTE.nightDeep);
    grad.addColorStop(1, '#050812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Butiran debu ruang angkasa bergerak pelan + parallax ringan mengikuti arah perisai
    const parX = Math.cos(state.shieldAngle || 0);
    const parY = Math.sin(state.shieldAngle || 0);
    ctx.save();
    for (let i = 0; i < DUST.length; i += 1) {
      const d = DUST[i];
      const parallax = d.layer * 5.5;
      const dx = (d.x + state.time * d.vx - parX * parallax + FIELD_WIDTH * 4) % FIELD_WIDTH;
      const dy = (d.y + state.time * d.vy - parY * parallax + FIELD_HEIGHT * 4) % FIELD_HEIGHT;
      const alpha = 0.24 + 0.22 * Math.sin(state.time * 1.9 + d.phase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.tint;
      ctx.beginPath();
      ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Lingkaran konsentris yang berdenyut mengikuti irama gelombang
    ctx.save();
    const beatFreq = 2.1 + (state.wave || 1) * 0.22;
    const baseRadii = [SHIELD_RADIUS, 150, 230, 315, 405];
    for (let i = 0; i < baseRadii.length; i += 1) {
      const waveBeat = Math.sin(state.time * beatFreq - i * 0.7);
      const radius = baseRadii[i] + waveBeat * (2.2 + i * 0.6);
      const alpha = 0.14 + 0.08 * (waveBeat + 1) * 0.5;
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(245, 184, 65, ${alpha.toFixed(3)})`
        : `rgba(120, 175, 255, ${(alpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = i === 0 ? 2.2 : 1.6 + Math.max(0, waveBeat) * 0.9;
      ctx.beginPath();
      ctx.arc(CORE_X, CORE_Y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Garis kompas & aksen geometris berputar pelan
    ctx.strokeStyle = 'rgba(245, 184, 65, 0.11)';
    ctx.lineWidth = 1.4;
    for (let a = 0; a < 8; a += 1) {
      const ang = (a * Math.PI) / 4 + state.time * 0.03;
      ctx.beginPath();
      ctx.moveTo(CORE_X + Math.cos(ang) * 95, CORE_Y + Math.sin(ang) * 95);
      ctx.lineTo(CORE_X + Math.cos(ang) * 395, CORE_Y + Math.sin(ang) * 395);
      ctx.stroke();
    }
    ctx.restore();

    // Vignette halus di tepi agar fokus visual tertuju ke inti
    const vig = ctx.createRadialGradient(CORE_X, CORE_Y, 235, CORE_X, CORE_Y, 740);
    vig.addColorStop(0, 'rgba(4, 6, 14, 0)');
    vig.addColorStop(0.68, 'rgba(4, 6, 14, 0.22)');
    vig.addColorStop(1, 'rgba(2, 4, 10, 0.68)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  }

  function drawRings(state) {
    for (let i = 0; i < state.rings.length; i += 1) {
      const r = state.rings[i];
      const progress = 1 - r.life / r.maxLife;
      const curRadius = r.radius + (r.maxRadius - r.radius) * progress;
      const alpha = Math.max(0, (1 - progress) * 0.78);
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3.8 * (1 - progress * 0.45);
      ctx.beginPath();
      ctx.arc(r.x, r.y, curRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCore(state) {
    const pulse = Math.sin(state.corePulse) * 3.2;
    const r = CORE_RADIUS + pulse;

    // Aura cahaya luar inti
    const glow = ctx.createRadialGradient(CORE_X, CORE_Y, 6, CORE_X, CORE_Y, r * 2.6);
    if (state.coreFlash > 0) {
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.42, '#ff2a55');
      glow.addColorStop(1, 'rgba(255, 42, 85, 0)');
    } else {
      glow.addColorStop(0, PALETTE.ivory);
      glow.addColorStop(0.42, 'rgba(245, 184, 65, 0.62)');
      glow.addColorStop(1, 'rgba(245, 184, 65, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Kelopak kristal penanda integritas (nyawa inti)
    const maxLives = state.maxIntegrity || 3;
    for (let i = 0; i < maxLives; i += 1) {
      const ang = state.time * 0.95 + (i * Math.PI * 2) / maxLives;
      const px = CORE_X + Math.cos(ang) * (CORE_RADIUS + 15);
      const py = CORE_Y + Math.sin(ang) * (CORE_RADIUS + 15);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = i < state.integrity ? PALETTE.honeyBright : 'rgba(255, 90, 95, 0.25)';
      ctx.strokeStyle = i < state.integrity ? PALETTE.ivory : 'rgba(255, 90, 95, 0.6)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(0, -5.5);
      ctx.lineTo(-6.5, 0);
      ctx.lineTo(0, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Inti cahaya utama
    ctx.fillStyle = state.coreFlash > 0 ? '#ff2a55' : PALETTE.honey;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShield(state) {
    const start = state.shieldAngle - state.shieldArc / 2;
    const end = state.shieldAngle + state.shieldArc / 2;

    ctx.save();
    if (state.bracing) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.42)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start, end);
      ctx.stroke();
    }

    ctx.strokeStyle = state.bracing ? PALETTE.ivory : PALETTE.honeyBright;
    ctx.lineWidth = state.bracing ? 12 : 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start, end);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.ivory;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start + 0.04, end - 0.04);
    ctx.stroke();

    const midX = CORE_X + Math.cos(state.shieldAngle) * (SHIELD_RADIUS + 10);
    const midY = CORE_Y + Math.sin(state.shieldAngle) * (SHIELD_RADIUS + 10);
    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(midX, midY, state.bracing ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShards(state) {
    for (let i = 0; i < state.shards.length; i += 1) {
      const sh = state.shards[i];

      // Jejak tipis di belakang serpihan cepat & proyektil pantul
      if (sh.trail.length > 1) {
        ctx.save();
        if (sh.kind === SHARD_FAST || sh.deflected) {
          ctx.beginPath();
          ctx.moveTo(sh.trail[0].x, sh.trail[0].y);
          for (let t = 1; t < sh.trail.length; t += 1) {
            ctx.lineTo(sh.trail[t].x, sh.trail[t].y);
          }
          ctx.lineTo(sh.x, sh.y);
          ctx.strokeStyle = sh.deflected
            ? 'rgba(255, 209, 102, 0.62)'
            : 'rgba(255, 159, 28, 0.58)';
          ctx.lineWidth = sh.deflected ? 3.4 : 2.6;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        for (let t = 0; t < sh.trail.length; t += 1) {
          const pt = sh.trail[t];
          const ratio = (t + 1) / (sh.trail.length + 1);
          let col = `rgba(255, 90, 95, ${(ratio * 0.35).toFixed(2)})`;
          if (sh.deflected) col = `rgba(255, 209, 102, ${(ratio * 0.6).toFixed(2)})`;
          else if (sh.kind === SHARD_FAST) col = `rgba(255, 159, 28, ${(ratio * 0.52).toFixed(2)})`;
          else if (sh.kind === SHARD_SPLITTER) col = `rgba(0, 245, 212, ${(ratio * 0.42).toFixed(2)})`;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sh.radius * ratio * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rotation);

      if (sh.deflected) {
        // Tombak cahaya pantulan emas
        ctx.fillStyle = PALETTE.honeyBright;
        ctx.strokeStyle = PALETTE.ivory;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sh.radius * 1.5, 0);
        ctx.lineTo(-sh.radius * 0.85, -sh.radius * 0.8);
        ctx.lineTo(-sh.radius * 0.35, 0);
        ctx.lineTo(-sh.radius * 0.85, sh.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        let rim = PALETTE.shardRim;
        if (sh.kind === SHARD_FAST) rim = PALETTE.shardFast;
        else if (sh.kind === SHARD_SPLITTER) rim = PALETTE.shardSplitter;
        else if (sh.kind === SHARD_SPIRAL) rim = PALETTE.shardSpiral;
        else if (sh.kind === SHARD_HEAVY) rim = PALETTE.shardHeavy;

        ctx.fillStyle = PALETTE.shardDark;
        ctx.strokeStyle = rim;
        ctx.lineWidth = sh.kind === SHARD_HEAVY ? 3.0 : 2.5;

        ctx.beginPath();
        if (sh.kind === SHARD_HEAVY) {
          // Segi enam besar berlapis baja (2 pantulan untuk pecah)
          const sides = 6;
          for (let s = 0; s < sides; s += 1) {
            const a = (s * Math.PI * 2) / sides;
            const px = Math.cos(a) * sh.radius;
            const py = Math.sin(a) * sh.radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else if (sh.kind === SHARD_SPLITTER) {
          // Kristal kembar pemecah (terbelah jadi 2 anak saat terpantul)
          ctx.moveTo(sh.radius * 1.25, 0);
          ctx.lineTo(sh.radius * 0.2, -sh.radius * 0.95);
          ctx.lineTo(-sh.radius * 0.3, -sh.radius * 0.35);
          ctx.lineTo(-sh.radius * 1.15, -sh.radius * 0.7);
          ctx.lineTo(-sh.radius * 0.75, 0);
          ctx.lineTo(-sh.radius * 1.15, sh.radius * 0.7);
          ctx.lineTo(-sh.radius * 0.3, sh.radius * 0.35);
          ctx.lineTo(sh.radius * 0.2, sh.radius * 0.95);
          ctx.closePath();
        } else if (sh.kind === SHARD_FAST) {
          ctx.moveTo(sh.radius * 1.55, 0);
          ctx.lineTo(-sh.radius * 1.05, -sh.radius * 0.68);
          ctx.lineTo(-sh.radius * 0.5, 0);
          ctx.lineTo(-sh.radius * 1.05, sh.radius * 0.68);
          ctx.closePath();
        } else {
          ctx.moveTo(sh.radius * 1.25, 0);
          ctx.lineTo(0, -sh.radius * 0.88);
          ctx.lineTo(-sh.radius * 1.12, 0);
          ctx.lineTo(0, sh.radius * 0.88);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Detail khusus jenis Berat & Pemecah
        if (sh.kind === SHARD_HEAVY) {
          if (!sh.cracked) {
            ctx.strokeStyle = PALETTE.ivory;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, 0, sh.radius * 0.58, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Garis retakan menyala saat sisa 1 pantulan
            ctx.strokeStyle = PALETTE.honeyBright;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-sh.radius * 0.7, -sh.radius * 0.4);
            ctx.lineTo(0, 0);
            ctx.lineTo(sh.radius * 0.7, -sh.radius * 0.5);
            ctx.moveTo(0, 0);
            ctx.lineTo(sh.radius * 0.5, sh.radius * 0.6);
            ctx.stroke();
          }
        } else if (sh.kind === SHARD_SPLITTER && !sh.isChild) {
          // Dua inti kembar cyan di dalam serpihan pemecah
          ctx.fillStyle = PALETTE.ivory;
          ctx.beginPath();
          ctx.arc(sh.radius * 0.2, -sh.radius * 0.32, 2.6, 0, Math.PI * 2);
          ctx.arc(sh.radius * 0.2, sh.radius * 0.32, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(0, 0, sh.radius * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticlesAndPopups(state) {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      const alpha = Math.max(0, Math.min(1, (p.life / p.maxLife) * 1.25));
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.spark) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(2, p.size * 0.55);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Teks skor melayang: lebih besar dan pekat, hilang dalam 0,8 detik
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.popups.length; i += 1) {
      const pop = state.popups[i];
      const ratio = pop.life / pop.maxLife;
      const alpha = ratio > 0.3 ? 1.0 : Math.max(0, ratio / 0.3);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${pop.size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6.5;
      ctx.strokeStyle = '#050812';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }

  // Kilatan tepi layar merah tipis saat inti terkena
  function drawEdgeFlash(state) {
    const flash = Math.max(state.edgeFlash || 0, state.coreFlash || 0);
    if (flash <= 0.01) return;

    ctx.save();
    const alpha = Math.min(0.75, flash * 0.72);
    const edgeGrad = ctx.createRadialGradient(
      CORE_X,
      CORE_Y,
      FIELD_HEIGHT * 0.32,
      CORE_X,
      CORE_Y,
      FIELD_WIDTH * 0.62
    );
    edgeGrad.addColorStop(0, 'rgba(255, 42, 85, 0)');
    edgeGrad.addColorStop(0.78, `rgba(255, 42, 85, ${(alpha * 0.32).toFixed(3)})`);
    edgeGrad.addColorStop(1, `rgba(255, 42, 85, ${alpha.toFixed(3)})`);
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    ctx.strokeStyle = `rgba(255, 70, 95, ${Math.min(0.95, flash * 0.9).toFixed(3)})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, FIELD_WIDTH - 10, FIELD_HEIGHT - 10);
    ctx.restore();
  }

  function beginFrame(state) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let sx = 0;
    let sy = 0;
    if (state.shakeTime > 0 && state.shakeMag > 0) {
      sx = Math.sin(state.time * 58) * state.shakeMag;
      sy = Math.cos(state.time * 49) * state.shakeMag;
    }
    ctx.setTransform(
      view.scale,
      0,
      0,
      view.scale,
      view.x + sx * view.scale,
      view.y + sy * view.scale
    );

    drawBackdrop(state);
    drawRings(state);
    drawCore(state);
    drawShield(state);
    drawShards(state);
    drawParticlesAndPopups(state);

    // Kembalikan transformasi bersih (tanpa shake) untuk kilatan tepi, HUD, dan UI
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawEdgeFlash(state);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    ctx,
    beginFrame,
    resize,
  };
}
