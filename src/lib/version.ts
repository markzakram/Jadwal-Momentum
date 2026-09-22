/**
 * Versi aplikasi, disuntikkan saat build dari package.json lewat next.config.mjs.
 *
 * Naikkan angkanya di package.json tiap kali ada perubahan yang di-deploy -
 * itulah gunanya ia tampil di kepala halaman: supaya bisa dipastikan build mana
 * yang sedang dilihat orang, tanpa menebak dari tampilan.
 *
 * BUILD_SHA berisi tujuh karakter pertama commit yang di-deploy. Ia yang
 * benar-benar mengidentifikasi build; nomor versi bisa lupa dinaikkan, commit
 * tidak bisa. Kosong saat dijalankan di mesin sendiri.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";
