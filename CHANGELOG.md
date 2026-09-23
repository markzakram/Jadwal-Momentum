# Catatan Perubahan

Nomor versi hidup di `package.json` dan hanya di sana. Ia disuntikkan saat build
lewat `next.config.mjs`, lalu tampil di kepala halaman — jadi versi yang terlihat
di situs selalu versi yang benar-benar ter-deploy, bukan angka yang ditulis
tangan lalu lupa dinaikkan.

**Naikkan versinya tiap kali ada yang di-deploy:**

```bash
npm version patch --no-git-tag-version   # 1.0.1 -> 1.0.2  perbaikan
npm version minor --no-git-tag-version   # 1.0.1 -> 1.1.0  fitur baru
npm version major --no-git-tag-version   # 1.0.1 -> 2.0.0  perubahan besar
```

Arahkan kursor ke angka versi di situs untuk melihat commit yang di-deploy.
Nomor versi bisa lupa dinaikkan; commit tidak bisa.

---

## 1.1.0

Dashboard kini menjawab dua pertanyaan, bukan satu: selain "jadwalnya kapan",
juga "minggu ini kita mendorong apa".

### Tampilan Momen

Tampilan keenam. Jadwal diterjemahkan jadi lima momen pemasaran, dari yang
paling bernilai:

| Momen | Artinya |
|---|---|
| **Jendela persiapan** | Sudah mendaftar, tes belum mulai — saat materi persiapan paling mungkin dibeli |
| **Antar tahap** | Tahap 1 selesai, tahap 2 belum — yang lolos butuh materi lanjutan |
| **Menjelang tutup** | Pendaftaran tutup ≤ 7 hari — dorong urgensi |
| **Baru dibuka** | Dibuka ≤ 7 hari lalu — dorong kesadaran |
| **Segera dibuka** | Buka ≤ 14 hari — siapkan materi sebelum ramai |

Tanpa kolom baru di sheet; semuanya dihitung dari tanggal yang ada. Tombol ebook
ditaruh langsung di tiap baris karena itulah materi yang didorong. Hitungannya
diperiksa silang dengan skrip Python terpisah yang memakai logika tanggal
sendiri: keempat momen utama cocok baris per baris.

### Ringkasan mingguan ke Telegram

`/api/ringkasan`, dipanggil Vercel Cron tiap Senin 07.00 WIB. Isinya memakai
`buildMomen()` yang sama dengan tampilan Momen — satu sumber hitungan, jadi
keduanya tidak mungkin berselisih. Pratinjau kapan saja tanpa mengirim apa pun:
`/api/ringkasan?preview=1`.

Gagal aman di setiap jalur: tanpa `CRON_SECRET` pengiriman ditolak (503), rahasia
salah ditolak (401), dan sheet yang gagal terbaca tidak dikirim sebagai jadwal
minggu ini (502).

### Ponsel

- Tombol tampilan pindah ke **bilah navigasi bawah**, dengan ikon dan label.
- KPI jadi satu baris dengan label pendek — bukan digulir ke samping, karena itu
  akan menyembunyikan "Tutup ≤ 7 hari", angka yang paling mendesak.
- Baris jadwal pertama naik dari 537 ke 448 px pada layar 812 px.

### Kontras

Kedelapan warna aksen **gagal** di latar putih (2.15 sampai 4.47), dan violet
serta indigo juga gagal di tema gelap. Teks kini memakai tinta per tema yang
dihitung sampai lolos 4.6 terhadap latar tercerah dan tergelapnya. Diukur dari
warna yang benar-benar dirender browser: 16 dari 16 kombinasi lolos.

### Arsip tahun lalu sebagai bukti

Di kartu Rincian, tiap tanggal yang **belum resmi** kini membawa tanggal yang
sama dari arsip: `21 Nov 2026~ ← 2025: 21 Nov`. Nama program arsipnya selalu
tertulis, dan nama tahapnya juga bila berbeda — tahap 1 PCAM 10 adalah "PU &
TKD", tahap 1 PCAM 9 adalah "Seleksi Administrasi".

Pencocokannya sengaja konservatif, karena pasangan yang salah memberi bukti
palsu yang justru tampak paling meyakinkan. 24 dari 64 baris berpasangan;
matra TNI (AD/AU/AL), akademi (Akmil/AAL/AAU), nomor gelombang, dan jalur khusus
(Brimob, SIPSS) saling menolak.

### Tautan per program

- `?id=42` membuka kartu yang dituju di tampilan Rincian, tab Semua.
- Tombol **Salin tautan** di setiap kartu. Hanya `?sheet=` yang ikut — kata kunci
  pencarian pengirim tidak.
- Tautan ke baris yang sudah dihapus atau digabung menjelaskan dirinya, bukan
  diam-diam membuka halaman biasa.
- Membuka tautan dari rekan tidak mengubah tampilan tersimpan milik pembukanya.

### Perbaikan

- **Tab yang salah tampak aktif setelah muat ulang.** Transisi `color` berbasis
  `var()` membeku di nilai awalnya — kedua kalinya bug jenis ini muncul. Akarnya
  dicabut: tidak ada lagi transisi pada properti yang nilainya dari `var()`.
- **Catatan kaki tertutup bilah bawah,** dan aturan ruang indikator beranda iPhone
  yang ditulis di 1.0.0 ternyata tidak pernah berlaku. Keduanya kalah spesifisitas
  dari `.wrap`; kini memakai `main.wrap`.
- Skrip pemulih di `layout.tsx` menyalin tabel warna aksen sebagai teks — jebakan
  yang sama dengan daftar tampilan dulu. Kini diturunkan dari `palette.ts`.

## 1.0.2

- Favicon di bilah tab tidak lagi berlatar putih. Browser menaruh favicon
  langsung di atas warna bilah tabnya sendiri, jadi ubin putih di situ tampak
  seperti stiker tertempel.
- Peran tiap ikon dipisah tegas: `favicon-32` dan `favicon-192` transparan untuk
  bilah tab; manifest, maskable, dan `apple-touch-icon` tetap berlatar putih.
  iOS **tidak** menambahkan latar pada apple-touch-icon — PNG transparan di situ
  berubah jadi logo merah di atas kotak hitam di layar utama.
- Diuji terhadap tiga warna bilah tab (Chrome gelap, terang, tab non-aktif):
  merah tua `#8f011e` lebih terang dari bilah gelap `#212124`, jadi siluet
  kubusnya terbaca di ketiganya.

## 1.0.1

- Catatan perubahan ini ditambahkan.

## 1.0.0

Penulisan ulang dashboard Apps Script menjadi aplikasi Next.js.

### Tampilan

Lima cara membaca data yang sama, dipilih lewat tombol ikon:

| | |
|---|---|
| **Ruang Kendali** | daftar padat, semua baris sekaligus |
| **Rincian** | kartu berisi seluruh isi satu program, termasuk catatan |
| **Lini Masa** | Gantt berskala piksel-per-hari, dikelompokkan per platform, bisa dilipat |
| **Agenda** | berdasarkan waktu, dikelompokkan per bulan |
| **Papan Status** | kolom per status |

Tab `Semua` / `Real` / `Prediksi` menyaring datanya; di tab Semua tiap baris
membawa penanda tipenya sendiri.

### Keyakinan per tanggal

Tiga kolom sheet — `Status Reg`, `Status Tes`, `Status Pengumuman` — menentukan
apakah sebuah tanggal tampil polos atau bertanda `~` prediksi, `?` sekunder,
`!` konflik. Dikosongkan berarti mengikuti kolom `Tipe`, sehingga baris lama
tetap tampil seperti sebelumnya.

### Yang bekerja sendiri

- **Feed kalender** `/kalender.ics`, bisa disaring per sheet, tipe, dan platform
- **Pemeriksa sheet** — 9 aturan: rentang terbalik, pengumuman mendahului tes,
  ID kembar, baris tanpa tanggal, status tak dikenal, dan lainnya
- **Deteksi periode menumpuk** — dihitung per hari lalu digabung jadi periode,
  bukan pasangan baris
- **Riwayat perubahan** sejak halaman terakhir dibuka

### Sumber data

Tiga jalur, dari yang paling tegas: URL publish-to-web per sheet, service
account, lalu ekspor CSV publik. Jalur service account tidak menuntut
spreadsheet dibuka ke publik — cukup di-share ke satu alamat robot.

### Di ponsel

Terpasang sebagai aplikasi: manifest, service worker, ikon, padding aman-area,
umpan balik sentuhan. Service worker sengaja **tidak** menyimpan halaman ke
cache — halaman dirender ulang tiap 5 menit dari Sheets, dan tanggal tutup yang
sudah lewat lebih berbahaya daripada memuat ulang 120 KB.

### Tampilan dan merek

Logo Product Momentum, warna merek per tema, tema terang/gelap, delapan warna
aksen, 30 ikon SVG sebaris termasuk satu per platform — sehingga platform tidak
lagi dibedakan lewat warna saja.

### Perbaikan yang ditemukan saat pengerjaan

- Kelas `.seg` dipakai dua hal berbeda sampai kelompok tombol menjadi
  `position: absolute` setinggi layar dan menutupi isi halaman
- `Math.cos`/`Math.sin` tidak sama persis antara Node dan browser; grafik donat
  memicu hydration mismatch sampai koordinatnya dibulatkan
- Tiap elemen ber-`transition: color` menahan warna tema lama saat tema diganti
- `.head-row` me-nol-kan padding warisan `.wrap`, membuat kepala halaman tidak
  pernah sejajar dengan isinya
- Skrip pemulih tampilan menyalin daftar tampilan sebagai teks dan tertinggal
  saat tampilan baru ditambahkan
- Service worker men-cache `/_next/static/`, yang di mode dev tidak ber-hash —
  browser menghidrasi HTML baru dengan JavaScript lama
