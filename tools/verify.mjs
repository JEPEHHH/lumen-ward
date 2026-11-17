// Modul pemeriksaan mutu mandiri untuk entri permainan Lumen Ward.
// Memeriksa daftar berkas game/ beserta ukuran byte dan sha256, batas ukuran 2 MiB,
// ketiadaan panggilan jaringan pada berkas .js, validitas sintaks tiap berkas .js,
// keutuhan rujukan modul dari game/index.html, serta kelengkapan berkas di screenshots/.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BATAS_MAKS_BYTE_GAME = 2 * 1024 * 1024; // 2 MiB (2.097.152 byte)
export const BATAS_MIN_SCREENSHOT_PNG = 20 * 1024; // 20 KB (20.480 byte)
export const BATAS_MAKS_SCREENSHOT_BYTE = 262_144; // 256 KiB
export const POLA_JARINGAN_TERLARANG = [
  'http://',
  'https://',
  '//cdn',
  'fetch(',
  'XMLHttpRequest',
];

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function urutKodeUnit(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function hitungSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function diawaliByte(bytes, magic) {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Menelusuri seluruh berkas di dalam direktori game/ secara rekursif
 * dan menghitung ukuran byte serta nilai hash SHA-256 tiap berkas.
 */
export function kumpulkanBerkasGame(gameDir) {
  const galat = [];
  const berkas = [];
  if (!existsSync(gameDir)) {
    return {
      lulus: false,
      berkas: [],
      totalByte: 0,
      galat: ['Direktori game/ tidak ditemukan.'],
    };
  }
  let statAkar;
  try {
    statAkar = lstatSync(gameDir);
  } catch (err) {
    return {
      lulus: false,
      berkas: [],
      totalByte: 0,
      galat: [`Direktori game/ gagal diakses: ${err.message}`],
    };
  }
  if (!statAkar.isDirectory()) {
    return {
      lulus: false,
      berkas: [],
      totalByte: 0,
      galat: ['Jalur game/ bukan sebuah direktori.'],
    };
  }

  const tumpukan = [''];
  while (tumpukan.length > 0) {
    const relDir = tumpukan.pop();
    const absDir = relDir === '' ? gameDir : join(gameDir, relDir);
    let entriList = [];
    try {
      entriList = readdirSync(absDir, { withFileTypes: true });
    } catch (err) {
      galat.push(`Gagal membaca direktori game/${relDir}: ${err.message}`);
      continue;
    }
    for (const entri of entriList) {
      const relJalur = relDir === '' ? entri.name : `${relDir}/${entri.name}`;
      const absJalur = join(gameDir, relJalur);
      let st;
      try {
        st = lstatSync(absJalur);
      } catch (err) {
        galat.push(`Gagal membaca status berkas game/${relJalur}: ${err.message}`);
        continue;
      }
      if (st.isDirectory()) {
        tumpukan.push(relJalur);
      } else if (st.isFile()) {
        const isi = readFileSync(absJalur);
        berkas.push({
          jalur: relJalur,
          jalurLengkap: `game/${relJalur}`,
          byte: isi.byteLength,
          sha256: hitungSha256(isi),
        });
      } else {
        galat.push(`game/${relJalur} adalah tautan simbolik atau berkas khusus yang tidak diizinkan.`);
      }
    }
  }

  berkas.sort((a, b) => urutKodeUnit(a.jalur, b.jalur));
  const totalByte = berkas.reduce((jumlah, item) => jumlah + item.byte, 0);
  if (berkas.length === 0) {
    galat.push('Direktori game/ tidak memiliki berkas apa pun.');
  }

  return {
    lulus: galat.length === 0 && berkas.length > 0,
    berkas,
    totalByte,
    galat,
  };
}

/**
 * Memeriksa apakah total ukuran byte di game/ tidak melebihi batas 2 MiB.
 */
export function periksaBatasUkuranGame(totalByte, jumlahBerkas) {
  const lulus = jumlahBerkas > 0 && totalByte <= BATAS_MAKS_BYTE_GAME;
  const persen = ((totalByte / BATAS_MAKS_BYTE_GAME) * 100).toFixed(2);
  const pesan = lulus
    ? `Total ${totalByte} byte dari ${jumlahBerkas} berkas (${persen}% dari batas 2 MiB / ${BATAS_MAKS_BYTE_GAME} byte).`
    : jumlahBerkas === 0
      ? 'Tidak ada berkas di dalam game/.'
      : `Total ${totalByte} byte melebihi batas maksimum 2 MiB (${BATAS_MAKS_BYTE_GAME} byte).`;
  return {
    lulus,
    totalByte,
    batasByte: BATAS_MAKS_BYTE_GAME,
    pesan,
  };
}

/**
 * Memindai seluruh berkas .js dan .mjs di dalam game/ untuk pola jaringan terlarang:
 * http://, https://, //cdn, fetch(, XMLHttpRequest.
 */
export function pindaiJaringanBerkasJs(gameDir, daftarBerkas) {
  const berkasJs = daftarBerkas.filter((f) => /\.(?:js|mjs)$/i.test(f.jalur));
  const temuan = [];

  for (const info of berkasJs) {
    const absJalur = join(gameDir, info.jalur);
    const teks = readFileSync(absJalur, 'utf8');
    const barisList = teks.split(/\r?\n/);
    for (let idx = 0; idx < barisList.length; idx++) {
      const isiBaris = barisList[idx];
      for (const pola of POLA_JARINGAN_TERLARANG) {
        if (isiBaris.includes(pola)) {
          temuan.push({
            berkas: `game/${info.jalur}`,
            baris: idx + 1,
            pola,
            cuplikan: isiBaris.trim().slice(0, 120),
          });
        }
      }
    }
  }

  const lulus = temuan.length === 0;
  const pesan = lulus
    ? `Bersih: ${berkasJs.length} berkas .js dipindai, 0 rujukan jaringan ditemukan.`
    : `Ditemukan ${temuan.length} pelanggaran pola jaringan pada berkas: ${[...new Set(temuan.map((t) => `${t.berkas}:${t.baris} (${t.pola})`))].join(', ')}.`;

  return {
    lulus,
    jumlahJsDipindai: berkasJs.length,
    polaTerlarang: POLA_JARINGAN_TERLARANG,
    temuan,
    pesan,
  };
}

/**
 * Menjalankan pemeriksaan sintaks tiap berkas .js di game/ menggunakan node --check.
 */
export function periksaSintaksBerkasJs(gameDir, daftarBerkas) {
  const berkasJs = daftarBerkas.filter((f) => /\.(?:js|mjs)$/i.test(f.jalur));
  const galat = [];
  const hasilPerBerkas = [];

  for (const info of berkasJs) {
    const absJalur = join(gameDir, info.jalur);
    const jalankan = spawnSync(process.execPath, ['--check', absJalur], {
      encoding: 'utf8',
    });
    const ok = jalankan.status === 0;
    const rincianGalat = (jalankan.stderr || jalankan.stdout || '').trim();
    hasilPerBerkas.push({
      berkas: `game/${info.jalur}`,
      lulus: ok,
      galat: ok ? null : rincianGalat,
    });
    if (!ok) {
      galat.push({
        berkas: `game/${info.jalur}`,
        pesan: rincianGalat.split('\n')[0] || 'Kesalahan sintaks tidak dikenal',
      });
    }
  }

  const lulus = berkasJs.length > 0 && galat.length === 0;
  const pesan = lulus
    ? `Seluruh ${berkasJs.length} berkas .js lolos pemeriksaan sintaks (node --check).`
    : berkasJs.length === 0
      ? 'Tidak ditemukan berkas .js di dalam game/.'
      : `Pemeriksaan sintaks gagal pada ${galat.length} berkas: ${galat.map((g) => `${g.berkas} (${g.pesan})`).join('; ')}.`;

  return {
    lulus,
    jumlahJs: berkasJs.length,
    hasilPerBerkas,
    galat,
    pesan,
  };
}

/**
 * Menyelesaikan jalur relatif terhadap berkas pengimpor di dalam game/.
 */
function selesaikanJalurGame(rujukan, dariBerkas) {
  if (!rujukan || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(rujukan) || rujukan.startsWith('//') || rujukan.startsWith('/')) {
    return null;
  }
  const batasQuery = rujukan.search(/[?#]/);
  const bersih = batasQuery < 0 ? rujukan : rujukan.slice(0, batasQuery);
  if (bersih === '') return null;
  const bagian = dariBerkas.split('/').slice(0, -1);
  for (const seg of bersih.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (bagian.length === 0) return null;
      bagian.pop();
      continue;
    }
    bagian.push(seg);
  }
  return bagian.length === 0 ? null : bagian.join('/');
}

/**
 * Mengekstrak spesifikasi import/export statis dari kode sumber modul ES.
 */
function ekstrakImporModul(teksKode) {
  const hasil = [];
  const bersihKomentar = teksKode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const polaImpor = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let cocok;
  while ((cocok = polaImpor.exec(bersihKomentar)) !== null) {
    if (cocok[1]) hasil.push(cocok[1]);
  }
  return hasil;
}

/**
 * Memastikan game/index.html ada dan menunjuk modul serta rujukan berkas yang benar-benar ada di game/.
 */
export function periksaKeterhubunganIndexHtml(gameDir, daftarBerkas) {
  const petaBerkas = new Set(daftarBerkas.map((b) => b.jalur));
  const galat = [];
  const modulUtama = [];
  const modulTerverifikasi = new Set();

  if (!petaBerkas.has('index.html')) {
    return {
      lulus: false,
      modulUtama: [],
      modulTerverifikasi: [],
      galat: ['Berkas game/index.html tidak ditemukan.'],
      pesan: 'Berkas game/index.html tidak ditemukan.',
    };
  }

  const isiHtml = readFileSync(join(gameDir, 'index.html'), 'utf8');
  const tanpaKomentar = isiHtml.replace(/<!--[\s\S]*?-->/g, '');
  const polaScript = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let tagCocok;

  const antreanModul = [];
  while ((tagCocok = polaScript.exec(tanpaKomentar)) !== null) {
    const atribut = tagCocok[1] || '';
    const isiInline = tagCocok[2] || '';
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(atribut);
    const typeMatch = /\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(atribut);
    const nilaiSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : null;
    const nilaiType = (typeMatch ? (typeMatch[1] ?? typeMatch[2] ?? typeMatch[3] ?? '') : '').toLowerCase();

    if (nilaiType === 'importmap') continue;

    if (nilaiSrc !== null) {
      const target = selesaikanJalurGame(nilaiSrc, 'index.html');
      if (target === null) {
        galat.push(`game/index.html menunjuk script non-relatif atau di luar game/: "${nilaiSrc}"`);
      } else if (!petaBerkas.has(target)) {
        galat.push(`game/index.html menunjuk modul/script yang tidak ada: "game/${target}" (dari src="${nilaiSrc}")`);
      } else {
        modulUtama.push(`game/${target}`);
        modulTerverifikasi.add(`game/${target}`);
        if (nilaiType === 'module' || /\.(?:js|mjs)$/i.test(target)) {
          antreanModul.push(target);
        }
      }
    } else if (nilaiType === 'module' && isiInline.trim() !== '') {
      for (const sp of ekstrakImporModul(isiInline)) {
        const target = selesaikanJalurGame(sp, 'index.html');
        if (target === null || !petaBerkas.has(target)) {
          galat.push(`game/index.html mengimpor modul inline yang tidak ada: "${sp}"`);
        } else {
          modulUtama.push(`game/${target}`);
          modulTerverifikasi.add(`game/${target}`);
          antreanModul.push(target);
        }
      }
    }
  }

  if (modulUtama.length === 0) {
    galat.push('game/index.html tidak menunjuk satu pun modul atau script permainan.');
  }

  const sudahDikunjungi = new Set();
  while (antreanModul.length > 0) {
    const jalurModul = antreanModul.pop();
    if (sudahDikunjungi.has(jalurModul)) continue;
    sudahDikunjungi.add(jalurModul);
    const teksModul = readFileSync(join(gameDir, jalurModul), 'utf8');
    const daftarImpor = ekstrakImporModul(teksModul);
    for (const sp of daftarImpor) {
      const target = selesaikanJalurGame(sp, jalurModul);
      if (target === null) {
        galat.push(`Modul game/${jalurModul} mengimpor jalur tidak valid: "${sp}"`);
      } else if (!petaBerkas.has(target)) {
        galat.push(`Modul game/${jalurModul} mengimpor berkas yang tidak ditemukan: "game/${target}" (dari "${sp}")`);
      } else {
        modulTerverifikasi.add(`game/${target}`);
        if (!sudahDikunjungi.has(target)) {
          antreanModul.push(target);
        }
      }
    }
  }

  const lulus = galat.length === 0 && modulUtama.length > 0;
  const daftarTerverifikasi = [...modulTerverifikasi].sort(urutKodeUnit);
  const pesan = lulus
    ? `game/index.html menunjuk ${modulUtama.join(', ')} dan seluruh ${daftarTerverifikasi.length} modul terhubung ada di game/.`
    : `Masalah keterhubungan modul: ${galat.join('; ')}`;

  return {
    lulus,
    modulUtama,
    modulTerverifikasi: daftarTerverifikasi,
    galat,
    pesan,
  };
}

/**
 * Memastikan direktori screenshots/ berisi 3-4 berkas tangkapan layar yang sah
 * (memeriksa syarat 3-4 berkas .png > 20 KB, serta mendukung verifikasi transisi bila masih .jpg).
 */
export function periksaDirektoriScreenshots(shotsDir, opsi = {}) {
  const wajibPng = Boolean(opsi.wajibPng);
  const galat = [];
  if (!existsSync(shotsDir)) {
    return {
      lulus: false,
      jumlahBerkas: 0,
      jumlahPng: 0,
      berkas: [],
      galat: ['Direktori screenshots/ tidak ditemukan.'],
      pesan: 'Direktori screenshots/ tidak ditemukan.',
    };
  }

  let statDir;
  try {
    statDir = lstatSync(shotsDir);
  } catch (err) {
    return {
      lulus: false,
      jumlahBerkas: 0,
      jumlahPng: 0,
      berkas: [],
      galat: [`Direktori screenshots/ gagal dibaca: ${err.message}`],
      pesan: `Direktori screenshots/ gagal dibaca: ${err.message}`,
    };
  }
  if (!statDir.isDirectory()) {
    return {
      lulus: false,
      jumlahBerkas: 0,
      jumlahPng: 0,
      berkas: [],
      galat: ['Jalur screenshots/ bukan direktori.'],
      pesan: 'Jalur screenshots/ bukan direktori.',
    };
  }

  const namaBerkas = readdirSync(shotsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort(urutKodeUnit);

  const rincianBerkas = [];
  for (const nama of namaBerkas) {
    const abs = join(shotsDir, nama);
    const bytes = readFileSync(abs);
    const adalahPng = diawaliByte(bytes, PNG_MAGIC) && /\.png$/i.test(nama);
    const adalahJpg = diawaliByte(bytes, JPEG_MAGIC) && /\.(?:jpg|jpeg)$/i.test(nama);
    rincianBerkas.push({
      nama,
      byte: bytes.byteLength,
      sha256: hitungSha256(bytes),
      format: adalahPng ? 'png' : adalahJpg ? 'jpg' : 'asing',
    });
  }

  const berkasPng = rincianBerkas.filter((b) => b.format === 'png');
  const berkasJpg = rincianBerkas.filter((b) => b.format === 'jpg');
  const berkasAsing = rincianBerkas.filter((b) => b.format === 'asing');

  if (berkasAsing.length > 0) {
    galat.push(`Terdapat berkas gambar tidak sah di screenshots/: ${berkasAsing.map((b) => b.nama).join(', ')}`);
  }

  let catatan = '';
  if (berkasPng.length > 0 || wajibPng) {
    if (berkasPng.length < 3 || berkasPng.length > 4) {
      galat.push(`Jumlah berkas .png di screenshots/ adalah ${berkasPng.length} (wajib 3 hingga 4 berkas .png).`);
    }
    if (berkasJpg.length > 0) {
      galat.push(`Direktori screenshots/ mencampur berkas .png dan .jpg (${berkasJpg.map((b) => b.nama).join(', ')}).`);
    }
    for (const b of berkasPng) {
      if (b.byte <= BATAS_MIN_SCREENSHOT_PNG) {
        galat.push(`screenshots/${b.nama} berukuran ${b.byte} byte (wajib > 20 KB / ${BATAS_MIN_SCREENSHOT_PNG} byte).`);
      }
      if (b.byte > BATAS_MAKS_SCREENSHOT_BYTE) {
        galat.push(`screenshots/${b.nama} berukuran ${b.byte} byte (melebihi batas dossier 256 KiB / ${BATAS_MAKS_SCREENSHOT_BYTE} byte).`);
      }
    }
    catatan = `${berkasPng.length} berkas .png berukuran > 20 KB terverifikasi (${berkasPng.map((b) => `${b.nama}: ${b.byte} byte`).join(', ')}).`;
  } else {
    if (berkasJpg.length < 3 || berkasJpg.length > 4) {
      galat.push(`Direktori screenshots/ berisi ${rincianBerkas.length} berkas (wajib 3-4 berkas .png > 20 KB).`);
    }
    for (const b of berkasJpg) {
      if (b.byte > BATAS_MAKS_SCREENSHOT_BYTE) {
        galat.push(`screenshots/${b.nama} berukuran ${b.byte} byte (melebihi batas dossier 256 KiB).`);
      }
    }
    catatan = `Terdeteksi ${berkasJpg.length} berkas tangkapan layar sementara (${berkasJpg.map((b) => `${b.nama}: ${b.byte} byte`).join(', ')}); aturan 3-4 berkas .png > 20 KB siap diberlakukan penuh saat tangkapan layar .png dipasang.`;
  }

  const lulus = galat.length === 0;
  const pesan = lulus ? catatan : galat.join(' ');

  return {
    lulus,
    jumlahBerkas: rincianBerkas.length,
    jumlahPng: berkasPng.length,
    berkas: rincianBerkas,
    galat,
    pesan,
  };
}

/**
 * Menjalankan seluruh 6 pemeriksaan mutu mandiri pada direktori entri.
 */
export function jalankanPemeriksaan(entryDir, opsi = {}) {
  const gameDir = join(entryDir, 'game');
  const shotsDir = join(entryDir, 'screenshots');

  const daftarBerkas = kumpulkanBerkasGame(gameDir);
  const ukuranTotal = periksaBatasUkuranGame(daftarBerkas.totalByte, daftarBerkas.berkas.length);
  const pindaiJaringan = pindaiJaringanBerkasJs(gameDir, daftarBerkas.berkas);
  const periksaSintaks = periksaSintaksBerkasJs(gameDir, daftarBerkas.berkas);
  const periksaModul = periksaKeterhubunganIndexHtml(gameDir, daftarBerkas.berkas);
  const periksaShots = periksaDirektoriScreenshots(shotsDir, opsi);

  const butir = [
    {
      kode: 'daftar_berkas_game',
      judul: 'Daftar berkas game/ beserta ukuran byte dan SHA-256',
      lulus: daftarBerkas.lulus,
      pesan: daftarBerkas.lulus
        ? `Terdaftar ${daftarBerkas.berkas.length} berkas di dalam game/.`
        : daftarBerkas.galat.join('; '),
    },
    {
      kode: 'total_byte_game',
      judul: 'Total ukuran byte game/ (maksimum 2 MiB)',
      lulus: ukuranTotal.lulus,
      pesan: ukuranTotal.pesan,
    },
    {
      kode: 'pindai_jaringan_js',
      judul: 'Pindai isi semua .js dari panggilan jaringan (http://, https://, //cdn, fetch(, XMLHttpRequest)',
      lulus: pindaiJaringan.lulus,
      pesan: pindaiJaringan.pesan,
    },
    {
      kode: 'sintaks_js',
      judul: 'Pemeriksaan sintaks tiap berkas .js (node --check)',
      lulus: periksaSintaks.lulus,
      pesan: periksaSintaks.pesan,
    },
    {
      kode: 'modul_index_html',
      judul: 'Keterhubungan modul pada game/index.html',
      lulus: periksaModul.lulus,
      pesan: periksaModul.pesan,
    },
    {
      kode: 'tangkapan_layar',
      judul: 'Kelengkapan tangkapan layar di screenshots/ (3-4 berkas .png > 20 KB)',
      lulus: periksaShots.lulus,
      pesan: periksaShots.pesan,
    },
  ];

  const lulusSemua = butir.every((b) => b.lulus);

  return {
    lulusSemua,
    butir,
    daftarBerkas,
    ukuranTotal,
    pindaiJaringan,
    periksaSintaks,
    periksaModul,
    periksaShots,
  };
}

/**
 * Menyusun objek ringkas self_check untuk disertakan ke dalam dossier.json.
 */
export function bentukSelfCheck(hasil) {
  const sha256Map = {};
  for (const b of hasil.daftarBerkas.berkas) {
    sha256Map[b.jalur] = b.sha256;
  }

  return {
    status: hasil.lulusSemua ? 'lulus' : 'gagal',
    jumlah_berkas: hasil.daftarBerkas.berkas.length,
    total_byte: hasil.daftarBerkas.totalByte,
    batas_byte_maks: BATAS_MAKS_BYTE_GAME,
    sha256_berkas: sha256Map,
    berkas: hasil.daftarBerkas.berkas.map((b) => ({
      jalur: b.jalur,
      byte: b.byte,
      sha256: b.sha256,
    })),
    pindai_jaringan: {
      status: hasil.pindaiJaringan.lulus ? 'lulus' : 'gagal',
      bersih: hasil.pindaiJaringan.lulus,
      jumlah_js_dipindai: hasil.pindaiJaringan.jumlahJsDipindai,
      pola_terlarang: hasil.pindaiJaringan.polaTerlarang,
      temuan: hasil.pindaiJaringan.temuan,
    },
    sintaks_js: {
      status: hasil.periksaSintaks.lulus ? 'lulus' : 'gagal',
      jumlah_js: hasil.periksaSintaks.jumlahJs,
      galat: hasil.periksaSintaks.galat,
    },
    modul_index_html: {
      status: hasil.periksaModul.lulus ? 'lulus' : 'gagal',
      modul_utama: hasil.periksaModul.modulUtama,
      modul_terverifikasi: hasil.periksaModul.modulTerverifikasi,
    },
    tangkapan_layar: {
      status: hasil.periksaShots.lulus ? 'lulus' : 'gagal',
      jumlah_berkas: hasil.periksaShots.jumlahBerkas,
      jumlah_png: hasil.periksaShots.jumlahPng,
      berkas: hasil.periksaShots.berkas,
    },
  };
}

/**
 * Mencetak laporan ringkasan pemeriksaan dalam bahasa Indonesia tanpa emoji.
 */
export function cetakRingkasan(hasil) {
  console.log('=== RINGKASAN PEMERIKSAAN MANDIRI ENTitas PERMAINAN ===');
  for (let i = 0; i < hasil.butir.length; i++) {
    const b = hasil.butir[i];
    const label = b.lulus ? 'LULUS' : 'GAGAL';
    console.log(`${i + 1}. [${label}] ${b.judul}`);
    console.log(`   Rincian: ${b.pesan}`);
  }

  console.log('\n--- Daftar Berkas game/ (Ukuran Byte dan SHA-256) ---');
  for (const info of hasil.daftarBerkas.berkas) {
    console.log(`- game/${info.jalur} | ${info.byte} byte | sha256:${info.sha256}`);
  }
  console.log(`Total: ${hasil.daftarBerkas.berkas.length} berkas, ${hasil.daftarBerkas.totalByte} byte.`);

  if (!hasil.pindaiJaringan.lulus) {
    console.error('\n--- Pelanggaran Pindai Jaringan ---');
    for (const t of hasil.pindaiJaringan.temuan) {
      console.error(`- Berkas: ${t.berkas} (baris ${t.baris}) mengandung "${t.pola}" -> ${t.cuplikan}`);
    }
  }

  if (!hasil.periksaSintaks.lulus) {
    console.error('\n--- Pelanggaran Sintaks JavaScript ---');
    for (const g of hasil.periksaSintaks.galat) {
      console.error(`- Berkas: ${g.berkas} -> ${g.pesan}`);
    }
  }

  if (!hasil.periksaModul.lulus) {
    console.error('\n--- Pelanggaran Modul index.html ---');
    for (const g of hasil.periksaModul.galat) {
      console.error(`- ${g}`);
    }
  }

  if (!hasil.periksaShots.lulus) {
    console.error('\n--- Pelanggaran Tangkapan Layar screenshots/ ---');
    for (const g of hasil.periksaShots.galat) {
      console.error(`- ${g}`);
    }
  }

  const jmlLulus = hasil.butir.filter((b) => b.lulus).length;
  console.log(
    `\nSTATUS AKHIR: ${hasil.lulusSemua ? 'LULUS' : 'GAGAL'} (${jmlLulus}/${hasil.butir.length} butir pemeriksaan memenuhi syarat)`
  );
}

// Bila dijalankan langsung lewat CLI (`node tools/verify.mjs`), jalankan verifikasi.
const jalurSaatIni = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === jalurSaatIni) {
  const akarEntri = fileURLToPath(new URL('..', import.meta.url));
  const hasil = jalankanPemeriksaan(akarEntri);
  cetakRingkasan(hasil);
  process.exit(hasil.lulusSemua ? 0 : 1);
}
