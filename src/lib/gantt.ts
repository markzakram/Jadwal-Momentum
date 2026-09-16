import { dateStatusOf } from "./confidence";
import { daysBetween, pd } from "./status";
import type { DateStatus, Entry } from "./types";

/**
 * Menyusun model Gantt dari baris sheet.
 *
 * Dipisah dari komponennya karena semua yang sulit di sini adalah aritmetika
 * tanggal - batas bulan, rentang terbalik, baris tanpa tanggal - dan itu jauh
 * lebih mudah diuji tanpa DOM. Komponennya tinggal mengalikan `day` dengan
 * lebar satu hari.
 *
 * Satuan waktu di seluruh model adalah OFFSET HARI dari `from`, bukan piksel
 * dan bukan persen. Persen adalah yang membuat rel lama tidak bisa dibaca:
 * seluruh gambar berubah skala tiap kali penyaring mengubah rentang data, dan
 * bulan yang jumlah harinya berbeda tampak sama panjang.
 */

export type BarKind = "reg" | "tes";

export interface GBar {
  key: string;
  kind: BarKind;
  label: string;
  /** offset hari dari awal rentang */
  day: number;
  /** panjang dalam hari, minimal 1 (tanggal tunggal tetap tergambar) */
  days: number;
  from: Date;
  to: Date;
  status: DateStatus;
  /** benar bila sheet memuat akhir mendahului mulai - dipaksa jadi satu hari */
  clamped: boolean;
}

export interface GMark {
  key: string;
  label: string;
  day: number;
  date: Date;
  status: DateStatus;
}

export interface GRow {
  entry: Entry;
  bars: GBar[];
  marks: GMark[];
  /** offset hari paling awal dan paling akhir milik baris ini */
  day: number;
  endDay: number;
}

export interface GGroup {
  platform: string;
  rows: GRow[];
  day: number;
  endDay: number;
}

export interface GMonth {
  key: string;
  year: number;
  month: number;
  day: number;
  days: number;
}

export interface GanttModel {
  groups: GGroup[];
  months: GMonth[];
  from: Date;
  totalDays: number;
  /** offset hari garis "hari ini"; di luar rentang bila < 0 atau > totalDays */
  todayDay: number;
  /** baris tanpa satu pun tanggal - tak mungkin digambar, dihitung untuk catatan kaki */
  skipped: number;
}

const SPANS: { a: keyof Entry; b: keyof Entry; kind: BarKind; label: (e: Entry) => string }[] = [
  { a: "regBuka", b: "regTutup", kind: "reg", label: () => "Pendaftaran" },
  { a: "t1Mulai", b: "t1Akhir", kind: "tes", label: (e) => e.tahap1 || "Tahap 1" },
  { a: "t2Mulai", b: "t2Akhir", kind: "tes", label: (e) => e.tahap2 || "Tahap 2" },
];

const MARKS: { f: keyof Entry; label: (e: Entry) => string }[] = [
  { f: "pengT1", label: (e) => `Hasil ${e.tahap1 || "tahap 1"}` },
  { f: "pengT2", label: (e) => `Hasil ${e.tahap2 || "tahap 2"}` },
  { f: "pengAkhir", label: () => "Pengumuman akhir" },
];

interface RawSpan {
  kind: BarKind;
  label: string;
  a: Date;
  b: Date;
  field: string;
  status: DateStatus;
  clamped: boolean;
}

interface RawMark {
  label: string;
  d: Date;
  field: string;
  status: DateStatus;
}

function rawOf(e: Entry): { spans: RawSpan[]; marks: RawMark[] } {
  const spans: RawSpan[] = [];
  for (const s of SPANS) {
    const a = pd(String(e[s.a] ?? ""));
    const b = pd(String(e[s.b] ?? ""));
    // Tutup tanpa buka tetap digambar sebagai satu hari - justru itu tanggal
    // yang paling dicari orang, jadi membuangnya kerugian terbesar.
    const start = a ?? b;
    if (!start) continue;
    const end = b ?? start;
    const clamped = end < start;
    const field = a ? String(s.a) : String(s.b);
    spans.push({
      kind: s.kind,
      label: s.label(e),
      a: start,
      b: clamped ? start : end,
      field,
      status: dateStatusOf(e, field),
      clamped,
    });
  }

  const marks: RawMark[] = [];
  for (const m of MARKS) {
    const d = pd(String(e[m.f] ?? ""));
    if (d) marks.push({ label: m.label(e), d, field: String(m.f), status: dateStatusOf(e, String(m.f)) });
  }

  return { spans, marks };
}

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const nextMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

export function buildGantt(rows: Entry[], today: Date): GanttModel {
  const raw = rows.map((entry) => ({ entry, ...rawOf(entry) }));
  const drawable = raw.filter((r) => r.spans.length > 0 || r.marks.length > 0);
  const skipped = raw.length - drawable.length;

  if (drawable.length === 0) {
    const from = monthStart(today);
    const totalDays = daysBetween(from, nextMonthStart(today));
    return {
      groups: [],
      months: [
        { key: `${from.getFullYear()}-${from.getMonth()}`, year: from.getFullYear(), month: from.getMonth(), day: 0, days: totalDays },
      ],
      from,
      totalDays,
      todayDay: daysBetween(from, today),
      skipped,
    };
  }

  // Rentang selalu memuat hari ini, supaya garis "hari ini" punya tempat meski
  // seluruh data ada di masa depan.
  const stamps: number[] = [today.getTime()];
  for (const r of drawable) {
    for (const s of r.spans) stamps.push(s.a.getTime(), s.b.getTime());
    for (const m of r.marks) stamps.push(m.d.getTime());
  }
  const from = monthStart(new Date(Math.min(...stamps)));
  const end = nextMonthStart(new Date(Math.max(...stamps)));
  const totalDays = daysBetween(from, end);
  const dayOf = (d: Date) => daysBetween(from, d);

  const months: GMonth[] = [];
  for (let m = new Date(from); m < end; m = nextMonthStart(m)) {
    const next = nextMonthStart(m);
    months.push({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      year: m.getFullYear(),
      month: m.getMonth(),
      day: dayOf(m),
      days: daysBetween(m, next),
    });
  }

  const byPlatform = new Map<string, GRow[]>();
  for (const r of drawable) {
    const bars: GBar[] = r.spans.map((s, i) => ({
      key: `${r.entry.id}-b${i}`,
      kind: s.kind,
      label: s.label,
      day: dayOf(s.a),
      days: Math.max(1, dayOf(s.b) - dayOf(s.a) + 1),
      from: s.a,
      to: s.b,
      status: s.status,
      clamped: s.clamped,
    }));
    const marks: GMark[] = r.marks.map((m, i) => ({
      key: `${r.entry.id}-m${i}`,
      label: m.label,
      day: dayOf(m.d),
      date: m.d,
      status: m.status,
    }));
    const starts = [...bars.map((b) => b.day), ...marks.map((m) => m.day)];
    const ends = [...bars.map((b) => b.day + b.days), ...marks.map((m) => m.day + 1)];
    const row: GRow = {
      entry: r.entry,
      bars,
      marks,
      day: Math.min(...starts),
      endDay: Math.max(...ends),
    };
    const key = r.entry.platform || "Lainnya";
    const list = byPlatform.get(key);
    if (list) list.push(row);
    else byPlatform.set(key, [row]);
  }

  const groups: GGroup[] = [...byPlatform.entries()]
    .map(([platform, list]) => {
      // Di dalam satu platform urutannya kronologis - itu cara Gantt dibaca.
      const sorted = [...list].sort((a, b) => a.day - b.day || a.endDay - b.endDay);
      return {
        platform,
        rows: sorted,
        day: Math.min(...sorted.map((r) => r.day)),
        endDay: Math.max(...sorted.map((r) => r.endDay)),
      };
    })
    .sort((a, b) => a.day - b.day || a.platform.localeCompare(b.platform));

  return { groups, months, from, totalDays, todayDay: dayOf(today), skipped };
}

export const ZOOMS = [
  { key: "padat", label: "Padat", dayW: 2.7 },
  { key: "sedang", label: "Sedang", dayW: 5.6 },
  { key: "lebar", label: "Lebar", dayW: 12 },
] as const;

export type ZoomKey = (typeof ZOOMS)[number]["key"];

/**
 * Zoom awal dipilih dari panjang rentang, bukan dari lebar layar - supaya
 * render di server dan di browser menghasilkan markup yang sama persis.
 */
export function defaultZoom(totalDays: number): ZoomKey {
  if (totalDays > 420) return "padat";
  if (totalDays > 200) return "sedang";
  return "lebar";
}
