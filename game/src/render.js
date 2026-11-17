// Penggambaran visual dunia permainan LUMEN WARD: latar kosmik biru malam,
// cincin ward geometris, inti cahaya (Lumen Core), busur perisai, serpihan gelap
// & serpihan pantulan emas, partikel, teks skor mengambang, dan getaran layar.

import { CORE_RADIUS, CORE_X, CORE_Y, FIELD_HEIGHT, FIELD_WIDTH, SHIELD_RADIUS } from './world.js';
import { SHARD_FAST, SHARD_HEAVY, SHARD_SPIRAL } from './waves.js';

export const PALETTE = {
  backdrop: '#060913',
  nightDeep: '#0b1124',
  nightMid: '#131d3b',
  wardLine: '#23325e',
  honey: '#f5b841',
  honeyBright: '#ffd166',
  ivory: '#fcf8ec',
  mutedIvory: '#b5b0a1',
  shardDark: '#1c112b',
  shardRim: '#ff5a5f',
  shardFast: '#ff9f1c',
  shardSpiral: '#c77dff',
  shardHeavy: '#ff2a55',
  panelBg: 'rgba(11, 17, 36, 0.92)',
  panelBorder: '#f5b841',
};

const STARS = Array.from({ length: 48 }, (_, i) => ({
  x: ((i * 271 + 97) % (FIELD_WIDTH - 40)) + 20,
  y: ((i * 193 + 53) % (FIELD_HEIGHT - 40)) + 20,
  r: 1 + (i % 3) * 0.65,
  phase: i * 0.7,
}));

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
    const grad = ctx.createRadialGradient(CORE_X, CORE_Y, 30, CORE_X, CORE_Y, 680);
    grad.addColorStop(0, '#18254c');
    grad.addColorStop(0.55, PALETTE.nightDeep);
    grad.addColorStop(1, '#070b18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Bintang latar lembut
    for (let i = 0; i < STARS.length; i += 1) {
      const s = STARS[i];
      const alpha = 0.22 + 0.18 * Math.sin(state.time * 1.8 + s.phase);
      ctx.fillStyle = `rgba(252, 248, 236, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cincin geometris arena
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 184, 65, 0.11)';
    ctx.lineWidth = 1.5;
    const radii = [SHIELD_RADIUS, 165, 265, 360];
    for (let i = 0; i < radii.length; i += 1) {
      ctx.beginPath();
      ctx.arc(CORE_X, CORE_Y, radii[i], 0, Math.PI * 2);
      ctx.stroke();
    }

    // Garis kompas tipis
    for (let a = 0; a < 8; a += 1) {
      const ang = (a * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(CORE_X + Math.cos(ang) * 95, CORE_Y + Math.sin(ang) * 95);
      ctx.lineTo(CORE_X + Math.cos(ang) * 355, CORE_Y + Math.sin(ang) * 355);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRings(state) {
    for (let i = 0; i < state.rings.length; i += 1) {
      const r = state.rings[i];
      const progress = 1 - r.life / r.maxLife;
      const curRadius = r.radius + (r.maxRadius - r.radius) * progress;
      const alpha = Math.max(0, (1 - progress) * 0.65);
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, curRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCore(state) {
    const pulse = Math.sin(state.corePulse) * 3;
    const r = CORE_RADIUS + pulse;

    // Aura cahaya luar inti
    const glow = ctx.createRadialGradient(CORE_X, CORE_Y, 6, CORE_X, CORE_Y, r * 2.4);
    if (state.coreFlash > 0) {
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.4, '#ff5a5f');
      glow.addColorStop(1, 'rgba(255, 90, 95, 0)');
    } else {
      glow.addColorStop(0, PALETTE.ivory);
      glow.addColorStop(0.4, 'rgba(245, 184, 65, 0.55)');
      glow.addColorStop(1, 'rgba(245, 184, 65, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Kelopak kristal penanda integritas (nyawa inti)
    const maxLives = state.maxIntegrity || 3;
    for (let i = 0; i < maxLives; i += 1) {
      const ang = state.time * 0.9 + (i * Math.PI * 2) / maxLives;
      const px = CORE_X + Math.cos(ang) * (CORE_RADIUS + 14);
      const py = CORE_Y + Math.sin(ang) * (CORE_RADIUS + 14);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = i < state.integrity ? PALETTE.honeyBright : 'rgba(255, 90, 95, 0.22)';
      ctx.strokeStyle = i < state.integrity ? PALETTE.ivory : 'rgba(255, 90, 95, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(0, -5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Inti cahaya utama
    ctx.fillStyle = state.coreFlash > 0 ? '#ff5a5f' : PALETTE.honey;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 0.78, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShield(state) {
    const start = state.shieldAngle - state.shieldArc / 2;
    const end = state.shieldAngle + state.shieldArc / 2;

    ctx.save();
    // Aura perisai saat ditahan dengan Spasi (Bracing)
    if (state.bracing) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.38)';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start, end);
      ctx.stroke();
    }

    // Busur utama perisai kuning madu + putih gading
    ctx.strokeStyle = state.bracing ? PALETTE.ivory : PALETTE.honeyBright;
    ctx.lineWidth = state.bracing ? 11 : 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start, end);
    ctx.stroke();

    // Lapisan inti gading di tengah perisai
    ctx.strokeStyle = PALETTE.ivory;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, SHIELD_RADIUS, start + 0.05, end - 0.05);
    ctx.stroke();

    // Penanda ujung busur & panah tengah arah perisai
    const midX = CORE_X + Math.cos(state.shieldAngle) * (SHIELD_RADIUS + 9);
    const midY = CORE_Y + Math.sin(state.shieldAngle) * (SHIELD_RADIUS + 9);
    ctx.fillStyle = PALETTE.ivory;
    ctx.beginPath();
    ctx.arc(midX, midY, state.bracing ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShards(state) {
    for (let i = 0; i < state.shards.length; i += 1) {
      const sh = state.shards[i];

      // Gambar jejak (trail)
      if (sh.trail.length > 1) {
        ctx.save();
        for (let t = 0; t < sh.trail.length; t += 1) {
          const pt = sh.trail[t];
          const ratio = (t + 1) / (sh.trail.length + 1);
          ctx.fillStyle = sh.deflected
            ? `rgba(255, 209, 102, ${(ratio * 0.55).toFixed(2)})`
            : `rgba(255, 90, 95, ${(ratio * 0.35).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sh.radius * ratio * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rotation);

      if (sh.deflected) {
        // Serpihan yang sudah terpantul: tombak cahaya emas & putih gading
        ctx.fillStyle = PALETTE.honeyBright;
        ctx.strokeStyle = PALETTE.ivory;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.radius * 1.45, 0);
        ctx.lineTo(-sh.radius * 0.8, -sh.radius * 0.75);
        ctx.lineTo(-sh.radius * 0.35, 0);
        ctx.lineTo(-sh.radius * 0.8, sh.radius * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Serpihan gelap berdasarkan jenisnya
        let rim = PALETTE.shardRim;
        if (sh.kind === SHARD_FAST) rim = PALETTE.shardFast;
        else if (sh.kind === SHARD_SPIRAL) rim = PALETTE.shardSpiral;
        else if (sh.kind === SHARD_HEAVY) rim = PALETTE.shardHeavy;

        ctx.fillStyle = PALETTE.shardDark;
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2.4;

        ctx.beginPath();
        if (sh.kind === SHARD_HEAVY) {
          const sides = 6;
          for (let s = 0; s < sides; s += 1) {
            const a = (s * Math.PI * 2) / sides;
            const px = Math.cos(a) * sh.radius;
            const py = Math.sin(a) * sh.radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else if (sh.kind === SHARD_FAST) {
          ctx.moveTo(sh.radius * 1.4, 0);
          ctx.lineTo(-sh.radius, -sh.radius * 0.65);
          ctx.lineTo(-sh.radius * 0.5, 0);
          ctx.lineTo(-sh.radius, sh.radius * 0.65);
          ctx.closePath();
        } else {
          ctx.moveTo(sh.radius * 1.2, 0);
          ctx.lineTo(0, -sh.radius * 0.85);
          ctx.lineTo(-sh.radius * 1.1, 0);
          ctx.lineTo(0, sh.radius * 0.85);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Inti merah menyala di dalam serpihan gelap
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(0, 0, sh.radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticlesAndPopups(state) {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.popups.length; i += 1) {
      const pop = state.popups[i];
      const alpha = Math.max(0, Math.min(1, (pop.life / pop.maxLife) * 1.4));
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${pop.size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#060913';
      ctx.fillText(pop.text, pop.x + 1.5, pop.y + 1.5);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }

  function beginFrame(state) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let sx = 0;
    let sy = 0;
    if (state.shakeTime > 0 && state.shakeMag > 0) {
      sx = Math.sin(state.time * 55) * state.shakeMag;
      sy = Math.cos(state.time * 47) * state.shakeMag;
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

    // Kembalikan transformasi bersih (tanpa shake) untuk penggambaran HUD & UI
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    ctx,
    beginFrame,
    resize,
  };
}
