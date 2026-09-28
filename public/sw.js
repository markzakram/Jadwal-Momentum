/* Service worker Jadwal Seleksi.
   ==============================

   DOKUMEN: JARINGAN DULU, SALINAN TERAKHIR SEBAGAI CADANGAN
   ---------------------------------------------------------
   Versi 1.0 sengaja tidak menyimpan halaman sama sekali, dengan alasan tanggal
   kedaluwarsa lebih berbahaya daripada halaman kosong. Alasan itu masih benar
   untuk salinan yang tampil SEOLAH data terbaru - dan justru karena itu ia
   dibalik di sini dengan tiga pengaman:

     1. Selama jaringan ada, halaman SELALU diambil baru. Salinan hanya dipakai
        kalau permintaannya benar-benar gagal.
     2. Halaman yang tampil dari salinan membawa pita peringatan dengan waktu
        persis kapan datanya diambil (lihat components/StatusSalinan.tsx).
     3. Status dan hitung mundur tetap dihitung ulang terhadap tanggal HARI INI
        di perangkat - "tutup 3 hari lagi" tidak ikut membeku bersama salinannya.
        Yang bisa usang hanya tanggal yang diubah di sheet sesudah salinan dibuat,
        dan pita itulah yang memperingatkannya.

   Di kereta atau di sinyal lemah, jadwal kemarin dengan peringatan yang jelas
   lebih berguna daripada layar "tidak ada koneksi".

   Kunci salinan hanya memakai ?sheet=. Parameter lain (?id=, ?view=) membuka
   halaman yang sama, jadi tautan dari ringkasan Telegram tetap terbuka walau
   tautan persisnya belum pernah dikunjungi.

   Tapi salinan hanya DITULIS dari alamat netral - tanpa ?id= maupun ?view=.
   HTML-nya membawa parameter itu di dalamnya: salinan yang ditulis dari
   /?view=momen akan membuka tampilan Momen bagi siapa pun yang membuka aplikasi
   luring sesudahnya, bukan tampilan yang ia pilih sendiri. Ketahuan saat QC.

   ASET: dari cache kalau ada
   --------------------------
   Aset ber-hash Next (/_next/static/...) aman di-cache karena namanya berubah
   tiap kali isinya berubah. Itu yang membuat pembukaan kedua terasa seketika,
   dan yang membuat salinan halaman di atas bisa dihidupkan tanpa jaringan.

   Service worker ini hanya didaftarkan di produksi - lihat RegisterSW.tsx. */

const STATIS = "jadwal-statis-v2";
const HALAMAN = "jadwal-halaman-v2";
const SIMPAN = [STATIS, HALAMAN];

/* cache.addAll() menolak SELURUH pemasangan kalau satu berkas saja 404, jadi
   daftar ini hanya berisi berkas yang pasti ada di public/. */
const ASET = [
  "/offline.html",
  "/logo/icon-192.png",
  "/logo/icon-512.png",
  "/logo/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIS).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((n) => !SIMPAN.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Hanya ?sheet= yang boleh ada - lihat catatan "alamat netral" di atas. */
function netral(url) {
  for (const k of url.searchParams.keys()) if (k !== "sheet") return false;
  return true;
}

/** Satu salinan per sheet: `/` dan `/?sheet=Data2025` berbeda, `/?id=42` sama dengan `/`. */
function kunciHalaman(url) {
  const k = new URL(url.origin + url.pathname);
  const sheet = url.searchParams.get("sheet");
  if (sheet) k.searchParams.set("sheet", sheet);
  return k.toString();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Feed kalender dan API tidak pernah disentuh - keduanya harus selalu segar,
  // dan ringkasan Telegram khususnya tidak boleh pernah dijawab dari salinan.
  if (url.pathname.startsWith("/kalender.ics") || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const kunci = kunciHalaman(url);
        try {
          const res = await fetch(req);
          const html = (res.headers.get("content-type") || "").includes("text/html");
          if (res.ok && html && netral(url)) {
            const salinan = res.clone();
            e.waitUntil(caches.open(HALAMAN).then((c) => c.put(kunci, salinan)));
          }
          return res;
        } catch {
          const tersimpan = await caches.open(HALAMAN).then((c) => c.match(kunci));
          if (tersimpan) return tersimpan;
          const luring = await caches.match("/offline.html");
          return luring || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/logo/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const salinan = res.clone();
              caches.open(STATIS).then((c) => c.put(req, salinan));
            }
            return res;
          }),
      ),
    );
  }
});
