// Daftar peningkatan (upgrades) yang ditawarkan setiap 3 gelombang.
// Setiap pilihan memberikan perubahan mekanik yang terasa langsung pada perisai, pantulan, atau stamina.

export const UPGRADE_POOL = [
  {
    id: 'busur_lebar',
    nama: 'Busur Surya',
    ikon: '⟪ ◈ ⟫',
    ringkas: '+28° Lebar Perisai',
    deskripsi: 'Memperlebar lengkung perisai cahaya sehingga mampu menangkis serpihan dari sudut lebih luas.',
    apply(mods) {
      mods.shieldArc += 0.48;
    },
  },
  {
    id: 'pantul_magnet',
    nama: 'Pantulan Pencari',
    ikon: '✦ ➔ ✦',
    ringkas: 'Pantulan Mengejar & +1 Tembus',
    deskripsi: 'Serpihan yang terpantul berbelok otomatis mencari serpihan gelap lain dan menembus 1 target ekstra.',
    apply(mods) {
      mods.homingStrength += 2.6;
      mods.pierceBonus += 1;
    },
  },
  {
    id: 'stamina_kilat',
    nama: 'Nadi Kencana',
    ikon: '⚡ ↻',
    ringkas: '+50% Pulih Stamina & Hemat Spasi',
    deskripsi: 'Stamina perisai pulih jauh lebih cepat dan menahan perisai (Spasi) lebih hemat energi.',
    apply(mods) {
      mods.staminaRegen *= 1.5;
      mods.staminaDrain *= 0.72;
    },
  },
  {
    id: 'prisma_pecah',
    nama: 'Prisma Ganda',
    ikon: '❖ ⑃',
    ringkas: 'Tembakan Pecahan Cahaya',
    deskripsi: 'Memantulkan serpihan memercikkan proyektil cahaya tambahan ke arah serpihan gelap terdekat.',
    apply(mods) {
      mods.splitCount += 1;
    },
  },
  {
    id: 'gelombang_kejut',
    nama: 'Denyut Aegis',
    ikon: '◎ 〰',
    ringkas: 'Spasi Memicu Gelombang Kejut',
    deskripsi: 'Menekan Spasi melepaskan cincin cahaya yang memperlambat serpihan gelap dan memperbesar pantulan.',
    apply(mods) {
      mods.shockwavePower += 1;
      mods.braceArcBonus += 0.25;
    },
  },
  {
    id: 'inti_pulih',
    nama: 'Restorasi Lumen',
    ikon: '♥ +1',
    ringkas: '+1 Integritas Inti & +25% Skor',
    deskripsi: 'Memulihkan 1 nyawa integritas inti (maks 4) serta menambah perolehan skor setiap pantulan.',
    apply(mods, state) {
      mods.scoreBonus *= 1.25;
      if (state) {
        state.maxIntegrity = Math.max(state.maxIntegrity, 3);
        if (state.integrity < state.maxIntegrity) {
          state.integrity += 1;
        } else {
          state.maxIntegrity = 4;
          state.integrity = 4;
        }
      }
    },
  },
];

export function createDefaultMods() {
  return {
    shieldArc: 1.18, // ~67.5 derajat dasar
    braceArcBonus: 0.45,
    homingStrength: 1.6, // sedikit bantuan arah dasar agar rantai seru sejak gelombang 1
    pierceBonus: 2, // jumlah tabrakan berantai per serpihan pantul
    staminaRegen: 28, // per detik
    staminaDrain: 38, // per detik saat Spasi ditahan
    splitCount: 0,
    shockwavePower: 0,
    scoreBonus: 1.0,
  };
}

/**
 * Memilih 2 peningkatan berbeda untuk ditawarkan kepada pemain pada gelombang kelipatan 3.
 */
export function rollUpgradeChoices(waveNumber, pickedIds = []) {
  const count = UPGRADE_POOL.length;
  const offset = (waveNumber * 2 + pickedIds.length) % count;
  const first = UPGRADE_POOL[offset];
  const second = UPGRADE_POOL[(offset + 1 + (waveNumber % 2)) % count];
  const choiceA = first;
  const choiceB = second.id === first.id ? UPGRADE_POOL[(offset + 2) % count] : second;
  return [choiceA, choiceB];
}

export function applyUpgrade(choice, mods, state) {
  if (!choice) return;
  choice.apply(mods, state);
  if (state && !state.upgrades.includes(choice.nama)) {
    state.upgrades.push(choice.nama);
  } else if (state) {
    state.upgrades.push(`${choice.nama}+`);
  }
}
