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
