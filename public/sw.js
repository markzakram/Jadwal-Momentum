/* Service worker Jadwal Seleksi.
   ==============================
   Ada di sini untuk SATU alasan: Chrome hanya menawarkan "Pasang aplikasi" kalau
   situsnya punya service worker dengan penangan fetch. Tanpa ini, "Tambahkan ke
   layar utama" cuma membuat pintasan biasa yang tetap membuka browser lengkap
   dengan bilah alamatnya.

   Yang SENGAJA tidak dilakukan: menyimpan halamannya ke cache.
   ------------------------------------------------------------
   Halaman ini dirender ulang di server tiap 5 menit dari Google Sheets. Kalau
   dokumennya disajikan dari cache, orang bisa melihat jadwal lama berhari-hari
   tanpa sadar - dan pada aplikasi yang seluruh gunanya adalah "kapan tutupnya",
   itu kelas kesalahan yang jauh lebih mahal daripada memuat ulang 120 KB.

   Jadi: dokumen SELALU dari jaringan. Kalau jaringannya mati, yang tampil
   halaman luring - bukan salinan lama yang menampilkan tanggal usang seolah
   masih berlaku.

   Aset ber-hash Next (/_next/static/...) aman di-cache karena namanya berubah
   tiap kali isinya berubah. Itu yang membuat pembukaan kedua terasa seketika. */

const CACHE = "jadwal-statis-v1";

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
    caches.open(CACHE).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Feed kalender tidak pernah disentuh - ia memang harus selalu segar.
  if (url.pathname.startsWith("/kalender.ics")) return;

  // Dokumen: jaringan dulu, halaman luring sebagai jaring pengaman.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Aset ber-hash: dari cache kalau ada, kalau belum ambil lalu simpan.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/logo/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const salinan = res.clone();
              caches.open(CACHE).then((c) => c.put(req, salinan));
            }
            return res;
          }),
      ),
    );
  }
});
