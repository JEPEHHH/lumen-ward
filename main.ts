// Pintu masuk utama pengemasan dan pemeriksaan mandiri Lumen Ward (Node 22, pustaka standar).
// Mode pemakaian:
//   1. Pemeriksaan mutu mandiri saja (tanpa menulis dossier):
//      node main.ts --verify
//   2. Pemeriksaan mutu mandiri sekaligus menyusun keluaran dan dossier.json:
//      MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bentukSelfCheck,
  cetakRingkasan,
  jalankanPemeriksaan,
} from './tools/verify.mjs';
import {
  buildDossier,
  canonicalJson,
  DOSSIER_MAX_BYTES,
  type DossierCaps,
} from './vendor/makefun-game.ts';

interface SasaranKeluaran {
  direktoriEntri: string;
  direktoriKeluaran: string;
  modeVerifikasiSaja: boolean;
  wajibPngKetat: boolean;
}

const BATAS_DOSSIER: DossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function bacaArgumenCli(argv: readonly string[]): SasaranKeluaran {
  const direktoriEntri = fileURLToPath(new URL('.', import.meta.url));
  const mentahOut = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const direktoriKeluaran = resolve(direktoriEntri, mentahOut);
  const modeVerifikasiSaja = argv.includes('--verify') || argv.includes('-v');
  const wajibPngKetat = argv.includes('--strict-png') || process.env.STRICT_PNG === '1';

  return {
    direktoriEntri,
    direktoriKeluaran,
    modeVerifikasiSaja,
    wajibPngKetat,
  };
}

function salinDirektoriKeluaran(direktoriEntri: string, direktoriKeluaran: string): void {
  const sumberGame = join(direktoriEntri, 'game');
  const sumberShots = join(direktoriEntri, 'screenshots');
  const tujuanGame = join(direktoriKeluaran, 'game');
  const tujuanShots = join(direktoriKeluaran, 'screenshots');

  mkdirSync(direktoriKeluaran, { recursive: true });

  if (existsSync(tujuanGame)) {
    rmSync(tujuanGame, { recursive: true, force: true });
  }
  cpSync(sumberGame, tujuanGame, { recursive: true });

  if (existsSync(tujuanShots)) {
    rmSync(tujuanShots, { recursive: true, force: true });
  }
  mkdirSync(tujuanShots, { recursive: true });
  if (existsSync(sumberShots)) {
    cpSync(sumberShots, tujuanShots, { recursive: true });
  }
}

function susunDanTulisDossier(
  direktoriKeluaran: string,
  selfCheck: ReturnType<typeof bentukSelfCheck>,
): { jalurDossier: string; ukuranByte: number } {
  const byteDasar = buildDossier(direktoriKeluaran, BATAS_DOSSIER);
  const teksDasar = Buffer.from(byteDasar.buffer, byteDasar.byteOffset, byteDasar.byteLength).toString('utf8');
  const dokumenDossier = JSON.parse(teksDasar) as Record<string, unknown>;

  dokumenDossier.self_check = selfCheck;

  const jsonKanonik = canonicalJson(dokumenDossier);
  const byteAkhir = Buffer.from(jsonKanonik, 'utf8');
  if (byteAkhir.byteLength > DOSSIER_MAX_BYTES) {
    throw new Error(
      `Ukuran dossier.json (${byteAkhir.byteLength} byte) melebihi batas maksimum ${DOSSIER_MAX_BYTES} byte.`,
    );
  }

  const jalurDossier = join(direktoriKeluaran, 'dossier.json');
  writeFileSync(jalurDossier, byteAkhir);
  return {
    jalurDossier,
    ukuranByte: byteAkhir.byteLength,
  };
}

function jalankan(): void {
  const konfigurasi = bacaArgumenCli(process.argv.slice(2));
  const hasilPemeriksaan = jalankanPemeriksaan(konfigurasi.direktoriEntri, {
    wajibPng: konfigurasi.wajibPngKetat,
  });

  cetakRingkasan(hasilPemeriksaan);

  if (konfigurasi.modeVerifikasiSaja) {
    if (!hasilPemeriksaan.lulusSemua) {
      console.error('Pemeriksaan mandiri gagal pada mode --verify. Dossier tidak ditulis.');
      process.exit(1);
    }
    console.log('Mode --verify selesai: seluruh pemeriksaan lulus, tidak menulis berkas dossier.');
    process.exit(0);
  }

  if (!hasilPemeriksaan.lulusSemua) {
    console.error('Pemeriksaan mandiri gagal. Penyusunan dossier dibatalkan.');
    process.exit(1);
  }

  salinDirektoriKeluaran(konfigurasi.direktoriEntri, konfigurasi.direktoriKeluaran);
  const ringkasanSelfCheck = bentukSelfCheck(hasilPemeriksaan);
  const infoDossier = susunDanTulisDossier(konfigurasi.direktoriKeluaran, ringkasanSelfCheck);

  console.log(
    `\nPenyusunan selesai: ${infoDossier.jalurDossier} tertulis (${infoDossier.ukuranByte} byte) dengan bagian self_check (${ringkasanSelfCheck.jumlah_berkas} berkas game, ${ringkasanSelfCheck.total_byte} byte).`,
  );
}

jalankan();
