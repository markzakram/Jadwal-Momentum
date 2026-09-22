import fallbackRows from "@/data/fallback.json";
import { accessToken, serviceAccount } from "./google-auth";
import type { Entry, SheetKey, SheetPayload, Tipe } from "./types";

const REVALIDATE_SECONDS = 300;

/**
 * URL CSV per sheet - dua dari tiga cara membaca sheet:
 *   1. GOOGLE_SHEET_ID  - butuh spreadsheet di-share "anyone with the link can view"
 *   2. SHEET_CSV_<KEY>  - URL "Publish to web" lengkap, menang atas cara 1
 * Cara ketiga (service account) tidak lewat CSV sama sekali; lihat getSheetData.
 */
function csvUrl(sheet: SheetKey): string | null {
  const explicit = process.env[`SHEET_CSV_${sheet.toUpperCase()}`];
  if (explicit) return explicit;

  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

/** Parser CSV yang menghormati tanda kutip - kolom Catatan penuh koma dan baris baru. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const MONTH_WORDS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7,
  aug: 8, agu: 8, agt: 8, sep: 9, sept: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

/**
 * Google Sheets mengekspor tanggal sesuai format tampilan sel, dan nama bulannya
 * ikut locale spreadsheet - "07-Agu-2026" di locale Indonesia, "07-Aug-2026" di
 * locale Inggris. Semuanya dinormalkan ke 'YYYY-MM-DD'.
 */
export function parseDateCell(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const worded = v.match(/^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})$/);
  if (worded) {
    const m = MONTH_WORDS[worded[2].toLowerCase().slice(0, 4)] ?? MONTH_WORDS[worded[2].toLowerCase().slice(0, 3)];
    if (m) return `${worded[3]}-${String(m).padStart(2, "0")}-${worded[1].padStart(2, "0")}`;
  }

  // dd/mm/yyyy - diasumsikan hari dulu (locale Indonesia)
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

const COLUMN_ALIASES: Record<keyof Entry, string[]> = {
  id: ["id"],
  tipe: ["tipe"],
  platform: ["platform"],
  program: ["program", "program / sub-program", "program/sub-program"],
  regBuka: ["reg buka"],
  regTutup: ["reg tutup"],
  tahap1: ["tahap 1", "nama tahap 1"],
  t1Mulai: ["t1 mulai"],
  t1Akhir: ["t1 akhir"],
  pengT1: ["pengumuman t1", "pengumuman hasil tahap 1"],
  tahap2: ["tahap 2", "nama tahap 2"],
  t2Mulai: ["t2 mulai"],
  t2Akhir: ["t2 akhir"],
  pengT2: ["pengumuman t2", "pengumuman hasil tahap 2"],
  pengAkhir: ["pengumuman akhir", "pengumuman hasil akhir / kelulusan"],
  catatan: ["catatan"],
  linkWeb: ["link web", "link web resmi"],
  linkEbook: ["link ebook"],
  // opsional; sheet tanpa kolom ini tetap terbaca dan jatuh ke kolom Tipe
  sReg: ["status reg", "status registrasi", "s reg"],
  sTes: ["status tes", "status tahap", "s tes"],
  sPeng: ["status pengumuman", "status peng", "s peng"],
};

const DATE_FIELDS: (keyof Entry)[] = [
  "regBuka", "regTutup", "t1Mulai", "t1Akhir", "pengT1", "t2Mulai", "t2Akhir", "pengT2", "pengAkhir",
];

/**
 * Baris header dicari, bukan diasumsikan di baris 1. Sheet Data2025 punya URL web
 * app di baris 1 dan headernya baru di baris 2; versi Apps Script lama membaca
 * baris header itu sebagai data dan memunculkan kartu palsu "Platform / Tipe".
 * Kolom dipetakan lewat nama, jadi urutan kolom boleh berubah.
 */
export function rowsFromCsv(text: string): Entry[] {
  return rowsFromTable(parseCsv(text));
}

/**
 * Inti pembacanya bekerja pada tabel, bukan teks CSV - jalur service account
 * menerima larik dari Sheets API dan memakai pemetaan kolom yang sama persis.
 */
export function rowsFromTable(table: string[][]): Entry[] {
  const headerIdx = table.findIndex((r) => {
    const cells = r.map((c) => c.trim().toLowerCase());
    return cells.includes("tipe") && cells.includes("platform");
  });
  if (headerIdx < 0) return [];

  const header = table[headerIdx].map((c) => c.trim().toLowerCase());
  const at: Partial<Record<keyof Entry, number>> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof Entry, string[]][]) {
    const i = header.findIndex((h) => aliases.includes(h));
    if (i >= 0) at[field] = i;
  }

  const out: Entry[] = [];
  for (let r = headerIdx + 1; r < table.length; r++) {
    const cells = table[r];
    const get = (f: keyof Entry) => {
      const i = at[f];
      return i === undefined ? "" : (cells[i] ?? "").trim();
    };

    const platform = get("platform");
    const tipeRaw = get("tipe");
    if (!platform && !tipeRaw) continue;

    const entry = {
      id: Number(get("id")) || out.length + 1,
      tipe: (tipeRaw.toLowerCase().startsWith("real") ? "Real" : "Prediksi") as Tipe,
      platform,
      program: get("program"),
      tahap1: get("tahap1"),
      tahap2: get("tahap2"),
      catatan: get("catatan"),
      linkWeb: get("linkWeb"),
      linkEbook: get("linkEbook"),
      sReg: get("sReg"),
      sTes: get("sTes"),
      sPeng: get("sPeng"),
    } as Entry;

    for (const f of DATE_FIELDS) {
      (entry[f] as string) = parseDateCell(get(f));
    }
    out.push(entry);
  }
  return out;
}

const FALLBACK = fallbackRows as Entry[];

/**
 * Cara ketiga: Sheets API dengan service account.
 *
 * Ini satu-satunya cara yang tidak menuntut spreadsheet dibuka ke publik -
 * cukup di-share ke satu alamat robot. Banyak domain Workspace memang melarang
 * berbagi publik, jadi bagi sebagian orang inilah satu-satunya jalan.
 *
 * Aksesnya sengaja `spreadsheets.readonly`: halaman ini tidak pernah menulis,
 * dan kunci yang sama mungkin dipakai proyek lain yang memang menulis.
 */
async function tableFromApi(sheet: SheetKey, id: string): Promise<string[][]> {
  const token = await accessToken("https://www.googleapis.com/auth/spreadsheets.readonly");
  // Nama sheet sebagai rentang = seluruh bagian terpakai, jadi tidak ada batas
  // baris/kolom yang harus ditebak dan diperbarui saat sheet bertambah.
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}` +
    `/values/${encodeURIComponent(sheet)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

export async function getSheetData(sheet: SheetKey): Promise<SheetPayload> {
  const fetchedAt = new Date().toISOString();
  const id = process.env.GOOGLE_SHEET_ID;

  /*
   * Tangga prioritas, dari yang paling tegas ke yang paling umum:
   *   1. SHEET_CSV_<KEY>    URL publish-to-web yang ditulis tangan untuk sheet ini
   *   2. service account    butuh GOOGLE_SHEET_ID juga; tidak perlu sheet publik
   *   3. GOOGLE_SHEET_ID    ekspor CSV biasa; sheet harus bisa dibaca siapa saja
   */
  const explicitCsv = process.env[`SHEET_CSV_${sheet.toUpperCase()}`];
  const viaApi = !explicitCsv && !!id && !!serviceAccount();

  if (viaApi) {
    try {
      const rows = rowsFromTable(await tableFromApi(sheet, id!));
      if (!rows.length) throw new Error("tidak ada baris terbaca - cek nama sheet dan hak aksesnya");
      return { rows, source: "sheet", fetchedAt };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return {
        rows: sheet === "DATA" ? FALLBACK : [],
        source: "fallback",
        fetchedAt,
        warning:
          `Gagal membaca sheet ${sheet} lewat service account (${reason}). ` +
          `Pastikan spreadsheet sudah di-share ke alamat service account-nya. Menampilkan data cadangan.`,
      };
    }
  }

  const url = csvUrl(sheet);

  if (!url) {
    return {
      rows: sheet === "DATA" ? FALLBACK : [],
      source: "fallback",
      fetchedAt,
      warning:
        sheet === "DATA"
          ? "GOOGLE_SHEET_ID belum diset - menampilkan data contoh yang ikut dalam repo."
          : `GOOGLE_SHEET_ID belum diset, sheet ${sheet} tidak punya data contoh.`,
    };
  }

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = rowsFromCsv(await res.text());
    if (!rows.length) throw new Error("tidak ada baris terbaca - cek nama sheet dan hak aksesnya");
    return { rows, source: "sheet", fetchedAt };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      rows: sheet === "DATA" ? FALLBACK : [],
      source: "fallback",
      fetchedAt,
      warning: `Gagal membaca sheet ${sheet} (${reason}). Menampilkan data cadangan.`,
    };
  }
}

/** Tanggal "hari ini" menurut WIB, supaya server di UTC tidak bergeser sehari. */
export function todayInJakarta(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}
