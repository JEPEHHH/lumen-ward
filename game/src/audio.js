// Sintesis suara prosedural menggunakan WebAudio API tanpa berkas audio eksternal.
// Mendukung efek pantulan, tabrakan berantai, tahan perisai, inti terkena, peningkatan,
// menang, dan kalah, serta dapat dimatikan/dinyalakan dengan tombol M atau window.__lumen.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (muted || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, endFreq, duration, type = 'sine', gainPeak = 0.14, delay = 0) {
    const audio = ensureContext();
    if (!audio) return;
    try {
      const start = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(40, freq), start);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(gainPeak, start + Math.min(0.015, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      // Abaikan jika browser memblokir autoplay sebelum interaksi
    }
  }

  return {
    pantul(braced = false) {
      playTone(braced ? 520 : 420, braced ? 880 : 680, 0.11, 'triangle', braced ? 0.16 : 0.12);
    },
    rantai(chain = 1) {
      const base = Math.min(1320, 480 + chain * 95);
      playTone(base, base * 1.35, 0.14, 'sine', 0.15);
      playTone(base * 1.5, base * 1.8, 0.12, 'triangle', 0.08, 0.03);
    },
    tahan() {
      playTone(220, 330, 0.09, 'sine', 0.09);
    },
    kena() {
      playTone(170, 58, 0.28, 'sawtooth', 0.18);
      playTone(120, 45, 0.32, 'triangle', 0.15, 0.02);
    },
    pilihNaik() {
      playTone(440, 554, 0.1, 'triangle', 0.13, 0);
      playTone(554, 659, 0.11, 'triangle', 0.13, 0.07);
      playTone(659, 880, 0.18, 'sine', 0.15, 0.14);
    },
    gelombangBaru() {
      playTone(330, 495, 0.16, 'sine', 0.1, 0);
    },
    menang() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        playTone(n, n * 1.02, 0.26, 'triangle', 0.14, idx * 0.09);
      });
    },
    kalah() {
      const notes = [392.0, 349.23, 311.13, 261.63];
      notes.forEach((n, idx) => {
        playTone(n, n * 0.92, 0.24, 'sawtooth', 0.11, idx * 0.1);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    matikan() {
      muted = true;
    },
    nyalakan() {
      muted = false;
    },
    isMuted() {
      return muted;
    },
  };
}
