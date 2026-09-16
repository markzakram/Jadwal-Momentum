import type { Entry } from "./types";

/**
 * Membandingkan isi sheet sekarang dengan cuplikan terakhir yang dilihat
 * pembaca, lalu melaporkan apa yang bergeser.
 *
 * Modul ini murni: menerima cuplikan, mengembalikan daftar perubahan. Di mana
 * cuplikannya disimpan bukan urusannya - sekarang di localStorage tiap peramban
 * (lihat ChangesPanel), dan bisa dipindah ke penyimpanan bersama tanpa menyentuh
 * logika di sini.
 */

/** Naik ke 2 saat kolom status per kelompok tanggal ditambahkan ke TRACKED. */
export const SNAPSHOT_VERSION = 2;

/** Urutan tetap; menambah kolom berarti menaikkan SNAPSHOT_VERSION. */
export const TRACKED = [
  ["tipe", "Tipe", false],
  ["platform", "Platform", false],
  ["program", "Program", false],
  ["regBuka", "Reg Buka", true],
  ["regTutup", "Reg Tutup", true],
  ["tahap1", "Nama Tahap 1", false],
  ["t1Mulai", "T1 Mulai", true],
  ["t1Akhir", "T1 Akhir", true],
  ["pengT1", "Pengumuman T1", true],
  ["tahap2", "Nama Tahap 2", false],
  ["t2Mulai", "T2 Mulai", true],
  ["t2Akhir", "T2 Akhir", true],
  ["pengT2", "Pengumuman T2", true],
  ["pengAkhir", "Pengumuman Akhir", true],
  ["catatan", "Catatan", false],
  ["linkWeb", "Link Web", false],
  ["linkEbook", "Link Ebook", false],
  ["sReg", "Status Reg", false],
  ["sTes", "Status Tes", false],
  ["sPeng", "Status Pengumuman", false],
] as const satisfies readonly (readonly [keyof Entry, string, boolean])[];

export interface Snapshot {
  v: number;
  sheet: string;
  takenAt: string;
  /** id baris -> nilai kolom, urutannya mengikuti TRACKED */
  rows: Record<string, string[]>;
}

export type ChangeKind = "baru" | "ubah" | "hilang";

export interface FieldChange {
  field: keyof Entry;
  label: string;
  isDate: boolean;
  from: string;
  to: string;
}

export interface Change {
  kind: ChangeKind;
  id: number;
  platform: string;
  program: string;
  fields: FieldChange[];
  /** benar bila ada kolom tanggal yang berubah - dipakai untuk mengurutkan */
  touchesDate: boolean;
}

export function takeSnapshot(rows: Entry[], sheet: string, at: Date): Snapshot {
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    out[String(r.id)] = TRACKED.map(([f]) => String(r[f] ?? ""));
  }
  return { v: SNAPSHOT_VERSION, sheet, takenAt: at.toISOString(), rows: out };
}

/** Nama baris diambil dari data terbaru bila ada, kalau tidak dari cuplikan lama. */
function nameOf(id: string, prev: Snapshot, next: Snapshot): { platform: string; program: string } {
  const src = next.rows[id] ?? prev.rows[id];
  return { platform: src?.[1] ?? "", program: src?.[2] ?? "" };
}

export function diffSnapshots(prev: Snapshot | null, next: Snapshot): Change[] {
  // Tidak ada pembanding, atau cuplikan dari versi/sheet lain: bukan perubahan,
  // hanya belum ada dasar untuk membandingkan.
  if (!prev || prev.v !== next.v || prev.sheet !== next.sheet) return [];

  const out: Change[] = [];
  const ids = new Set([...Object.keys(prev.rows), ...Object.keys(next.rows)]);

  for (const id of ids) {
    const a = prev.rows[id];
    const b = next.rows[id];
    const { platform, program } = nameOf(id, prev, next);

    if (!a && b) {
      out.push({ kind: "baru", id: Number(id), platform, program, fields: [], touchesDate: false });
      continue;
    }
    if (a && !b) {
      out.push({ kind: "hilang", id: Number(id), platform, program, fields: [], touchesDate: false });
      continue;
    }
    if (!a || !b) continue;

    const fields: FieldChange[] = [];
    for (let i = 0; i < TRACKED.length; i++) {
      const [field, label, isDate] = TRACKED[i];
      const from = a[i] ?? "";
      const to = b[i] ?? "";
      if (from !== to) fields.push({ field, label, isDate, from, to });
    }
    if (fields.length) {
      out.push({
        kind: "ubah",
        id: Number(id),
        platform,
        program,
        fields,
        touchesDate: fields.some((f) => f.isDate),
      });
    }
  }

  // tanggal bergeser lebih penting daripada catatan atau tautan yang disunting
  const rank = (c: Change) => (c.kind === "ubah" && c.touchesDate ? 0 : c.kind === "baru" ? 1 : c.kind === "ubah" ? 2 : 3);
  return out.sort((x, y) => rank(x) - rank(y) || x.id - y.id);
}

export function countChanges(list: Change[]) {
  return {
    total: list.length,
    baru: list.filter((c) => c.kind === "baru").length,
    ubah: list.filter((c) => c.kind === "ubah").length,
    hilang: list.filter((c) => c.kind === "hilang").length,
    tanggal: list.filter((c) => c.touchesDate).length,
  };
}
