import type { IconName } from "@/components/Icon";
import type { Status } from "./types";

/**
 * Palet platform (kategorikal, 11 slot) - nilainya ada di globals.css sebagai
 * --plat-*, dua langkah terpisah untuk tema terang dan gelap. Ditaruh di CSS,
 * bukan dipilih di JavaScript, supaya tidak ada komponen yang perlu tahu tema
 * aktif saat render - itu yang biasanya memicu hydration mismatch.
 *
 * Palet lama gagal 3 dari 6 cek pemeriksa: JadiSekdin #475569 terbaca abu-abu,
 * JadiPPPK vs JadiASN cuma DeltaE 1.9 untuk deuteranopia, JadiOJK vs JadiBeasiswa
 * 11.2 bahkan untuk penglihatan normal - sebabnya 5 dari 11 warna berdesakan di
 * rentang merah-kuning. Delapan platform tetap di keluarga warna aslinya; yang
 * digeser hanya JadiBeasiswa (goldenrod -> olive), JadiPolisi (olive -> indigo),
 * dan JadiSekdin (abu-abu -> cyan).
 */
const PLATFORM_VAR: Record<string, string> = {
  Cerebrum: "--plat-cerebrum",
  JadiASN: "--plat-jadiasn",
  JadiOJK: "--plat-jadiojk",
  JadiBUMN: "--plat-jadibumn",
  JadiBeasiswa: "--plat-jadibeasiswa",
  JadiPCPM: "--plat-jadipcpm",
  JadiPrajurit: "--plat-jadiprajurit",
  JadiPPPK: "--plat-jadipppk",
  JadiPPG: "--plat-jadippg",
  JadiPolisi: "--plat-jadipolisi",
  JadiSekdin: "--plat-jadisekdin",
};

export function platformColor(platform: string): string {
  return `var(${PLATFORM_VAR[platform] ?? "--plat-other"})`;
}

/**
 * Ikon per platform. Sebelumnya platform hanya ditandai kotak kecil berwarna -
 * artinya identitasnya bergantung pada warna SAJA, dan sebelas warna berdekatan
 * memang sulit dibedakan sekilas, apalagi bagi mata buta warna. Bentuk menambah
 * saluran kedua: warnanya boleh tidak terbaca, siluetnya tetap.
 *
 * Maknanya dipilih dari pekerjaan yang dituju, bukan dari logo platformnya -
 * logo tidak boleh ditiru, dan pekerjaan itulah yang dicari pembaca.
 */
const PLATFORM_ICON: Record<string, IconName> = {
  Cerebrum: "bulb",           // tes akademik sekolah
  JadiASN: "institution",     // CPNS - gedung pemerintah
  JadiOJK: "shield",          // otoritas pengawas
  JadiBUMN: "briefcase",      // karier korporat
  JadiBeasiswa: "cap",        // toga
  JadiPCPM: "banknote",       // bank sentral
  JadiPrajurit: "chevrons",   // pangkat militer
  JadiPPPK: "doc",            // perjanjian kerja
  JadiPPG: "bookOpen",        // pendidikan profesi guru
  JadiPolisi: "star",         // lencana
  JadiSekdin: "flag",         // sekolah kedinasan
};

export function platformIcon(platform: string): IconName {
  return PLATFORM_ICON[platform] ?? "dot";
}

/**
 * Warna status. "Menunggu Tes" sengaja netral abu-abu - itu memang keadaan
 * menganggur, dan selalu tampil bersama label teks serta ikon, jadi identitasnya
 * tidak pernah bergantung pada warna saja.
 */
const STATUS_VAR: Record<Status, string> = {
  Buka: "--ok",
  "Menunggu Hasil": "--hasil",
  "Akan Datang": "--info",
  "Tes Berlangsung": "--warn",
  "Menunggu Tes": "--slate",
  Selesai: "--bad",
};

export function statusColor(status: Status): string {
  return `var(${STATUS_VAR[status]})`;
}

/**
 * Warna chip hitung mundur: latar lembut, teks pekat yang masih terbaca di
 * atasnya. "Buka" sengaja memakai nada jingga, bukan hijau - yang dihitung
 * mundur adalah tanggal TUTUP, jadi warnanya harus terasa mendesak.
 */
export function countdownTone(status: Status): { background: string; color: string } {
  const bg = status === "Buka" ? "warn" : status === "Menunggu Hasil" ? "hasil" : "slate";
  return {
    background: `rgba(var(--${bg}-rgb), 0.12)`,
    color: statusColor(status === "Buka" ? "Tes Berlangsung" : status),
  };
}

export const STATUS_BADGE: Record<Status, string> = {
  Buka: "b-buka",
  "Tes Berlangsung": "b-tes",
  Selesai: "b-tutup",
  "Akan Datang": "b-datang",
  "Menunggu Tes": "b-jadwal",
  "Menunggu Hasil": "b-hasil",
};

/** Ikon menyertai tiap status supaya tidak mengandalkan warna saja. */
/**
 * Bentuk ikon tiap status. Sengaja berbeda-beda supaya status tetap terbaca
 * tanpa warna; digambar sebagai SVG di components/Icon.tsx, bukan glyph.
 */
export const STATUS_ICON: Record<Status, IconName> = {
  Buka: "dot",
  "Tes Berlangsung": "play",
  "Menunggu Tes": "clock",
  "Menunggu Hasil": "bell",
  "Akan Datang": "calendarPlus",
  Selesai: "check",
};

export const ACCENTS: Record<string, [string, string]> = {
  emerald: ["#10b981", "16,185,129"],
  rose: ["#f43f5e", "244,63,94"],
  violet: ["#8b5cf6", "139,92,246"],
  blue: ["#3b82f6", "59,130,246"],
  amber: ["#f59e0b", "245,158,11"],
  cyan: ["#06b6d4", "6,182,212"],
  fuchsia: ["#d946ef", "217,70,239"],
  indigo: ["#6366f1", "99,102,241"],
};
