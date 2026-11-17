// Daftar peningkatan (upgrades) yang ditawarkan setiap 3 gelombang.
// Setiap pilihan memiliki nama, kode ikon vektor, ringkasan, dan satu kalimat efek jelas.

export const UPGRADE_POOL = [
  {
    id: 'busur_lebar',
    nama: 'Busur Surya',
    ikon: '⟪ ◈ ⟫',
    ringkas: '+28° Lebar Perisai',
    deskripsi: 'Memperlebar busur perisai cahaya untuk menangkis gerombolan serpihan lebih mudah.',
    apply(mods) {
      mods.shieldArc += 0.48;
    },
  },
  {
    id: 'pantul_magnet',
    nama: 'Pantulan Pencari',
    ikon: '✦ ➔ ✦',
    ringkas: 'Pantulan Mengejar & +1 Tembus',
    deskripsi: 'Serpihan pantul berbelok otomatis mengejar musuh terdekat dan menembus 1 target ekstra.',
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
    deskripsi: 'Stamina perisai pulih 50% lebih cepat dan menahan Spasi jauh lebih hemat energi.',
    apply(mods) {
      mods.staminaRegen *= 1.5;
      mods.staminaDrain *= 0.72;
    },
  },
  {
    id: 'prisma_pecah',
    nama: 'Prisma Ganda',
    ikon: '❖ ⑃',
    ringkas: '+1 Proyektil Cahaya Ekstra',
    deskripsi: 'Setiap tangkisan perisai menembakkan pecahan tombak cahaya tambahan ke arah musuh.',
    apply(mods) {
      mods.splitCount += 1;
    },
  },
  {
    id: 'gelombang_kejut',
    nama: 'Denyut Aegis',
    ikon: '◎ 〰',
    ringkas: 'Spasi Memicu Gelombang Lambat',
    deskripsi: 'Menekan Spasi memancarkan cincin kejut yang memperlambat semua serpihan di sekitar inti.',
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
    deskripsi: 'Memulihkan 1 nyawa integritas inti (maks 4) dan meningkatkan seluruh perolehan skor 25%.',
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
    shieldArc: 1.32, // ~75 derajat dasar
    braceArcBonus: 0.52,
    homingStrength: 2.15,
    pierceBonus: 2,
    staminaRegen: 32,
    staminaDrain: 34,
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
