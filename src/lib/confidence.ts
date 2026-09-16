import { DATE_GROUP_OF, type DateGroup, type DateStatus, type Entry } from "./types";

/**
 * Menerjemahkan kolom status di sheet menjadi tingkat keyakinan satu tanggal.
 *
 * Ejaannya sengaja dibuat pemaaf: tim mengisi sheet dari kartu SEL yang memakai
 * istilah "A1 / RESMI", "BELUM TERVERIFIKASI", "KONFLIK RESMI", sementara orang
 * lain mungkin menulis "pasti" atau cuma "P". Nilai yang tidak dikenal TIDAK
 * diam-diam dianggap kosong - pemeriksa di validate.ts yang melaporkannya.
 */

const ALIASES: Record<string, DateStatus> = {
  // resmi
  resmi: "resmi",
  a1: "resmi",
  "a1 / resmi": "resmi",
  "a1/resmi": "resmi",
  pasti: "resmi",
  official: "resmi",
  "resmi terbatas": "resmi",
  final: "resmi",
  // prediksi
  prediksi: "prediksi",
  p: "prediksi",
  estimasi: "prediksi",
  perkiraan: "prediksi",
  "belum terverifikasi": "prediksi",
  draf: "prediksi",
  draft: "prediksi",
  // sekunder
  sekunder: "sekunder",
  s: "sekunder",
  media: "sekunder",
  "ref. claude": "sekunder",
  // konflik
  konflik: "konflik",
  k: "konflik",
  "konflik resmi": "konflik",
  bentrok: "konflik",
};

export function normalizeDateStatus(raw: string): DateStatus | null {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!v) return null;
  return ALIASES[v] ?? null;
}

/** Benar bila selnya terisi tapi isinya tidak dikenali. */
export function isUnknownStatus(raw: string): boolean {
  return !!(raw ?? "").trim() && normalizeDateStatus(raw) === null;
}

const RAW_OF: Record<DateGroup, keyof Entry> = { reg: "sReg", tes: "sTes", peng: "sPeng" };

/**
 * Status satu kolom tanggal. Kalau kolom status kelompoknya kosong atau tak
 * dikenali, jatuh ke kolom Tipe - itu perilaku sheet sebelum fitur ini ada,
 * jadi sheet lama tetap tampil benar tanpa diubah.
 */
export function dateStatusOf(it: Entry, field: string): DateStatus {
  const group = DATE_GROUP_OF[field];
  if (group) {
    const parsed = normalizeDateStatus(String(it[RAW_OF[group]] ?? ""));
    if (parsed) return parsed;
  }
  return it.tipe === "Real" ? "resmi" : "prediksi";
}

/** Ringkasan untuk satu baris: status apa saja yang dipakai tanggal-tanggalnya. */
export function rowStatuses(it: Entry): DateStatus[] {
  const seen = new Set<DateStatus>();
  for (const field of Object.keys(DATE_GROUP_OF)) {
    if (String(it[field as keyof Entry] ?? "")) seen.add(dateStatusOf(it, field));
  }
  return [...seen];
}
