import { daysBetween, pd, statusOf, tWindow } from "./status";
import type { Entry } from "./types";

/**
 * Menerjemahkan jadwal menjadi momen pemasaran.
 *
 * Tampilan lain menjawab "jadwalnya kapan". Modul ini menjawab pertanyaan yang
 * sebenarnya dibawa tim pemasaran: "minggu ini kita mendorong apa". Tidak ada
 * kolom baru di sheet - semuanya diturunkan dari tanggal yang sudah ada.
 *
 * Dipakai dua tempat: tampilan Momen dan ringkasan mingguan otomatis. Karena
 * itu ia murni (tanpa DOM, tanpa jam global) - dua keluaran itu harus selalu
 * sepakat, dan satu-satunya cara menjaminnya adalah satu sumber hitungan.
 */

export type MomenKey = "persiapan" | "antar" | "tutup" | "baru" | "segera";

export interface MomenItem {
  entry: Entry;
  /** kolom tanggal yang menjadi alasan baris ini masuk momen tersebut */
  field: keyof Entry;
  date: Date;
  /** kata kerja tanggalnya: "tes", "tahap 2", "tutup", "buka" */
  label: string;
  /** hari dari hari ini ke tanggal itu; negatif berarti sudah lewat */
  days: number;
}

export interface MomenGroup {
  key: MomenKey;
  items: MomenItem[];
}

/**
 * Batas waktu tiap momen. Persiapan dan antar-tahap sengaja panjang: kampanye
 * persiapan memang berjalan berminggu-minggu, dan orang yang tesnya 40 hari lagi
 * tetap calon pembeli. Tiga lainnya pendek karena sifatnya mendesak - "baru
 * dibuka" yang sudah tiga minggu lalu bukan berita lagi.
 */
export const MOMEN_HORIZON = {
  persiapan: 60,
  antar: 60,
  tutup: 7,
  baru: 7,
  segera: 14,
} as const;

/** Urutan tampil = urutan prioritas. Satu baris hanya masuk momen pertama yang cocok. */
export const MOMEN_ORDER: MomenKey[] = ["persiapan", "antar", "tutup", "baru", "segera"];

export const MOMEN_INFO: Record<MomenKey, { judul: string; arahan: string }> = {
  persiapan: {
    judul: "Jendela persiapan",
    arahan: "Sudah mendaftar, tes belum mulai. Mereka harus bersiap sekarang — saat materi persiapan paling mungkin dibeli.",
  },
  antar: {
    judul: "Antar tahap",
    arahan: "Tahap 1 selesai, tahap 2 belum mulai. Yang lolos butuh materi tahap lanjutan.",
  },
  tutup: {
    judul: "Menjelang tutup",
    arahan: `Pendaftaran tutup dalam ${MOMEN_HORIZON.tutup} hari. Dorong urgensi.`,
  },
  baru: {
    judul: "Baru dibuka",
    arahan: `Pendaftaran dibuka dalam ${MOMEN_HORIZON.baru} hari terakhir. Dorong kesadaran.`,
  },
  segera: {
    judul: "Segera dibuka",
    arahan: `Pendaftaran dibuka dalam ${MOMEN_HORIZON.segera} hari. Siapkan materi sebelum ramai.`,
  },
};

/** Kolom mana yang memuat tanggal tes paling awal - untuk penanda keyakinannya. */
function firstTestField(it: Entry): keyof Entry {
  const a = pd(it.t1Mulai);
  const b = pd(it.t2Mulai);
  if (a && b) return a <= b ? "t1Mulai" : "t2Mulai";
  return a ? "t1Mulai" : "t2Mulai";
}

function classify(it: Entry, today: Date): Omit<MomenItem, "entry"> & { key: MomenKey } | null {
  const s = statusOf(it, today);
  const rb = pd(it.regBuka);
  const rt = pd(it.regTutup);
  const t1Akhir = pd(it.t1Akhir) ?? pd(it.t1Mulai);
  const t2 = pd(it.t2Mulai);

  // 1. Pendaftaran usai, tes pertama belum mulai.
  if (s === "Menunggu Tes") {
    const ts = tWindow(it).ts;
    if (ts) {
      const days = daysBetween(today, ts);
      if (days <= MOMEN_HORIZON.persiapan) {
        return { key: "persiapan", field: firstTestField(it), date: ts, label: "tes", days };
      }
    }
  }

  // 2. Di antara dua tahap. statusOf menyebut rentang ini "Tes Berlangsung"
  //    karena ia menggabungkan T1 sampai T2, jadi diperiksa sendiri di sini.
  if (t1Akhir && t2 && t1Akhir < today && today < t2) {
    const days = daysBetween(today, t2);
    if (days <= MOMEN_HORIZON.antar) {
      return { key: "antar", field: "t2Mulai", date: t2, label: "tahap 2", days };
    }
  }

  if (s === "Buka") {
    // 3. Tutup didahulukan dari "baru dibuka": pada pendaftaran yang pendek,
    //    urgensi lebih bernilai daripada kabar pembukaan.
    if (rt) {
      const days = daysBetween(today, rt);
      if (days >= 0 && days <= MOMEN_HORIZON.tutup) {
        return { key: "tutup", field: "regTutup", date: rt, label: "tutup", days };
      }
    }
    // 4. Baru dibuka.
    if (rb) {
      const lalu = daysBetween(rb, today);
      if (lalu >= 0 && lalu <= MOMEN_HORIZON.baru) {
        return { key: "baru", field: "regBuka", date: rb, label: "buka", days: -lalu };
      }
    }
  }

  // 5. Segera dibuka.
  if (s === "Akan Datang" && rb) {
    const days = daysBetween(today, rb);
    if (days <= MOMEN_HORIZON.segera) {
      return { key: "segera", field: "regBuka", date: rb, label: "buka", days };
    }
  }

  return null;
}

export function buildMomen(rows: Entry[], today: Date): { groups: MomenGroup[]; lainnya: number } {
  const byKey = new Map<MomenKey, MomenItem[]>(MOMEN_ORDER.map((k) => [k, []]));
  let lainnya = 0;

  for (const entry of rows) {
    const c = classify(entry, today);
    if (!c) {
      lainnya++;
      continue;
    }
    const { key, ...rest } = c;
    byKey.get(key)!.push({ entry, ...rest });
  }

  // "Baru dibuka" diurutkan dari yang paling baru; sisanya dari yang paling dekat.
  for (const [key, list] of byKey) {
    list.sort((a, b) => (key === "baru" ? b.days - a.days : a.days - b.days));
  }

  return { groups: MOMEN_ORDER.map((key) => ({ key, items: byKey.get(key)! })), lainnya };
}
