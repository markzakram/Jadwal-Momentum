import type { Entry, Status } from "./types";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Parse 'YYYY-MM-DD' menjadi Date lokal tengah malam. */
export function pd(s: string | undefined): Date | null {
  if (!s) return null;
  const p = String(s).split("-");
  if (p.length !== 3) return null;
  const y = Number(p[0]);
  const m = Number(p[1]);
  const d = Number(p[2]);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function fmt(s: string | undefined): string {
  const d = pd(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "—";
}

export function fmtShort(s: string | undefined): string {
  const d = pd(s);
  return d ? `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}` : "—";
}

export function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** Rentang tes gabungan Tahap 1 + Tahap 2. */
export function tWindow(it: Entry): { ts: Date | null; te: Date | null } {
  const starts = [pd(it.t1Mulai), pd(it.t2Mulai)].filter(Boolean) as Date[];
  const ends = [pd(it.t1Akhir), pd(it.t2Akhir), pd(it.t1Mulai), pd(it.t2Mulai)].filter(Boolean) as Date[];
  return {
    ts: starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null,
    te: ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null,
  };
}

export function finalPeng(it: Entry): Date | null {
  return pd(it.pengAkhir) ?? pd(it.pengT2) ?? pd(it.pengT1);
}

/**
 * Status dihitung relatif terhadap `today` yang dioper, bukan jam global - supaya
 * render di server dan di browser memberi hasil yang sama (tidak ada hydration
 * mismatch) dan fungsinya bisa diuji.
 */
export function statusOf(it: Entry, today: Date): Status {
  const t = today;
  const rb = pd(it.regBuka);
  const rt = pd(it.regTutup);
  const w = tWindow(it);
  const pa = finalPeng(it);

  if (rb && t < rb) return "Akan Datang";
  if (rb && rt && t >= rb && t <= rt) return "Buka";
  if (rb && !rt && t >= rb && (!w.ts || t < w.ts)) return "Buka";
  if (w.ts && w.te && t >= w.ts && t <= w.te) return "Tes Berlangsung";
  if (w.te && t > w.te) return pa && t <= pa ? "Menunggu Hasil" : "Selesai";
  if (w.ts && t < w.ts) return "Menunggu Tes";
  if (rt && t > rt) return pa && t <= pa ? "Menunggu Hasil" : "Selesai";
  return "Selesai";
}

export function countdown(it: Entry, s: Status, today: Date): string {
  const t = today.getTime();
  const days = (d: Date) => Math.ceil((d.getTime() - t) / 864e5);

  if (s === "Buka") {
    const rt = pd(it.regTutup);
    if (rt) {
      const d = days(rt);
      return d >= 0 ? `Tutup dalam ${d} hari` : "";
    }
  }
  if (s === "Akan Datang") {
    const rb = pd(it.regBuka);
    if (rb) return `Buka dalam ${days(rb)} hari`;
  }
  if (s === "Menunggu Tes") {
    const w = tWindow(it);
    if (w.ts) return `Tes dalam ${days(w.ts)} hari`;
  }
  if (s === "Menunggu Hasil") {
    const pa = finalPeng(it);
    if (pa) return `Pengumuman dalam ${days(pa)} hari`;
  }
  return "";
}

/**
 * Apa yang sebenarnya sedang dihitung mundur. Versi lama memakai satu kolom
 * "sisa hari" yang diam-diam berganti makna antar baris; di sini labelnya ikut,
 * jadi angkanya selalu jelas menghitung apa.
 */
export interface NextEvent {
  /** nama kejadiannya, tanpa tanggal */
  what: string;
  /** kolom tanggal yang dihitung - dipakai untuk menampilkan status keyakinannya */
  field: string;
  date: Date | null;
}

/** Kolom mana yang memuat ujung rentang tes yang sedang dipakai. */
function endField(it: Entry): string {
  const t1 = pd(it.t1Akhir) ?? pd(it.t1Mulai);
  const t2 = pd(it.t2Akhir) ?? pd(it.t2Mulai);
  if (t1 && t2) return t2 >= t1 ? (it.t2Akhir ? "t2Akhir" : "t2Mulai") : it.t1Akhir ? "t1Akhir" : "t1Mulai";
  if (t2) return it.t2Akhir ? "t2Akhir" : "t2Mulai";
  return it.t1Akhir ? "t1Akhir" : "t1Mulai";
}

function startField(it: Entry): string {
  const t1 = pd(it.t1Mulai);
  const t2 = pd(it.t2Mulai);
  if (t1 && t2) return t1 <= t2 ? "t1Mulai" : "t2Mulai";
  return t1 ? "t1Mulai" : "t2Mulai";
}

export function nextEvent(it: Entry, s: Status): NextEvent {
  const w = tWindow(it);
  switch (s) {
    case "Akan Datang":
      return { what: "Buka", field: "regBuka", date: pd(it.regBuka) };
    case "Buka":
      return it.regTutup
        ? { what: "Tutup", field: "regTutup", date: pd(it.regTutup) }
        : { what: "Pendaftaran berjalan", field: "", date: null };
    case "Menunggu Tes":
      return { what: it.tahap1 || "Tes", field: startField(it), date: w.ts };
    case "Tes Berlangsung":
      return { what: `${it.tahap1 || "Tes"} s/d`, field: endField(it), date: w.te };
    case "Menunggu Hasil": {
      const pa = finalPeng(it);
      const field = it.pengAkhir ? "pengAkhir" : it.pengT2 ? "pengT2" : "pengT1";
      return { what: "Pengumuman", field, date: pa };
    }
    default:
      return { what: "—", field: "", date: null };
  }
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 864e5);
}

/** Satu baris dipecah jadi kejadian-kejadian bertanggal, untuk tampilan Agenda. */
export interface AgendaEvent {
  key: string;
  date: Date;
  until: Date | null;
  label: string;
  kind: "daftar" | "tes" | "hasil";
  entry: Entry;
  /** kolom tanggal asalnya, untuk menampilkan status keyakinannya */
  field: string;
}

export function agendaEvents(rows: Entry[], from: Date): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  const push = (e: Entry, field: string, until: Date | null, label: string, kind: AgendaEvent["kind"]) => {
    const date = pd(e[field as keyof Entry] as string);
    if (date) out.push({ key: `${e.id}-${field}`, date, until, label, kind, entry: e, field });
  };

  for (const e of rows) {
    push(e, "regBuka", pd(e.regTutup), "Pendaftaran dibuka", "daftar");
    push(e, "regTutup", null, "Pendaftaran tutup", "daftar");
    push(e, "t1Mulai", pd(e.t1Akhir), e.tahap1 || "Tahap 1", "tes");
    push(e, "pengT1", null, `Hasil ${e.tahap1 || "tahap 1"}`, "hasil");
    push(e, "t2Mulai", pd(e.t2Akhir), e.tahap2 || "Tahap 2", "tes");
    push(e, "pengT2", null, `Hasil ${e.tahap2 || "tahap 2"}`, "hasil");
    push(e, "pengAkhir", null, "Pengumuman akhir", "hasil");
  }

  return out.filter((x) => x.date >= from).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Tahun yang paling banyak dipakai baris-baris ini - dipakai sebagai tahun timeline. */
export function dominantYear(rows: Entry[], fallbackYear: number): number {
  const tally = new Map<number, number>();
  for (const it of rows) {
    for (const key of ["regBuka", "t1Mulai", "t2Mulai", "pengAkhir"] as const) {
      const d = pd(it[key]);
      if (d) tally.set(d.getFullYear(), (tally.get(d.getFullYear()) ?? 0) + 1);
    }
  }
  let best = fallbackYear;
  let bestN = 0;
  for (const [year, n] of tally) {
    if (n > bestN) {
      best = year;
      bestN = n;
    }
  }
  return best;
}
