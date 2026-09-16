import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard Jadwal Seleksi",
  description: "Pantau pendaftaran & tes dari semua platform dalam satu tempat",
};

/**
 * Tema, warna aksen dan tampilan terakhir dipulihkan sebelum paint pertama
 * supaya tidak ada kedipan. Ditulis sebagai atribut pada <html>, bukan state
 * React, jadi markup server dan klien tetap identik.
 */
const BOOT = `(function(){try{
  var d=document.documentElement;
  var t=localStorage.getItem('theme'); if(t==='light'||t==='dark'){d.dataset.theme=t;}
  var v=localStorage.getItem('view'); if(v==='kendali'||v==='agenda'||v==='papan'){d.dataset.view=v;}
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
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
