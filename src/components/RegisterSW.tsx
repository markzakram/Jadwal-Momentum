"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker. Tanpa ini Chrome tidak pernah menawarkan
 * "Pasang aplikasi", dan "Tambahkan ke layar utama" hanya membuat pintasan
 * biasa yang tetap membuka browser lengkap dengan bilah alamatnya.
 *
 * Pendaftarannya ditunda sampai halaman selesai dimuat: mengunduh dan memasang
 * service worker bersaing dengan permintaan yang dibutuhkan untuk menampilkan
 * jadwalnya, dan jadwal itu yang ditunggu orang.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    /*
     * JANGAN didaftarkan saat pengembangan.
     *
     * Service worker ini men-cache /_next/static/. Di produksi nama berkas di
     * sana ber-hash - berubah isi berarti berubah nama, jadi cache lama tidak
     * pernah terpakai. Di mode dev namanya TETAP, sehingga browser menghidrasi
     * HTML baru memakai JavaScript lama; React lalu membuang elemen yang tidak
     * ada di pohon versi lamanya. Gejalanya membingungkan: elemen terlihat di
     * HTML kiriman server tapi lenyap dari DOM.
     *
     * Yang sudah terlanjur terpasang dicabut, bukan sekadar dilewati - kalau
     * tidak, cache lamanya tetap meracuni server dev selamanya.
     */
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      if ("caches" in window) caches.keys().then((k) => k.forEach((n) => caches.delete(n)));
      return;
    }

    const daftar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* mode privat, http biasa, atau kebijakan browser: aplikasi tetap jalan */
      });
    };

    if (document.readyState === "complete") {
      daftar();
      return;
    }
    window.addEventListener("load", daftar);
    return () => window.removeEventListener("load", daftar);
  }, []);

  return null;
}
