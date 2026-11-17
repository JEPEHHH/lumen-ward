# LUMEN WARD (Batch B)

## Perubahan per Berkas (Backup: `*.bak.20261118b`)
- `game/src/waves.js` — Tambah tipe `pemecah` (`SHARD_SPLITTER`) & `berat` 2-pantulan (`hp: 2`), komposisi berbeda tiap gelombang 1–12, target kepadatan aktif bertahap (`[4..16]`), serta konfigurasi masuk bergerombol (`burstSize`, `burstInterval`).
- `game/src/world.js` — Sistem masuk bergerombol (`spawnCluster`), mekanik serpihan berat (retak pada pantulan ke-1, hancur pada pantulan ke-2), pemecah (terbelah jadi 2 anak saat terpantul), teks skor melayang besar berdurasi 0,8 dtk, ledakan partikel pekat, getaran layar, kilatan tepi merah (`edgeFlash`), serta adegan padat di `jumpToWave`.
- `game/src/render.js` — 84 butiran debu kosmik 3-lapis ber-parallax ringan, 5 lingkaran konsentris berdenyut sesuai irama gelombang, vignette halus di tepi, jejak tipis di belakang serpihan cepat, partikel percikan & ledakan pekat, kilatan tepi layar merah tipis, serta teks melayang tebal ber-outline gelap.
- `game/src/ui.js` — Seluruh teks HUD minimal 20 px dengan angka skor 42 px tebal (`900`), layar peningkatan dengan 2 kartu besar bersebelahan + ikon gambar vektor (`drawUpgradeVectorIcon`) + 1 kalimat efek jelas, serta layar menang/kalah dengan judul besar, skor akhir, rantai terpanjang, gelombang tercapai, dan tombol mulai ulang.
- `game/src/upgrades.js` — Penyesuaian ringkasan & 1 kalimat efek per kartu serta parameter dasar perisai/pantulan.
- `game/src/main.js` — Pembaruan adegan kait `window.__lumen` (`mulai`, `keGelombang`, `pilihNaik`, `keadaan`, `skor`, `matikanAudio`) agar menampilkan aksi padat, partikel, dan kilatan tepi.

## Metode Uji & Angka Keseimbangan yang Diukur
- **Metode uji**: Simulasi deterministik 60 Hz (`node --input-type=module`, 20 seed) dengan 2 profil bot: *Pemain Biasa* (tunda reaksi 140 ms, galat bidik ±0,16 rad, laju putar 7,2 rad/dtk, Spasi saat terdesak) dan *Pemain Ceroboh* (tunda 250 ms, galat ±0,34 rad, tanpa Spasi).
- **Kepadatan serpihan hidup rata-rata**: Gelombang 1 = **4,8** (target ±4), Gelombang 6 = **9,8** (target ±10), Gelombang 10 = **14,2**, Gelombang 12 = **15,5** (target ±16).
- **Durasi & rasio menang**: *Pemain Biasa* menang **50,0%** (rata-rata mencapai Gelombang **11,3**) dengan waktu tuntas Gelombang 12 rata-rata **7,16 menit (429 detik)** — tepat di rentang target 6–9 menit; *Pemain Ceroboh* menang **0%** (gugur rata-rata di Gelombang **6,7**).

## Hal yang Belum Selesai
- Tangkapan layar di `screenshots/*.jpg` belum dirender ulang dari kanvas baru bila diperlukan oleh pipeline luar; kode sumber dan mode `?shot=` sudah siap.
