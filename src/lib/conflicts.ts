import { pd, toIso } from "./status";
import type { Entry } from "./types";

/**
 * Mencari PERIODE PADAT: rentang hari ketika beberapa platform menjalankan tes
 * bersamaan.
 *
 * Versi pertama melaporkan pasangan program yang beririsan. Secara hitungan itu
 * benar, tapi pada 28 baris tab Real menghasilkan 45 pasang yang melibatkan 13
 * baris - JadiPrajurit sendiri punya enam gelombang berentang berminggu-minggu,
 * jadi pasangannya meledak dan daftarnya tidak terbaca.
 *
 * Yang dipakai sekarang menjawab pertanyaan yang sebenarnya dipakai untuk
 * merencanakan: kapan bebannya menumpuk, dan platform apa saja yang terlibat.
 * Dihitung per hari, lalu hari-hari berurutan digabung jadi satu periode.
 */

export interface Busy {
  entry: Entry;
  label: string;
  start: Date;
  end: Date;
  /** kolom tanggal mulainya, untuk menampilkan status keyakinannya */
  field: string;
}

export interface CrunchPeriod {
  from: Date;
  to: Date;
  days: number;
  /** jumlah platform terbanyak yang bersamaan dalam satu hari di periode ini */
  peak: number;
  platforms: string[];
  entries: Busy[];
}

const DAY = 864e5;

/**
 * Kunci hari memakai tanggal LOKAL, bukan epoch dibagi 86400000. Tengah malam
 * WIB adalah pukul 17:00 UTC hari sebelumnya, jadi pembagian epoch menggeser
 * seluruh periode satu hari ke belakang.
 */
const dayKey = (d: Date) => toIso(d);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function testWindows(it: Entry): Busy[] {
  const out: Busy[] = [];
  const add = (a: string, b: string, name: string, field: string) => {
    const start = pd(a);
    if (!start) return;
    const raw = pd(b) ?? start;
    // rentang terbalik di sheet dijadikan satu hari; validate.ts yang melaporkannya
    out.push({ entry: it, label: name, start, end: raw >= start ? raw : start, field });
  };
  add(it.t1Mulai, it.t1Akhir, it.tahap1 || "Tahap 1", "t1Mulai");
  add(it.t2Mulai, it.t2Akhir, it.tahap2 || "Tahap 2", "t2Mulai");
  return out;
}

export function findCrunch(
  rows: Entry[],
  today: Date,
  opts: { minPlatforms?: number; horizonDays?: number } = {},
): CrunchPeriod[] {
  const minPlatforms = opts.minPlatforms ?? 3;
  const horizon = opts.horizonDays ?? 180;
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + horizon);

  const windows = rows.flatMap(testWindows).filter((w) => w.end >= today && w.start <= last);

  // hari -> platform yang tesnya berjalan
  const perDay = new Map<string, Set<string>>();
  const busyPerDay = new Map<string, Busy[]>();
  const dateOf = new Map<string, Date>();

  for (const w of windows) {
    const from = w.start < today ? today : w.start;
    const to = w.end > last ? last : w.end;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const k = dayKey(d);
      if (!perDay.has(k)) {
        perDay.set(k, new Set());
        busyPerDay.set(k, []);
        dateOf.set(k, d);
      }
      if (w.entry.platform) perDay.get(k)!.add(w.entry.platform);
      busyPerDay.get(k)!.push(w);
    }
  }

  const hot = [...perDay.entries()]
    .filter(([, set]) => set.size >= minPlatforms)
    .map(([k]) => k)
    .sort();

  const out: CrunchPeriod[] = [];
  let run: string[] = [];

  const flush = () => {
    if (!run.length) return;
    const from = dateOf.get(run[0])!;
    const to = dateOf.get(run[run.length - 1])!;

    const platforms = new Set<string>();
    const seen = new Map<string, Busy>();
    let peak = 0;
    for (const k of run) {
      peak = Math.max(peak, perDay.get(k)!.size);
      for (const p of perDay.get(k)!) platforms.add(p);
      for (const b of busyPerDay.get(k)!) seen.set(`${b.entry.id}-${b.label}`, b);
    }

    out.push({
      from,
      to,
      days: Math.round((to.getTime() - from.getTime()) / DAY) + 1,
      peak,
      platforms: [...platforms].sort(),
      entries: [...seen.values()].sort((a, b) => a.start.getTime() - b.start.getTime()),
    });
    run = [];
  };

  for (const k of hot) {
    if (run.length && k !== dayKey(addDays(dateOf.get(run[run.length - 1])!, 1))) flush();
    run.push(k);
  }
  flush();

  return out;
}

export function crunchIds(list: CrunchPeriod[]): Set<number> {
  const s = new Set<number>();
  for (const p of list) for (const b of p.entries) s.add(b.entry.id);
  return s;
}

export function periodIso(p: CrunchPeriod): { from: string; to: string } {
  return { from: toIso(p.from), to: toIso(p.to) };
}
