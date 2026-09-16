import { buildIcs, entriesToEvents } from "@/lib/ics";
import { getSheetData } from "@/lib/sheets";
import { SHEETS, type SheetKey, type Tipe } from "@/lib/types";

/** Ikut irama baca sheet; Google Calendar sendiri menyegarkan jauh lebih jarang. */
export const revalidate = 300;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const sheet: SheetKey = SHEETS.find((s) => s.key === params.get("sheet"))?.key ?? "DATA";
  const tipe = params.get("tipe");
  const platform = params.get("platform");

  const payload = await getSheetData(sheet);

  let rows = payload.rows;
  if (tipe === "Real" || tipe === "Prediksi") rows = rows.filter((r) => r.tipe === (tipe as Tipe));
  if (platform) rows = rows.filter((r) => r.platform.toLowerCase() === platform.toLowerCase());

  const parts = ["Jadwal Seleksi", SHEETS.find((s) => s.key === sheet)?.label ?? sheet];
  if (tipe === "Real" || tipe === "Prediksi") parts.push(tipe);
  if (platform) parts.push(platform);

  const body = buildIcs(entriesToEvents(rows, sheet), { name: parts.join(" · "), now: new Date() });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="jadwal-seleksi.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "X-Rows": String(rows.length),
      "X-Source": payload.source,
    },
  });
}
