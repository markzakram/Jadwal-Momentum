import type { ReactElement } from "react";

/**
 * Ikon digambar sebagai SVG sebaris, bukan karakter Unicode atau emoji.
 *
 * Sebelumnya status memakai glyph geometris (●■▬◆▲✕) dan tema memakai emoji
 * matahari/bulan. Keduanya ikut font sistem: ukurannya meleset dari teks di
 * sekitarnya, tebalnya tidak bisa diatur, dan bentuknya berbeda antar perangkat.
 * Semua bentuk di sini satu grid 24px, stroke 1.8, dan mewarisi currentColor
 * sehingga otomatis mengikuti warna status maupun tema.
 */

export type IconName =
  | "list"
  | "card"
  | "calendar"
  | "board"
  | "gantt"
  | "globe"
  | "book"
  | "external"
  | "sun"
  | "moon"
  | "search"
  | "dot"
  | "play"
  | "clock"
  | "bell"
  | "calendarPlus"
  | "check"
  | "layers"
  | "chevron"
  // satu per platform
  | "bulb"
  | "institution"
  | "shield"
  | "briefcase"
  | "cap"
  | "banknote"
  | "chevrons"
  | "doc"
  | "bookOpen"
  | "star"
  | "flag";

const SHAPES: Record<IconName, ReactElement> = {
  // mode tampilan
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.6" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  // kartu dengan baris isi — beda tegas dari `list` (titik + garis) dan `board`
  card: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 9h6M7 13h10M7 17h7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="14" rx="1.5" />
    </>
  ),
  // batang bertingkat dengan awal berbeda-beda — bentuk khas Gantt, dan tidak
  // tertukar dengan `board` yang batangnya tegak
  gantt: (
    <>
      <rect x="3" y="5" width="9.5" height="3.4" rx="1.7" fill="currentColor" stroke="none" />
      <rect x="8" y="10.3" width="12" height="3.4" rx="1.7" fill="currentColor" stroke="none" />
      <rect x="5.5" y="15.6" width="8" height="3.4" rx="1.7" fill="currentColor" stroke="none" />
    </>
  ),

  // tema
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.8A8.6 8.6 0 0 1 9.2 4a7.2 7.2 0 1 0 10.8 10.8z" />,

  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M19.8 19.8l-4.2-4.2" />
    </>
  ),

  // tautan — menggantikan emoji 🌐 📘 ↗ pada kartu versi Apps Script
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18z" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.2A2.8 2.8 0 0 1 6.8 16.4H20" />
      <path d="M6.8 3H20v18H6.8A2.8 2.8 0 0 1 4 18.2V5.8A2.8 2.8 0 0 1 6.8 3z" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M11 13L20 4" />
      <path d="M18 14v4.5A2.5 2.5 0 0 1 15.5 21h-9A2.5 2.5 0 0 1 4 18.5v-9A2.5 2.5 0 0 1 6.5 7H11" />
    </>
  ),

  // status — bentuknya sengaja berbeda-beda supaya tidak bergantung warna saja
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
  play: <path d="M8.5 5.6l9.4 6.4-9.4 6.4z" fill="currentColor" stroke="none" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.6V12l3 1.9" />
    </>
  ),
  bell: (
    <>
      <path d="M18.2 8.4a6.2 6.2 0 1 0-12.4 0c0 5.1-2 6.2-2 6.2h16.4s-2-1.1-2-6.2" />
      <path d="M10.3 19.4a2.2 2.2 0 0 0 3.4 0" />
    </>
  ),
  calendarPlus: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18M12 13.2v4.6M9.7 15.5h4.6" />
    </>
  ),
  check: <path d="M5 12.6l4.6 4.6L19 7.4" />,

  layers: (
    <>
      <path d="M12 3l8.5 4.7L12 12.4 3.5 7.7z" />
      <path d="M3.5 12.9L12 17.6l8.5-4.7" />
    </>
  ),
  chevron: <path d="M9 5l7 7-7 7" />,

  /*
   * Ikon platform. Dipilih menurut SILUETNYA lebih dulu, baru maknanya - pada
   * 13px yang tersisa dari sebuah bentuk hanyalah garis luarnya. Karena itu
   * Cerebrum memakai bohlam, bukan otak: otak yang digambar sekecil ini luruh
   * jadi gumpalan. Dua "gedung" juga dihindari - JadiASN memakai gedung
   * berpilar, JadiBUMN memakai koper kerja, supaya tidak tertukar.
   */
  bulb: (
    <>
      <path d="M12 3a5.5 5.5 0 0 0-3.2 10c.5.4.7.9.7 1.5V16h5v-1.5c0-.6.2-1.1.7-1.5A5.5 5.5 0 0 0 12 3z" />
      <path d="M9.5 19h5M10.6 21.4h2.8" />
    </>
  ),
  institution: (
    <>
      <path d="M3 9.6L12 4.2l9 5.4" />
      <path d="M5.4 10.4v8.2M9.8 10.4v8.2M14.2 10.4v8.2M18.6 10.4v8.2" />
      <path d="M3 20.6h18" />
    </>
  ),
  shield: <path d="M12 3.2l7.4 2.9v5.7c0 4.2-2.9 8-7.4 9.2-4.5-1.2-7.4-5-7.4-9.2V6.1z" />,
  briefcase: (
    <>
      <rect x="2.8" y="7.4" width="18.4" height="12.8" rx="2.6" />
      <path d="M9 7.4V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.4" />
      <path d="M2.8 13h18.4" />
    </>
  ),
  cap: (
    <>
      <path d="M12 4.2L2.6 8.4 12 12.6l9.4-4.2z" />
      <path d="M6.6 10.3V15c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-4.7" />
      <path d="M21.4 8.4v5.2" />
    </>
  ),
  banknote: (
    <>
      <rect x="2.4" y="6.2" width="19.2" height="11.6" rx="2.4" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 10.2v3.6M18 10.2v3.6" />
    </>
  ),
  chevrons: <path d="M5 9l7-4 7 4M5 14l7-4 7 4M5 19l7-4 7 4" />,
  doc: (
    <>
      <path d="M6.2 3.2h7l4.6 4.6v13H6.2z" />
      <path d="M13.2 3.2v4.6h4.6" />
      <path d="M9 13.4h6M9 17h4" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M12 7.6v12" />
      <path d="M12 7.6C10.4 6 8.4 5.2 4 5.2v12c4.4 0 6.4.8 8 2.4" />
      <path d="M12 7.6c1.6-1.6 3.6-2.4 8-2.4v12c-4.4 0-6.4.8-8 2.4" />
    </>
  ),
  star: <path d="M12 3.4l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9z" />,
  flag: (
    <>
      <path d="M5.4 21V3.6" />
      <path d="M5.4 4.6h11.4l-1.8 3.6 1.8 3.6H5.4" />
    </>
  ),
};

export default function Icon({
  name,
  size = 16,
  label,
}: {
  name: IconName;
  size?: number;
  /** diisi bila ikonnya berdiri sendiri tanpa teks pendamping */
  label?: string;
}) {
  return (
    <svg
      className="ico"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {SHAPES[name]}
    </svg>
  );
}
