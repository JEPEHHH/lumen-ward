# LUMEN WARD (Batch C — Pintu Masuk & Pemeriksaan Mandiri)

## Berkas yang Ditulis / Diubah (Cadangan: `main.ts.bak.20261118c`)
- `main.ts` — Ditulis ulang untuk menjalankan pemeriksaan mutu mandiri sebelum menyalin `game/` serta `screenshots/` ke `MAKEFUN_OUTPUT_DIR`, mendukung opsi `--verify` (keluar tanpa menulis dossier), dan menyisipkan bagian `self_check` ke dalam `dossier.json` yang disusun lewat `vendor/makefun-game.ts`.
- `tools/verify.mjs` — Modul pemeriksaan mandiri (daftar berkas `game/` + ukuran byte + SHA-256, batas ukuran 2 MiB, pindai jaringan `http://`, `https://`, `//cdn`, `fetch(`, `XMLHttpRequest` pada `.js`, uji sintaks `node --check`, keterhubungan modul `game/index.html`, dan pemeriksaan `screenshots/`).

## Ringkasan Isi `self_check` pada Dossier
- Memuat `status`, `jumlah_berkas` (15 berkas), `total_byte` (159.815 byte), peta `sha256_berkas`, rincian `berkas`, hasil `pindai_jaringan` (`bersih: true`, 8 berkas `.js`), `sintaks_js`, `modul_index_html`, dan `tangkapan_layar`.

## Hasil Tiga Pengujian
1. **Uji 1 (`MAKEFUN_OUTPUT_DIR=out node main.ts`)**: LULUS (kode keluar 0). Menyalin `game/` dan `screenshots/`, menjalankan 6 pemeriksaan mandiri, dan menulis `out/dossier.json` (187.608 byte) lengkap dengan objek `self_check` tanpa galat.
2. **Uji 2 (`node main.ts --verify`)**: LULUS (kode keluar 0). Mencetak ringkasan 6 butir pemeriksaan mandiri beserta daftar berkas `game/` (byte + SHA-256) dalam bahasa Indonesia tanpa menulis dossier.
3. **Uji 3 (Uji kegagalan `game/uji-cdn.js` berisi `fetch("https://x")`)**: GAGAL sesuai harapan (kode keluar 1). Melaporkan pelanggaran pada `game/uji-cdn.js:1` untuk pola `https://` dan `fetch(`, lalu kembali LULUS (kode keluar 0) setelah berkas uji dihapus.
