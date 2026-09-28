"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * Tombol "Pasang" di kepala halaman.
 *
 * Situs ini sudah memenuhi syarat untuk dipasang sejak 1.0.0 - tapi syarat
 * terpenuhi tidak sama dengan orang tahu. Chrome hanya menaruh ikon kecil di
 * bilah alamat, dan Safari di iPhone tidak menawarkan apa pun sama sekali.
 *
 * Dua jalur:
 *   Chrome/Edge  menangkap `beforeinstallprompt` lalu memunculkan dialog
 *                pemasangan bawaan browser saat tombol ditekan.
 *   iPhone/iPad  tidak punya event itu. Satu-satunya cara lewat tombol Bagikan
 *                Safari, jadi tombolnya membuka petunjuk langkah demi langkah.
 *
 * Tidak tampil sama sekali kalau aplikasinya sudah dipasang dan sedang dibuka
 * dari layar utama.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PasangAplikasi() {
  const [tawaran, setTawaran] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [petunjuk, setPetunjuk] = useState(false);
  const kotak = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sudah dibuka sebagai aplikasi: tidak ada yang perlu ditawarkan.
    const mandiri =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (mandiri) return;

    // iPadOS 13+ mengaku sebagai Mac; yang membedakannya layar sentuh.
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1));

    const ada = (e: Event) => {
      // Tanpa preventDefault Chrome memunculkan spanduknya sendiri di waktu
      // yang dipilihnya - sering di tengah orang sedang membaca jadwal.
      e.preventDefault();
      setTawaran(e as BeforeInstallPromptEvent);
    };
    const terpasang = () => setTawaran(null);
    window.addEventListener("beforeinstallprompt", ada);
    window.addEventListener("appinstalled", terpasang);
    return () => {
      window.removeEventListener("beforeinstallprompt", ada);
      window.removeEventListener("appinstalled", terpasang);
    };
  }, []);

  // Petunjuk iPhone tertutup saat mengetuk di luar kotaknya.
  useEffect(() => {
    if (!petunjuk) return;
    const tutup = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setPetunjuk(false);
    };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, [petunjuk]);

  async function pasang() {
    if (!tawaran) return;
    await tawaran.prompt();
    await tawaran.userChoice;
    // Event ini sekali pakai: ditolak atau diterima, ia tidak bisa dipanggil
    // lagi. Chrome akan mengirim yang baru bila pemasangan kembali mungkin.
    setTawaran(null);
  }

  if (tawaran) {
    return (
      <button type="button" className="icon-btn pasang" onClick={pasang} title="Pasang sebagai aplikasi">
        <Icon name="install" size={16} />
        <span>Pasang</span>
      </button>
    );
  }

  if (!ios) return null;

  return (
    <div className="pasang-ios" ref={kotak}>
      <button
        type="button"
        className="icon-btn pasang"
        onClick={() => setPetunjuk((v) => !v)}
        aria-expanded={petunjuk}
        title="Pasang di layar utama"
      >
        <Icon name="install" size={16} />
        <span>Pasang</span>
      </button>
      {petunjuk && (
        <div className="pasang-petunjuk" role="dialog" aria-label="Cara memasang di iPhone">
          <b>Pasang di iPhone atau iPad</b>
          <ol>
            <li>
              Ketuk ikon <span className="pasang-ikon"><Icon name="share" size={14} /></span> <b>Bagikan</b> di bilah Safari
            </li>
            <li>
              Gulir ke bawah, pilih <b>Tambahkan ke Layar Utama</b>
            </li>
            <li>
              Ketuk <b>Tambah</b>
            </li>
          </ol>
          <p>Setelah itu buka dari ikon di layar utama — tampil penuh, tanpa bilah alamat.</p>
        </div>
      )}
    </div>
  );
}
