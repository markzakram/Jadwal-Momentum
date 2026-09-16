# Dashboard Jadwal Seleksi

Dashboard pemantau jadwal pendaftaran & tes lintas platform (Cerebrum, JadiASN,
JadiBUMN, JadiPolisi, JadiPrajurit, dst). Dibangun dengan Next.js dan membaca
datanya langsung dari Google Sheets — penyuntingan tetap dilakukan di Sheets.

Versi sebelumnya berupa Google Apps Script Web App; berkas aslinya disimpan di
`legacy/` sebagai rujukan.

---

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tanpa konfigurasi apa pun, aplikasi memakai data
contoh di `src/data/fallback.json` dan menampilkan pemberitahuan di halaman.

## Menyambungkan ke Google Sheets

Salin `.env.example` menjadi `.env.local`, lalu pilih salah satu cara:

**Cara 1 — ID spreadsheet.** Ambil dari URL spreadsheet
(`docs.google.com/spreadsheets/d/<ID>/edit`), isikan ke `GOOGLE_SHEET_ID`.
Spreadsheet harus di-share **Anyone with the link → Viewer**.

**Cara 2 — Publish to web per sheet.** File ▸ Share ▸ Publish to web ▸ pilih
sheet ▸ format CSV. Isikan URL hasilnya ke `SHEET_CSV_DATA`,
`SHEET_CSV_DATA2025`, `SHEET_CSV_DATADUMMY`. Cara ini tidak mengharuskan
seluruh spreadsheet bisa dibuka lewat link, dan menang atas Cara 1.

Hasil pembacaan di-cache 5 menit (`revalidate` di `src/app/page.tsx`), jadi
perubahan di Sheets muncul paling lama 5 menit kemudian.

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di vercel.com: **Add New ▸ Project**, pilih repo-nya. Vercel mengenali
   Next.js tanpa konfigurasi tambahan.
3. **Settings ▸ Environment Variables**: tambahkan `GOOGLE_SHEET_ID` (atau
   `SHEET_CSV_*`) untuk Production, Preview, dan Development.
4. Deploy. Setiap push ke `main` akan men-deploy ulang otomatis.

---

## Apa yang ada di halaman

**Tiga tampilan untuk data yang sama**, dipilih dari kepala halaman dan diingat
per peramban:

- **Ruang Kendali** — rel 37 hari (7 ke belakang, 30 ke depan) di atas daftar
  padat. Kolom `SISA` selalu didampingi kolom `YANG DIHITUNG`, jadi angkanya
  tidak pernah berganti makna diam-diam antar baris.
- **Agenda** — tiap baris dipecah jadi kejadian bertanggal lalu dikelompokkan
  per bulan, dari hari ini ke depan. Satu program muncul beberapa kali, sekali
  untuk tiap tanggal yang dicatat.
- **Papan Status** — kolom per status, enam kartu per kolom lalu `+N lainnya`.

**Feed kalender** di `/kalender.ics` — iCalendar yang bisa dilanggan sekali di
Google Calendar. Penyaring lewat query: `?sheet=`, `?tipe=Real|Prediksi`,
`?platform=`. Tautan dan tombol salinnya ada di kaki halaman.

Google menyegarkan langganan beberapa jam sekali, bukan menit, jadi perubahan
jadwal tidak langsung muncul di kalender orang.

**Pemeriksa isi sheet** — sembilan aturan (rentang terbalik, pengumuman
mendahului tahapnya, tahap tanpa tanggal, tanggal tanpa nama tahap, tahap 2
tanpa tahap 1, platform kosong, tahun yang terpaut jauh, baris tanpa tanggal,
serta ID dan baris kembar). Temuannya tampil sebagai pita, bukan dibiarkan
dirender diam-diam. Aturannya ada di `src/lib/validate.ts`.

**Periode tes menumpuk** — dihitung per hari: berapa platform berbeda yang
tesnya berjalan pada hari itu. Hari dengan tiga platform atau lebih digabung
jadi satu periode. Ambangnya satu angka di `findCrunch`. Gelombang sesama
platform tidak dihitung bertabrakan karena memang dijalankan serentak.

**Perubahan sejak terakhir dibuka** — cuplikan isi sheet disimpan di
`localStorage`, lalu dibandingkan tiap kali halaman dibuka. Kunjungan pertama
menyimpan diam-diam tanpa melaporkan apa pun. Perbandingannya **per peramban,
bukan per tim**: kalau kamu buka di laptop lain atau menghapus data situs,
hitungannya mulai dari nol. Untuk riwayat bersama satu tim, cuplikannya perlu
pindah ke penyimpanan server — logika pembandingnya di `src/lib/changes.ts`
sudah terpisah dari penyimpanannya, jadi yang berubah hanya tempat menyimpan.

## Bentuk data

Sheet dibaca lewat **nama kolom**, bukan posisi — urutan kolom boleh berubah.
Baris header dicari, tidak diasumsikan ada di baris 1.

| Kolom | Keterangan |
|---|---|
| `ID` | angka unik |
| `Tipe` | `Real` atau `Prediksi` — menentukan tab |
| `Platform` | menentukan warna kartu dan pengelompokan |
| `Program` | sub-program, boleh kosong |
| `Reg Buka`, `Reg Tutup` | rentang pendaftaran |
| `Tahap 1`, `T1 Mulai`, `T1 Akhir`, `Pengumuman T1` | tahap pertama |
| `Tahap 2`, `T2 Mulai`, `T2 Akhir`, `Pengumuman T2` | tahap kedua, opsional |
| `Pengumuman Akhir` | kelulusan |
| `Catatan` | teks bebas |
| `Link Web`, `Link Ebook` | tautan pada kartu |
| `Status Reg` | opsional — keyakinan tanggal registrasi |
| `Status Tes` | opsional — keyakinan rentang tes (T1 dan T2) |
| `Status Pengumuman` | opsional — keyakinan tanggal pengumuman |

### Keyakinan per tanggal

Tiga kolom terakhir bersifat opsional. Kosongkan, dan seluruh tanggal baris itu
mengikuti kolom `Tipe` seperti sebelumnya — sheet lama tetap tampil benar tanpa
diubah sama sekali.

Gunanya: dalam satu baris, registrasi bisa sudah resmi sementara tanggal tesnya
masih perkiraan. Kartu SEL membedakannya per sel; tiga kolom ini membawa
perbedaan itu ke tampilan, bukan membiarkannya jadi prosa di `Catatan`.

| Nilai | Arti | Tanda di halaman |
|---|---|---|
| `resmi` | diumumkan penyelenggara | tanpa tanda |
| `prediksi` | perkiraan, belum dikonfirmasi | garis putus-putus + `~` |
| `sekunder` | dari laporan media, belum dikonfirmasi di sumber resmi | garis putus-putus + `?` |
| `konflik` | sumber resmi saling berbeda | merah + `!` |

Ejaannya pemaaf: `A1`, `A1 / RESMI`, `RESMI TERBATAS`, `pasti` semuanya terbaca
`resmi`; `P`, `ESTIMASI`, `BELUM TERVERIFIKASI` terbaca `prediksi`; `KONFLIK
RESMI` terbaca `konflik`. Nilai yang tidak dikenali **tidak** diam-diam
diabaikan — pemeriksa sheet melaporkannya, dan tanggalnya sementara mengikuti
kolom `Tipe`.

Cara termudah mengisinya: pasang Data validation di ketiga kolom itu dengan
daftar `resmi, prediksi, sekunder, konflik`, supaya jadi dropdown dan tidak bisa
salah ketik.

Penanda ini juga terbawa ke feed kalender: acara yang tanggalnya bukan `resmi`
diberi awalan `[prediksi]`, `[sekunder]`, atau `[konflik]` pada judulnya.

Sheet yang dikenali: `DATA` (2026), `Data2025`, `DataDummy` — ejaannya
case-sensitive dan harus persis seperti di spreadsheet.

Tanggal dinormalkan dari beberapa bentuk sekaligus: `YYYY-MM-DD`,
`DD-MMM-YYYY` (nama bulan Indonesia maupun Inggris — `07-Agu-2026` dan
`07-Aug-2026` sama-sama terbaca), serta `DD/MM/YYYY`.

## Status

Status dihitung dari tanggal, bukan disimpan: `Akan Datang`, `Buka`,
`Menunggu Tes`, `Tes Berlangsung`, `Menunggu Hasil`, `Selesai`. Logikanya ada di
`src/lib/status.ts` dan menerima "hari ini" sebagai argumen — bukan membaca jam
global — supaya render di server dan di browser selalu sama.

---

## Yang berubah dari versi Apps Script

**Dua bug diperbaiki.**

Tombol tab 2025 dan Demo dulu tidak berfungsi: frontend meminta sheet bernama
`data2025`/`dataDummy` (huruf kecil) sedangkan sheet aslinya `Data2025`/
`DataDummy`. Karena `getSheetByName()` case-sensitive, Apps Script tidak
menemukannya lalu **membuat sheet kosong baru** setiap kali tombolnya diklik.
Sekarang ejaannya mengikuti nama asli.

Sheet `Data2025` punya URL web app di baris 1 dan header baru di baris 2,
sehingga baris header ikut terbaca sebagai data dan memunculkan kartu palsu
bertuliskan "Platform / Tipe". Parser sekarang mencari baris headernya.

**Timeline sekarang lintas tahun.** Versi lama memetakan tanggal ke hari-ke-n
dalam tahunnya sendiri, jadi hanya benar bila seluruh data ada di satu tahun.
Data sekarang membentang Maret 2026 sampai Juli 2027, jadi rentang sumbu diambil
dari data.

**Palet platform disusun ulang.** Palet lama gagal 3 dari 6 pemeriksaan
keterbacaan warna: `#475569` (JadiSekdin) terbaca abu-abu, JadiPPPK dan JadiASN
hanya berjarak ΔE 1.9 untuk deuteranopia, JadiOJK dan JadiBeasiswa 11.2 bahkan
untuk penglihatan normal — sebabnya 5 dari 11 warna berdesakan di rentang
merah–kuning. Delapan platform tetap di keluarga warna aslinya; yang digeser
hanya **JadiBeasiswa** (goldenrod → olive), **JadiPolisi** (olive → indigo), dan
**JadiSekdin** (abu-abu → cyan). Tema gelap punya langkah warnanya sendiri.

Warna "Menunggu Tes" sengaja dibiarkan netral abu-abu meski tidak lolos ambang
chroma — itu memang keadaan menganggur, dan ia selalu tampil bersama ikon dan
label teks.

**Tidak ada lagi Tambah/Edit/Hapus di halaman.** Penyuntingan dilakukan di
Google Sheets. Konsekuensinya halaman ini aman dibuka publik tanpa perlu login.

## Struktur

```
src/
  app/
    page.tsx          halaman server, baca sheet lalu render
    kalender.ics/     feed iCalendar
    globals.css       token warna + seluruh gaya
  components/
    Dashboard.tsx     kerangka: kepala, KPI, pita, toolbar, pemilih tampilan
    views/            DenseView · AgendaView · BoardView
    ChangesPanel      perubahan sejak terakhir dibuka
    CrunchPanel       periode tes menumpuk
    DataIssues        temuan pemeriksa sheet
  lib/
    sheets.ts         ambil CSV, cari baris header, normalkan tanggal
    status.ts         status, hitung mundur, kejadian agenda
    confidence.ts     keyakinan per tanggal dari tiga kolom status
    validate.ts       aturan pemeriksa isi sheet
    conflicts.ts      periode tes menumpuk
    changes.ts        cuplikan + pembanding perubahan
    ics.ts            penyusun iCalendar
    palette.ts        pemetaan warna platform & status
  data/fallback.json  data contoh saat sheet belum tersambung
design/               empat arah desain (.dc.html) yang jadi dasar tampilan
legacy/               Code.gs & Index.html versi Apps Script
```

Modul di `lib/` sengaja murni — tidak membaca jam global, tidak menyentuh DOM —
supaya bisa diuji langsung.
