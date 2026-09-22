# -*- coding: utf-8 -*-
"""
Ikon PWA sementara, sampai logo aslinya datang.

Digambar, bukan diambil dari berkas, supaya tidak ada aset biner tak berpemilik
di dalam repo. Bentuknya sengaja sama dengan ikon "gantt" di components/Icon.tsx
- tiga batang bertingkat - jadi ikon di layar utama ponsel memakai bahasa visual
yang sama dengan tombol tampilan di dalam aplikasinya.

Menggantinya nanti: timpa saja berkas PNG di public/logo/ dengan ukuran yang
sama. Tidak ada yang perlu diubah di kode.

    python scripts/buat-ikon.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

AKSEN = (16, 185, 129)          # --accent emerald, sama dengan tema bawaan
TINTA = (255, 255, 255)
KELUAR = Path(__file__).resolve().parent.parent / "public" / "logo"
SKALA = 4                        # digambar besar lalu dikecilkan = tepi halus


def gambar(sisi: int, radius_rel: float, isi_rel: float) -> Image.Image:
    """Satu ikon persegi.

    radius_rel  kelengkungan sudut, 0 = kotak, 0.5 = lingkaran
    isi_rel     seberapa besar gambarnya terhadap kanvas. Versi maskable harus
                kecil karena Android memangkasnya jadi lingkaran - apa pun di
                luar 80% tengah bisa terpotong.
    """
    s = sisi * SKALA
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_rel), fill=AKSEN)

    # tiga batang: (mulai, panjang) dalam satuan lebar-isi
    batang = [(0.00, 0.52), (0.28, 0.66), (0.14, 0.44)]
    isi = s * isi_rel
    kiri = (s - isi) / 2
    tebal = isi * 0.155
    jarak = (isi - 3 * tebal) / 2
    atas = (s - (3 * tebal + 2 * jarak)) / 2

    for i, (mulai, panjang) in enumerate(batang):
        x0 = kiri + isi * mulai
        x1 = x0 + isi * panjang
        y0 = atas + i * (tebal + jarak)
        d.rounded_rectangle([x0, y0, x1, y0 + tebal], radius=tebal / 2, fill=TINTA)

    return img.resize((sisi, sisi), Image.LANCZOS)


def main() -> None:
    KELUAR.mkdir(parents=True, exist_ok=True)
    berkas = [
        ("icon-32.png", 32, 0.22, 0.70),
        ("icon-192.png", 192, 0.22, 0.62),
        ("icon-512.png", 512, 0.22, 0.62),
        ("apple-touch-icon.png", 180, 0.0, 0.62),   # iOS melengkungkan sendiri
        ("icon-maskable-512.png", 512, 0.5, 0.46),  # dipangkas jadi lingkaran
    ]
    for nama, sisi, radius, isi in berkas:
        gambar(sisi, radius, isi).save(KELUAR / nama, "PNG", optimize=True)
        print(f"  {nama:26} {sisi}x{sisi}  {(KELUAR / nama).stat().st_size:>6} bita")
    print(f"\n{len(berkas)} ikon ditulis ke {KELUAR}")


if __name__ == "__main__":
    main()
