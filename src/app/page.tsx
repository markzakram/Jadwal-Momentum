import Dashboard from "@/components/Dashboard";
import { getSheetData, todayInJakarta } from "@/lib/sheets";
import { pasangkanArsip } from "@/lib/tahunLalu";
import { SHEETS, type Entry, type SheetKey } from "@/lib/types";

/** Hasil baca sheet di-cache 5 menit; edit di Google Sheets menyusul sendiri. */
export const revalidate = 300;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string; id?: string }>;
}) {
  const sp = await searchParams;
  const sheet: SheetKey = SHEETS.find((s) => s.key === sp.sheet)?.key ?? "DATA";

  // Arsip hanya relevan untuk sheet tahun berjalan. Dibaca bersamaan, bukan
  // berurutan - keduanya melewati cache yang sama, jadi tambahannya nyaris nol.
  const [payload, arsip] = await Promise.all([
    getSheetData(sheet),
    sheet === "DATA" ? getSheetData("Data2025") : Promise.resolve(null),
  ]);

  // Pasangan dihitung di server supaya kode pencocokannya tidak ikut ke bundel
  // browser. Arsip dari data CADANGAN diabaikan: membandingkan prediksi dengan
  // arsip yang tidak terbaca sama saja mengarang bukti.
  const pembanding: Record<number, Entry> =
    arsip && arsip.source === "sheet" ? Object.fromEntries(pasangkanArsip(payload.rows, arsip.rows)) : {};

  const focusId = Number(sp.id) || null;

  return (
    <Dashboard
      payload={payload}
      sheet={sheet}
      serverToday={todayInJakarta()}
      pembanding={pembanding}
      focusId={focusId}
    />
  );
}
