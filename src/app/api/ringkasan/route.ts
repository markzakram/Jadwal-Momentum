import { buildMomen } from "@/lib/momen";
import { formatRingkasan } from "@/lib/ringkasan";
import { getSheetData, todayInJakarta } from "@/lib/sheets";
import { pd } from "@/lib/status";

/**
 * Ringkasan mingguan ke grup Telegram.
 *
 *   GET /api/ringkasan?preview=1   tampilkan isinya saja, TIDAK mengirim apa pun
 *   GET /api/ringkasan             kirim - hanya dengan CRON_SECRET yang cocok
 *
 * Dipanggil Vercel Cron tiap Senin pagi (lihat vercel.json). Vercel melampirkan
 * `Authorization: Bearer <CRON_SECRET>` pada panggilan cron-nya sendiri, jadi
 * rahasia itu tidak pernah perlu ditulis di mana pun selain pengaturan project.
 *
 * GAGAL AMAN: kalau CRON_SECRET belum diset, pengiriman DITOLAK - bukan
 * dibiarkan terbuka. Tanpa itu siapa pun yang tahu alamat ini bisa membanjiri
 * grup timmu dengan pesan. Pratinjau tetap terbuka karena isinya sama persis
 * dengan halaman dashboard yang memang publik.
 */

export const dynamic = "force-dynamic";

function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  // Disediakan Vercel sendiri, tanpa skema.
  const v = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return v ? `https://${v}` : "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.has("preview");

  const payload = await getSheetData("DATA");
  const today = pd(todayInJakarta()) ?? new Date();
  const { groups } = buildMomen(payload.rows, today);
  const teks = formatRingkasan(groups, today, siteUrl());

  if (preview) {
    return new Response(teks, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-sumber-data": payload.source,
        "x-panjang": String(teks.length),
      },
    });
  }

  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    return Response.json(
      { ok: false, alasan: "CRON_SECRET belum diset - pengiriman ditolak supaya alamat ini tidak bisa dipakai membanjiri grup." },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return Response.json({ ok: false, alasan: "tidak berwenang" }, { status: 401 });
  }

  // Data cadangan berarti sheet gagal dibaca. Jangan kirim jadwal basi ke tim
  // seolah-olah itu jadwal minggu ini.
  if (payload.source !== "sheet") {
    return Response.json({ ok: false, alasan: `sheet tidak terbaca: ${payload.warning ?? "?"}` }, { status: 502 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    return Response.json({ ok: false, alasan: "TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset" }, { status: 503 });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: teks, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const hasil = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };

  if (!res.ok || !hasil.ok) {
    return Response.json({ ok: false, alasan: `Telegram menolak: ${hasil.description ?? res.status}` }, { status: 502 });
  }
  return Response.json({ ok: true, panjang: teks.length });
}
