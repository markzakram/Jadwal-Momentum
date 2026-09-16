import { dateStatusOf } from "./confidence";
import { pd } from "./status";
import { DATE_STATUS_INFO, type Entry } from "./types";

/**
 * Penyusun iCalendar (RFC 5545) tanpa dependensi.
 *
 * Tiga hal yang paling sering salah dan sengaja ditangani di sini:
 *  - kejadian sehari penuh memakai DTEND yang EKSKLUSIF, jadi tanggal akhir
 *    harus ditambah satu hari atau acaranya tampil kurang sehari di kalender;
 *  - pemisah baris wajib CRLF, bukan LF;
 *  - baris lebih dari 75 oktet harus dilipat (CRLF + satu spasi), dihitung
 *    per oktet UTF-8, bukan per karakter - nama program kita banyak memakai
 *    em-dash yang memakan 3 oktet.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  /** tanggal terakhir yang MASIH termasuk; null untuk kejadian satu hari */
  endInclusive: Date | null;
  summary: string;
  description?: string;
  url?: string;
  category?: string;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function stampUtc(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

/** Pelolosan nilai TEXT sesuai RFC 5545 3.3.11. Urutan backslash harus pertama. */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lipat baris pada 75 oktet. Lanjutan diawali satu spasi. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // jangan memotong di tengah rangkaian oktet UTF-8
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // baris lanjutan kehilangan satu oktet untuk spasi di depan
  }
  return parts.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], opts: { name: string; now: Date }): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tim Marketing Cerebrum//Jadwal Seleksi//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    "X-WR-TIMEZONE:Asia/Jakarta",
    "X-PUBLISHED-TTL:PT6H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];

  for (const e of events) {
    // Sheet bisa memuat rentang terbalik - LPDP Batch II pernah punya Reg Tutup
    // lebih awal dari Reg Buka. VEVENT dengan DTEND <= DTSTART ditolak sebagian
    // kalender, jadi di sini diperlakukan sebagai kejadian satu hari. Kekeliruan
    // datanya sendiri dilaporkan oleh pemeriksa di src/lib/validate.ts.
    const last = e.endInclusive && e.endInclusive >= e.start ? e.endInclusive : e.start;
    const exclusive = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stampUtc(opts.now)}`);
    lines.push(`DTSTART;VALUE=DATE:${ymd(e.start)}`);
    lines.push(`DTEND;VALUE=DATE:${ymd(exclusive)}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.category) lines.push(`CATEGORIES:${escapeText(e.category)}`);
    // acara jadwal tidak membuat orangnya "sibuk" di kalender
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

const SLOTS = [
  { field: "rb", date: "regBuka", until: "regTutup", label: "Pendaftaran" },
  { field: "t1", date: "t1Mulai", until: "t1Akhir", label: null },
  { field: "p1", date: "pengT1", until: null, label: "Pengumuman" },
  { field: "t2", date: "t2Mulai", until: "t2Akhir", label: null },
  { field: "p2", date: "pengT2", until: null, label: "Pengumuman" },
  { field: "pa", date: "pengAkhir", until: null, label: "Pengumuman akhir" },
] as const;

export function entriesToEvents(rows: Entry[], sheet: string): IcsEvent[] {
  const out: IcsEvent[] = [];

  for (const it of rows) {
    const who = it.program ? `${it.platform} — ${it.program}` : it.platform;

    for (const slot of SLOTS) {
      const start = pd(it[slot.date] as string);
      if (!start) continue;

      // keyakinan dinilai per tanggal, bukan per baris: registrasi bisa resmi
      // sementara tanggal tesnya masih perkiraan
      const status = dateStatusOf(it, slot.date);
      const info = DATE_STATUS_INFO[status];
      const tag = status === "resmi" ? "" : `[${info.label.toLowerCase()}] `;

      let what: string;
      if (slot.field === "t1") what = it.tahap1 || "Tahap 1";
      else if (slot.field === "t2") what = it.tahap2 || "Tahap 2";
      else if (slot.field === "p1") what = `Pengumuman ${it.tahap1 || "tahap 1"}`;
      else if (slot.field === "p2") what = `Pengumuman ${it.tahap2 || "tahap 2"}`;
      else what = slot.label!;

      const desc: string[] = [`${info.label}: ${info.hint}`];
      if (it.catatan) desc.push(it.catatan);
      if (it.linkEbook) desc.push(`Ebook: ${it.linkEbook}`);

      out.push({
        uid: `jadwal-${sheet}-${it.id}-${slot.field}@dashboard-jadwal-seleksi`,
        start,
        endInclusive: slot.until ? pd(it[slot.until] as string) : null,
        summary: `${tag}${who} · ${what}`,
        description: desc.join("\n\n"),
        url: it.linkWeb || undefined,
        category: it.platform || undefined,
      });
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
