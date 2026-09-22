import { readFileSync } from "node:fs";

/*
 * Versi dibaca dari package.json saat build, bukan ditulis ulang di dalam
 * komponen. Satu tempat saja - versi yang ditulis dua kali cepat atau lambat
 * berbeda, dan angka versi yang salah lebih menyesatkan daripada tidak ada.
 *
 * Yang masuk ke bundel hanya STRING-nya. Mengimpor package.json langsung dari
 * komponen akan menyeret seluruh daftar dependensi ikut ke JavaScript yang
 * diunduh pengunjung.
 */
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    // Disediakan Vercel sendiri; kosong saat dijalankan di mesin sendiri.
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
};

export default nextConfig;
