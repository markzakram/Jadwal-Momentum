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
