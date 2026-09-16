import Dashboard from "@/components/Dashboard";
import { getSheetData, todayInJakarta } from "@/lib/sheets";
import { SHEETS, type SheetKey } from "@/lib/types";

/** Hasil baca sheet di-cache 5 menit; edit di Google Sheets menyusul sendiri. */
export const revalidate = 300;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string }>;
}) {
  const sp = await searchParams;
  const sheet: SheetKey = SHEETS.find((s) => s.key === sp.sheet)?.key ?? "DATA";
  const payload = await getSheetData(sheet);

  return <Dashboard payload={payload} sheet={sheet} serverToday={todayInJakarta()} />;
}
