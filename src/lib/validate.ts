import { isUnknownStatus } from "./confidence";
import { fmt, pd } from "./status";
import { DATE_STATUSES, type Entry } from "./types";

/**
 * Pemeriksa isi sheet. Tanpa ini, data yang keliru tetap dirender diam-diam -
 * baris LPDP Batch II misalnya punya Reg Tutup 27 Juli tapi Reg Buka 3 Agustus,
 * dan dashboard lama menampilkannya seolah wajar.
 *
 * Fungsinya murni: terima baris, kembalikan temuan. Tidak membaca jam, tidak
 * menyentuh DOM, jadi bisa diuji langsung.
 */

export type Severity = "error" | "warning";

export interface Finding {
  id: number;
  platform: string;
  program: string;
  severity: Severity;
  rule: string;
  message: string;
}

const RANGES = [
  ["Reg Buka", "regBuka", "Reg Tutup", "regTutup"],
  ["T1 Mulai", "t1Mulai", "T1 Akhir", "t1Akhir"],
  ["T2 Mulai", "t2Mulai", "T2 Akhir", "t2Akhir"],
] as const;

const STAGES = [
  ["Tahap 1", "tahap1", "T1 Mulai", "t1Mulai", "Pengumuman T1", "pengT1"],
  ["Tahap 2", "tahap2", "T2 Mulai", "t2Mulai", "Pengumuman T2", "pengT2"],
] as const;

const ALL_DATES = [
  "regBuka", "regTutup", "t1Mulai", "t1Akhir", "pengT1",
  "t2Mulai", "t2Akhir", "pengT2", "pengAkhir",
] as const;

export function validateRows(rows: Entry[], today: Date): Finding[] {
  const out: Finding[] = [];
  const seenId = new Map<number, number>();
  const seenKey = new Map<string, number>();

  const add = (it: Entry, severity: Severity, rule: string, message: string) =>
    out.push({ id: it.id, platform: it.platform, program: it.program, severity, rule, message });

  for (const it of rows) {
    // --- identitas ---
    if (!it.platform.trim()) {
      add(it, "error", "tanpa-platform", "Kolom Platform kosong, baris ini tidak bisa diberi warna atau dikelompokkan.");
    }
    seenId.set(it.id, (seenId.get(it.id) ?? 0) + 1);
    const key = `${it.platform.trim().toLowerCase()}|${it.program.trim().toLowerCase()}`;
    seenKey.set(key, (seenKey.get(key) ?? 0) + 1);

    // --- rentang terbalik ---
    for (const [aLabel, aField, bLabel, bField] of RANGES) {
      const a = pd(it[aField]);
      const b = pd(it[bField]);
      if (a && b && b < a) {
        add(
          it,
          "error",
          "rentang-terbalik",
          `${bLabel} (${fmt(it[bField])}) lebih awal dari ${aLabel} (${fmt(it[aField])}).`,
        );
      }
    }

    // --- tahap dan tanggalnya ---
    for (const [namaLabel, namaField, mulaiLabel, mulaiField, pengLabel, pengField] of STAGES) {
      const nama = it[namaField].trim();
      const mulai = pd(it[mulaiField]);
      const peng = pd(it[pengField]);

      if (nama && !mulai) {
        add(it, "warning", "tahap-tanpa-tanggal", `${namaLabel} terisi "${nama}" tapi ${mulaiLabel} kosong.`);
      }
      if (!nama && mulai) {
        add(it, "warning", "tanggal-tanpa-tahap", `${mulaiLabel} terisi tapi ${namaLabel} kosong, kartunya jadi tanpa judul tahap.`);
      }
      if (peng && mulai && peng < mulai) {
        add(
          it,
          "error",
          "pengumuman-mendahului",
          `${pengLabel} (${fmt(it[pengField])}) jatuh sebelum ${mulaiLabel} (${fmt(it[mulaiField])}).`,
        );
      }
    }

    // --- tahap 2 tanpa tahap 1 ---
    if ((it.tahap2.trim() || pd(it.t2Mulai)) && !it.tahap1.trim() && !pd(it.t1Mulai)) {
      add(it, "warning", "tahap2-tanpa-tahap1", "Tahap 2 terisi tapi Tahap 1 kosong; urutan tahap jadi janggal.");
    }

    // --- tanggal di luar akal ---
    for (const f of ALL_DATES) {
      const d = pd(it[f]);
      if (!d) continue;
      const years = Math.abs(d.getFullYear() - today.getFullYear());
      if (years > 3) {
        add(it, "warning", "tahun-janggal", `Kolom ${f} bertahun ${d.getFullYear()}, terpaut ${years} tahun dari sekarang — mungkin salah ketik.`);
      }
    }

    // --- kolom status tanggal ---
    for (const [field, label] of [
      ["sReg", "Status Reg"],
      ["sTes", "Status Tes"],
      ["sPeng", "Status Pengumuman"],
    ] as const) {
      if (isUnknownStatus(it[field])) {
        add(
          it,
          "warning",
          "status-tak-dikenal",
          `${label} berisi "${it[field]}" yang tidak dikenali, jadi diabaikan dan tanggalnya ikut kolom Tipe. Nilai yang diterima: ${DATE_STATUSES.join(", ")}.`,
        );
      }
    }

    // --- sama sekali tanpa tanggal ---
    if (!ALL_DATES.some((f) => pd(it[f]))) {
      add(it, "warning", "tanpa-tanggal", "Tidak ada satu pun tanggal terisi; baris ini tidak muncul di rel, agenda, maupun hitung mundur.");
    }
  }

  // --- kembar, diperiksa setelah semua baris terbaca ---
  for (const it of rows) {
    if ((seenId.get(it.id) ?? 0) > 1) {
      add(it, "error", "id-kembar", `ID ${it.id} dipakai ${seenId.get(it.id)} baris. ID harus unik.`);
      seenId.set(it.id, 0);
    }
    const key = `${it.platform.trim().toLowerCase()}|${it.program.trim().toLowerCase()}`;
    if ((seenKey.get(key) ?? 0) > 1) {
      add(it, "warning", "baris-kembar", `Kombinasi Platform + Program ini muncul ${seenKey.get(key)} kali.`);
      seenKey.set(key, 0);
    }
  }

  return out.sort((a, b) => (a.severity === b.severity ? a.id - b.id : a.severity === "error" ? -1 : 1));
}

export function countBySeverity(findings: Finding[]) {
  return {
    error: findings.filter((f) => f.severity === "error").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    rows: new Set(findings.map((f) => f.id)).size,
  };
}
