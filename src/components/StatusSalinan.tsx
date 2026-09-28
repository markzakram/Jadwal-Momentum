"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/**
 * Pita peringatan saat jadwal yang tampil bukan data terbaru.
 *
 * Pasangan wajib dari sw.js: service worker boleh menyajikan salinan halaman
 * HANYA karena pita ini memberi tahu bahwa itu salinan, lengkap dengan kapan
 * datanya diambil. Tanpa pita ini, salinan akan tampil seolah jadwal terbaru.
 *
 * Pendeteksinya UMUR DATA, bukan navigator.onLine saja. Sinyal itu bisa
 * berkata "online" padahal server tak terjangkau - Wi-Fi hotel dengan portal
 * login, misalnya - dan saat itulah service worker diam-diam menyajikan
 * salinan. `fetchedAt` dibuat saat server merender halaman, jadi halaman baru
 * selalu berumur beberapa detik; yang berumur lebih dari BATAS saat dibuka
 * pasti datang dari salinan.
 */

const BATAS_MENIT = 10;

function umur(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} menit lalu`;
  const j = Math.round(m / 60);
  if (j < 24) return `${j} jam lalu`;
  return `${Math.round(j / 24)} hari lalu`;
}

export default function StatusSalinan({ fetchedAt }: { fetchedAt: string }) {
  // null sampai terpasang di browser: server tidak tahu apa pun soal koneksi
  // pembaca, dan menebaknya akan membuat markup server dan browser berbeda.
  const [daring, setDaring] = useState<boolean | null>(null);
  const [usang, setUsang] = useState<number | null>(null);

  useEffect(() => {
    setDaring(navigator.onLine);
    const on = () => setDaring(true);
    const off = () => setDaring(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Dihitung ulang setiap `fetchedAt` berganti - yaitu setiap kali data baru
  // tiba lewat penyegaran, sehingga pitanya hilang sendiri begitu data segar.
  useEffect(() => {
    const t = Date.parse(fetchedAt);
    const u = Number.isNaN(t) ? 0 : Date.now() - t;
    setUsang(u > BATAS_MENIT * 60_000 ? u : null);
  }, [fetchedAt]);

  if (daring === null) return null;
  if (daring && usang === null) return null;

  const waktu = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fetchedAt));

  return (
    <div className={`salinan${daring ? "" : " luring"}`} role="status">
      <div className="wrap salinan-isi">
        <span className="salinan-ikon">
          <Icon name="wifiOff" size={16} />
        </span>
        <div className="salinan-teks">
          {!daring ? (
            <>
              <b>Tanpa koneksi.</b> Menampilkan data per {waktu}
              {usang !== null && ` (${umur(usang)})`}. Tanggal di sheet mungkin sudah berubah sejak itu; status dan
              hitung mundur tetap dihitung terhadap hari ini.
            </>
          ) : (
            <>
              <b>Ini salinan tersimpan</b> per {waktu} ({umur(usang!)}) — server tidak terjangkau saat halaman dibuka.
            </>
          )}
        </div>
        {daring && (
          <button type="button" className="btn-mini" onClick={() => location.reload()}>
            Muat ulang
          </button>
        )}
      </div>
    </div>
  );
}
