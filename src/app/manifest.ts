import type { MetadataRoute } from "next";

/**
 * Manifest aplikasi. Ditulis sebagai kode, bukan public/manifest.json, supaya
 * Next yang menyajikannya di /manifest.webmanifest dengan tipe MIME yang benar -
 * Chrome menolak manifest yang disajikan sebagai text/plain, dan itu kegagalan
 * yang diam: tombol "Pasang aplikasi" cuma tidak muncul, tanpa pesan apa pun.
 *
 * Orientasi sengaja TIDAK dikunci: tampilan Lini Masa justru paling enak dibaca
 * melintang.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jadwal Seleksi — Tim Marketing",
    short_name: "Jadwal Seleksi",
    description:
      "Pantau pendaftaran, tes, dan pengumuman dari semua platform seleksi dalam satu tempat.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Warna layar pembuka. Tema bawaan aplikasi gelap, jadi keduanya gelap -
    // layar pembuka putih yang disusul halaman gelap terlihat seperti kedipan.
    background_color: "#0b0e13",
    theme_color: "#12161d",
    categories: ["productivity", "education"],
    icons: [
      { src: "/logo/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
