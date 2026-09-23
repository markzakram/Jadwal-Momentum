export type Tipe = "Real" | "Prediksi";

/** Tab penyaring data. "Semua" menggabungkan keduanya, dengan penanda per baris. */
export const TABS = ["Semua", "Real", "Prediksi"] as const;
export type TabKey = (typeof TABS)[number];

/**
 * Seberapa kuat sebuah tanggal dipercaya. Kartu SEL membedakannya per sel, tapi
 * polanya selalu berkelompok - registrasi satu status, rentang tes satu, dan
 * pengumuman satu. Maka sheet cukup memuat tiga kolom, bukan sembilan.
 */
export const DATE_STATUSES = ["resmi", "prediksi", "sekunder", "konflik"] as const;
export type DateStatus = (typeof DATE_STATUSES)[number];

export const DATE_STATUS_INFO: Record<DateStatus, { label: string; mark: string; hint: string }> = {
  resmi: { label: "Resmi", mark: "", hint: "Diumumkan penyelenggara." },
  prediksi: { label: "Prediksi", mark: "~", hint: "Tanggal perkiraan, belum dikonfirmasi penyelenggara." },
  sekunder: { label: "Sekunder", mark: "?", hint: "Dari laporan media, belum dikonfirmasi di sumber resmi." },
  konflik: { label: "Konflik", mark: "!", hint: "Sumber resmi saling berbeda; tanggal ini salah satu pilihan." },
};

/** Kelompok tanggal yang berbagi satu kolom status di sheet. */
export type DateGroup = "reg" | "tes" | "peng";

export const DATE_GROUP_OF: Record<string, DateGroup> = {
  regBuka: "reg", regTutup: "reg",
  t1Mulai: "tes", t1Akhir: "tes", t2Mulai: "tes", t2Akhir: "tes",
  pengT1: "peng", pengT2: "peng", pengAkhir: "peng",
};

/** Satu baris sheet DATA. Semua tanggal disimpan sebagai 'YYYY-MM-DD' atau string kosong. */
export interface Entry {
  id: number;
  tipe: Tipe;
  platform: string;
  program: string;
  regBuka: string;
  regTutup: string;
  tahap1: string;
  t1Mulai: string;
  t1Akhir: string;
  pengT1: string;
  tahap2: string;
  t2Mulai: string;
  t2Akhir: string;
  pengT2: string;
  pengAkhir: string;
  catatan: string;
  linkWeb: string;
  linkEbook: string;
  /**
   * Status per kelompok tanggal, disimpan apa adanya seperti yang diketik di
   * sheet supaya pemeriksa bisa melaporkan nilai yang tidak dikenal. Kosong
   * berarti mengikuti kolom Tipe.
   */
  sReg: string;
  sTes: string;
  sPeng: string;
}

export const STATUSES = [
  "Buka",
  "Menunggu Hasil",
  "Akan Datang",
  "Tes Berlangsung",
  "Menunggu Tes",
  "Selesai",
] as const;

export type Status = (typeof STATUSES)[number];

/** Nama sheet dipakai apa adanya sesuai ejaan di spreadsheet (case-sensitive). */
export const SHEETS = [
  { key: "DATA", label: "2026" },
  { key: "Data2025", label: "2025" },
  { key: "DataDummy", label: "Demo" },
] as const;

export type SheetKey = (typeof SHEETS)[number]["key"];

/**
 * Enam tampilan untuk data yang sama: kepadatan, tindakan, kelengkapan, rentang,
 * waktu, keadaan. Dipilih lewat tombol ikon di ujung kanan baris tab — bukan
 * sebagai tab, karena yang berganti adalah cara menampilkan data yang sama,
 * bukan datanya.
 *
 * `short` dipakai bilah navigasi bawah di ponsel, yang hanya punya ~60px per
 * tombol - "Ruang Kendali" tidak muat di situ.
 */
export const VIEWS = [
  { key: "kendali", label: "Ruang Kendali", short: "Daftar", icon: "list", hint: "Daftar padat — semua baris sekaligus" },
  { key: "momen", label: "Momen", short: "Momen", icon: "target", hint: "Kesempatan pemasaran minggu ini" },
  { key: "rincian", label: "Rincian", short: "Kartu", icon: "card", hint: "Kartu — seluruh isi satu program, termasuk catatan" },
  { key: "gantt", label: "Lini Masa", short: "Gantt", icon: "gantt", hint: "Gantt — rentang tiap tahap, dikelompokkan per platform" },
  { key: "agenda", label: "Agenda", short: "Agenda", icon: "calendar", hint: "Berdasarkan waktu, dikelompokkan per bulan" },
  { key: "papan", label: "Papan Status", short: "Papan", icon: "board", hint: "Kolom per status" },
] as const;

export type ViewKey = (typeof VIEWS)[number]["key"];

export interface SheetPayload {
  rows: Entry[];
  /** dari mana baris ini datang, ditampilkan di footer supaya jelas */
  source: "sheet" | "fallback";
  fetchedAt: string;
  warning?: string;
}
