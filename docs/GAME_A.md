# LUMEN WARD (Batch A)

## Daftar Berkas & Tugasnya
- `game/index.html` — Kanvas utama permainan (1280x720 responsif) dan pemuat modul ES tanpa permintaan jaringan.
- `game/src/main.js` — Loop simulasi 60 Hz, transisi status layar, penyimpanan skor tertinggi, dan kait deterministik `window.__lumen`.
- `game/src/input.js` — Pembacaan sudut kursor mouse, tombol panah `←`/`→` (`A`/`D`), tahan perisai (`Spasi`), jeda (`P`), ulang (`R`), suara (`M`), dan klik UI.
- `game/src/world.js` — Fisika perisai & stamina, pantulan serpihan gelap menjadi proyektil cahaya, tabrakan berantai antar-serpihan, partikel, dan skor mengambang.
- `game/src/waves.js` — Konfigurasi Gelombang 1–12 dan 4 tipe serpihan gelap (`biasa`, `cepat`, `spiral`, `berat`).
- `game/src/upgrades.js` — Definisi 6 peningkatan perisai/pantulan/stamina yang dipilih setiap 3 gelombang (2 pilihan tiap kali).
- `game/src/render.js` — Penggambaran visual berpalet biru malam, kuning madu, putih gading, dan merah koral, lengkap dengan partikel serta getaran layar.
- `game/src/ui.js` — HUD lengkap (skor, gelombang, integritas inti, pengali rantai, stamina, petunjuk kendali) dan 5 panel layar (judul, peningkatan, jeda, kalah, menang).
- `game/src/audio.js` — Sintesis WebAudio prosedural (pantul, rantai, tahan perisai, inti kena, pilih peningkatan, menang, kalah).

## Kendali
- **Mouse** atau **← / → (A / D)**: Memutar perisai mengelilingi inti cahaya.
- **Spasi**: Menahan & memperlebar perisai (menggunakan stamina, memperkuat pantulan).
- **1 / 2 atau Klik Kartu**: Memilih peningkatan setiap 3 gelombang.
- **P**: Jeda / Lanjutkan | **R**: Mulai ulang | **M**: Matikan / Nyalakan suara.

## Cara Menang & Kalah
- **Menang**: Bertahan menjaga inti cahaya hingga menuntaskan **Gelombang 12**.
- **Kalah**: Inti cahaya kehilangan seluruh **3 nyawa Integritas** akibat terkena serpihan gelap.

## Hasil Uji
- `MAKEFUN_OUTPUT_DIR=out node main.ts`: Selesai tanpa galat (kode keluar 0), menghasilkan `out/dossier.json`, `out/game`, dan `out/screenshots`.
- Uji modul ES (`node --input-type=module`): Seluruh 8 modul di `game/src/` lolos parse & eksekusi, serta kait `window.__lumen` (`mulai`, `keGelombang`, `pilihNaik`, `keadaan`, `skor`, `matikanAudio`) terverifikasi.
- Pemeriksaan jaringan (`grep -rE "https?://" game/`): Kosong (0 rujukan jaringan).
