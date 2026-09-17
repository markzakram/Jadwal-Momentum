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
  | "chevron";

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
