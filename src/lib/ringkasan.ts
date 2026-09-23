import { dateStatusOf } from "./confidence";
import { MOMEN_INFO, type MomenGroup } from "./momen";
import { MONTHS } from "./status";
import { DATE_STATUS_INFO } from "./types";

/**
 * Menyusun ringkasan mingguan sebagai HTML Telegram.
 *
 * Isinya diambil dari buildMomen() yang sama dengan tampilan Momen - dua
 * keluaran itu tidak boleh berselisih, dan satu-satunya jaminan adalah satu
 * sumber hitungan. Modul ini hanya MEMFORMAT; ia tidak mengirim apa pun.
 *
 * Telegram membatasi satu pesan 4096 karakter. Tiap momen dipotong di
 * PER_MOMEN baris, dan sisanya disebut jumlahnya saja - lebih baik pesan yang
 * lengkap strukturnya daripada pesan yang terpotong di tengah.
 */

const PER_MOMEN = 8;
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Telegram HTML hanya mengenal tiga entitas; sisanya harus lolos apa adanya. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tgl = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function formatRingkasan(groups: MomenGroup[], today: Date, siteUrl: string): string {
  const baris: string[] = [
    `<b>Momen pemasaran</b> · ${HARI[today.getDay()]}, ${tgl(today)} ${today.getFullYear()}`,
    "",
  ];

  const terisi = groups.filter((g) => g.items.length > 0);
  if (terisi.length === 0) {
    baris.push("Tidak ada program di momen mana pun minggu ini.");
  }

  for (const g of terisi) {
    const info = MOMEN_INFO[g.key];
    baris.push(`<b>${esc(info.judul)}</b> · ${g.items.length}`);
    for (const m of g.items.slice(0, PER_MOMEN)) {
      // Penanda keyakinan yang sama dengan di halaman: tanggal tebakan tidak
      // boleh tampil seyakin tanggal resmi, apalagi di pesan yang diteruskan.
      const tanda = DATE_STATUS_INFO[dateStatusOf(m.entry, String(m.field))].mark;
      const kapan =
        g.key === "baru"
          ? m.days === 0 ? "hari ini" : `${-m.days} h lalu`
          : m.days === 0 ? "hari ini" : m.days === 1 ? "besok" : `${m.days} h`;
      const nama = esc(m.entry.program || "tanpa nama program");
      const judul = siteUrl ? `<a href="${siteUrl}/?id=${m.entry.id}">${nama}</a>` : nama;
      baris.push(`• <b>${esc(m.entry.platform)}</b> ${judul} — ${m.label} ${tgl(m.date)}${tanda} (${kapan})`);
    }
    if (g.items.length > PER_MOMEN) baris.push(`  <i>+${g.items.length - PER_MOMEN} lainnya</i>`);
    baris.push("");
  }

  const adaTebakan = terisi.some((g) =>
    g.items.some((m) => dateStatusOf(m.entry, String(m.field)) !== "resmi"),
  );
  if (adaTebakan) baris.push("<i>~ = tanggal prediksi, belum dikonfirmasi penyelenggara</i>");
  if (siteUrl) baris.push(`<a href="${siteUrl}/">Buka dashboard</a>`);

  return baris.join("\n").trim();
}
