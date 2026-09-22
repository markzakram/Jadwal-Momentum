import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import RegisterSW from "@/components/RegisterSW";
import { TABS, VIEWS } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jadwal Seleksi",
  description: "Pantau pendaftaran, tes, dan pengumuman dari semua platform seleksi dalam satu tempat",
  applicationName: "Jadwal Seleksi",
  appleWebApp: {
    capable: true,
    title: "Jadwal Seleksi",
    // "default" dipilih, bukan "black-translucent": yang terakhir menaruh isi
    // halaman DI BAWAH jam dan indikator baterai, dan kalau padding aman-areanya
    // meleset sedikit saja, judulnya tertimpa jam. Tidak sepadan.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/logo/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/logo/apple-touch-icon.png",
  },
  // Tanggal seperti "05 Okt" jangan dijadikan tautan telepon oleh iOS.
  formatDetection: { telephone: false, date: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Jangan dikunci. Orang yang perlu memperbesar teks harus tetap bisa.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#12161d" },
  ],
};

/**
 * Tema, warna aksen, tampilan dan tab terakhir dipulihkan sebelum paint pertama
 * supaya tidak ada kedipan. Ditulis sebagai atribut pada <html>, bukan state
 * React, jadi markup server dan klien tetap identik.
 *
 * Daftar kunci yang sah DITURUNKAN dari VIEWS dan TABS, tidak ditulis ulang di
 * sini. Versi sebelumnya menyalin daftarnya sebagai teks, lalu tertinggal saat
 * tampilan "rincian" dan "gantt" ditambahkan - akibatnya pilihan tampilan orang
 * diam-diam hilang tiap kali halaman dimuat ulang.
 */
const BOOT = `(function(){try{
  var d=document.documentElement;
  var t=localStorage.getItem('theme'); if(t==='light'||t==='dark'){d.dataset.theme=t;}
  var V=${JSON.stringify(VIEWS.map((v) => v.key))};
  var v=localStorage.getItem('view'); if(v&&V.indexOf(v)>=0){d.dataset.view=v;}
  var B=${JSON.stringify([...TABS])};
  var b=localStorage.getItem('tab'); if(b&&B.indexOf(b)>=0){d.dataset.tab=b;}
  var a=localStorage.getItem('accent');
  var M={emerald:['#10b981','16,185,129'],rose:['#f43f5e','244,63,94'],violet:['#8b5cf6','139,92,246'],
         blue:['#3b82f6','59,130,246'],amber:['#f59e0b','245,158,11'],cyan:['#06b6d4','6,182,212'],
         fuchsia:['#d946ef','217,70,239'],indigo:['#6366f1','99,102,241']};
  if(a&&M[a]){d.style.setProperty('--accent',M[a][0]);
    d.style.setProperty('--accent-rgb',M[a][1]);d.dataset.accent=a;}
}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@400&display=swap"
        />
        {/*
          Next 15 memancarkan `mobile-web-app-capable` saja - nama modern, dan
          Safari baru memahaminya sejak iOS 17. Di bawah itu, tanpa varian
          ber-awalan `apple-`, aplikasi yang sudah dipasang tetap terbuka di
          Safari lengkap dengan bilah alamatnya. Ditulis tangan karena tidak ada
          jalannya lewat objek metadata.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
