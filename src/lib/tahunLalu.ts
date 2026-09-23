import type { Entry } from "./types";

/**
 * Memasangkan tiap baris tahun ini dengan baris arsip yang SAMA programnya.
 *
 * Gunanya: kartu SEL berulang kali mengutip arsip secara manual ("mengacu satu
 * arsip resmi PCAM 9 tahun 2025"). Di sini perbandingan itu muncul sendiri di
 * samping tiap tanggal prediksi.
 *
 * PRINSIPNYA KONSERVATIF. Pasangan yang salah lebih buruk daripada tidak ada
 * pasangan - ia memberi "bukti" palsu untuk sebuah prediksi, dan justru tampil
 * paling meyakinkan. Karena itu:
 *   - wajib berbagi minimal satu kata yang KHAS (bukan "seleksi", bukan bulan,
 *     bukan nama platformnya sendiri);
 *   - kelompok yang saling meniadakan langsung menolak pasangan: "Tamtama TNI AU"
 *     berbagi kata "Tamtama" dengan "Bintara/Tamtama TNI AD", tapi AU dan AD
 *     adalah matra berbeda dengan jadwal berbeda;
 *   - skor seri berarti ragu, dan ragu berarti tidak dipasangkan;
 *   - nama program arsipnya selalu ditampilkan, jadi pasangan yang janggal
 *     kelihatan, bukan tersembunyi.
 */

/** Kata yang muncul di hampir semua baris, jadi tidak membedakan apa pun. */
const UMUM = new Set([
  "prediksi", "rekrutmen", "seleksi", "tahap", "gelombang", "gel", "periode", "rencana",
  "informasi", "official", "sederajat", "dan", "yang", "untuk", "tahun", "bagi", "calon",
  "batch", "program", "penerimaan", "pendaftaran", "angkatan", "lanjutan", "tes", "belum",
  "terverifikasi", "tentukan", "lowongan", "posisi", "perusahaan", "konfirmasi", "undangan",
  "arsip", "estimasi", "pembukaan", "rujukan", "umum", "lintas", "matra", "jadwal", "group",
  "januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september",
  "oktober", "november", "desember",
  // dua-tiga huruf yang tidak bermakna di sini - kode matra (ad/au/al) sengaja TIDAK ada
  "pk", "ii", "iii", "iv", "ke", "di", "mi",
]);

/** Kata yang sama dengan identitas platformnya - ada di hampir semua barisnya. */
const GENERIK: Record<string, string[]> = {
  JadiPrajurit: ["tni", "prajurit"],
  JadiPolisi: ["polri", "polisi"],
  JadiBUMN: ["bumn"],
  JadiOJK: ["ojk"],
  // PPG Calon Guru dan PPG Guru Tertentu adalah dua jalur berbeda; tanpa ini
  // keduanya berpasangan hanya karena sama-sama menyebut "PPG" dan "Guru".
  JadiPPG: ["ppg", "guru"],
};

/** Satu baris tidak boleh berpasangan dengan baris yang memegang anggota LAIN dari kelompok yang sama. */
const EKSKLUSIF: string[][] = [
  ["ad", "au", "al"],          // matra TNI
  ["akmil", "aal", "aau"],     // akademi TNI
];

function kata(e: Entry): Set<string> {
  const buang = new Set(GENERIK[e.platform] ?? []);
  return new Set(
    (e.program || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !UMUM.has(t) && !buang.has(t)),
  );
}

/**
 * Jalur khusus yang punya jadwal sendiri. "Bintara Brimob" berbagi kata
 * "Bintara" dengan arsip Bintara reguler, padahal kartu SEL-46-nya sendiri
 * menulis bahwa ia berbeda dari Bintara reguler. Kalau salah satu sisi memuat
 * kata ini dan sisi lain tidak, keduanya bukan program yang sama.
 */
const JALUR_KHUSUS = ["brimob", "sipss", "psdp", "penerbang"];

const ANGKA_ROMAWI: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

/**
 * Nomor gelombang/tahap/batch dari nama program. "LPDP Batch II" dan "LPDP
 * Tahap 1" sama-sama LPDP tapi gelombang berbeda dengan jadwal berbeda - tanpa
 * ini keduanya berpasangan, karena kata "batch", "tahap", dan angkanya sendiri
 * dibuang sebagai kata umum.
 */
function nomorGelombang(e: Entry): number | null {
  const m = (e.program || "").toLowerCase().match(/\b(?:batch|tahap|gelombang|gel)\.?\s*(\d+|[ivx]+)\b/);
  if (!m) return null;
  return /^\d+$/.test(m[1]) ? Number(m[1]) : (ANGKA_ROMAWI[m[1]] ?? null);
}

function bertentangan(a: Set<string>, b: Set<string>, ea: Entry, eb: Entry): boolean {
  if (JALUR_KHUSUS.some((t) => a.has(t) !== b.has(t))) return true;
  const ga = nomorGelombang(ea);
  const gb = nomorGelombang(eb);
  if (ga !== null && gb !== null && ga !== gb) return true;
  return EKSKLUSIF.some((grup) => {
    const ka = grup.filter((t) => a.has(t));
    const kb = grup.filter((t) => b.has(t));
    return ka.length > 0 && kb.length > 0 && !ka.some((t) => kb.includes(t));
  });
}

export function pasangkanArsip(rows: Entry[], arsip: Entry[]): Map<number, Entry> {
  const hasil = new Map<number, Entry>();
  const kataArsip = arsip.map((e) => ({ e, k: kata(e) }));

  for (const r of rows) {
    const kr = kata(r);
    if (kr.size === 0) continue;

    let terbaik: Entry | null = null;
    let skor = 0;
    let seri = false;
    for (const { e, k } of kataArsip) {
      if (e.platform !== r.platform || bertentangan(kr, k, r, e)) continue;
      let s = 0;
      for (const t of kr) if (k.has(t)) s++;
      if (s > skor) {
        terbaik = e;
        skor = s;
        seri = false;
      } else if (s === skor && s > 0) {
        seri = true;
      }
    }
    if (terbaik && skor > 0 && !seri) hasil.set(r.id, terbaik);
  }
  return hasil;
}
