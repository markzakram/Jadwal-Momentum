import type { Tipe } from "@/lib/types";

/**
 * Penanda Real / Prediksi, dipakai hanya saat tab "Semua" — di tab Real atau
 * Prediksi ia cuma mengulang judul tabnya.
 *
 * Bingkainya utuh untuk Real dan putus-putus untuk Prediksi, mengikuti bahasa
 * yang sudah dipakai tanggal perkiraan. Jadi tidak ada kode warna baru yang
 * harus dihafal: garis putus-putus selalu berarti "belum pasti".
 */
export default function TipeTag({ tipe }: { tipe: Tipe }) {
  return (
    <span className={`tipe-tag ${tipe === "Real" ? "real" : "prediksi"}`} title={
      tipe === "Real"
        ? "Jadwal berjalan — batch sudah terkonfirmasi"
        : "Jadwal prediksi — batch belum terkonfirmasi, tanggalnya bisa bergeser"
    }>
      {tipe}
    </span>
  );
}
