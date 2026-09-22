# -*- coding: utf-8 -*-
"""
Ikon PWA, dibuat dari logo Product Momentum.

Sumbernya logo/logo product momentum.png (kubus saja, tanpa teks). Berkas itu
transparan dan isinya tidak memenuhi kanvas, jadi di sini ia dipangkas ke kotak
isinya dulu - kalau tidak, logonya tampil kekecilan dengan bingkai kosong di
sekelilingnya pada setiap ikon.

Latar putih dipasang dengan sengaja, bukan dibiarkan transparan: iOS TIDAK
menambahkan latar pada apple-touch-icon, jadi PNG transparan berubah jadi logo
merah di atas kotak HITAM di layar utama.

    python scripts/buat-ikon.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parent.parent
SUMBER = AKAR / "logo" / "logo product momentum.png"
KELUAR = AKAR / "public" / "logo"
LATAR = (255, 255, 255)
SKALA = 3          # digambar besar lalu dikecilkan = tepi halus


def logo_terpangkas() -> Image.Image:
    im = Image.open(SUMBER).convert("RGBA")
    kotak = im.getbbox()
    if kotak:
        im = im.crop(kotak)
    # Dijadikan bujur sangkar supaya proporsinya tidak berubah saat diskalakan.
    sisi = max(im.size)
    kanvas = Image.new("RGBA", (sisi, sisi), (0, 0, 0, 0))
    kanvas.paste(im, ((sisi - im.width) // 2, (sisi - im.height) // 2), im)
    return kanvas


def ikon(logo: Image.Image, sisi: int, radius_rel: float, isi_rel: float) -> Image.Image:
    """Satu ikon persegi.

    radius_rel  kelengkungan sudut; 0 = kotak (iOS melengkungkan sendiri)
    isi_rel     besar logo terhadap kanvas. Versi maskable harus kecil karena
                Android memangkasnya jadi lingkaran - apa pun di luar 80% tengah
                bisa terpotong.
    """
    s = sisi * SKALA
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    topeng = Image.new("L", (s, s), 0)
    ImageDraw.Draw(topeng).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_rel), fill=255)
    img.paste(Image.new("RGBA", (s, s), (*LATAR, 255)), (0, 0), topeng)

    besar = int(s * isi_rel)
    kecil = logo.resize((besar, besar), Image.LANCZOS)
    img.paste(kecil, ((s - besar) // 2, (s - besar) // 2), kecil)

    return img.resize((sisi, sisi), Image.LANCZOS)


def main() -> None:
    if not SUMBER.exists():
        raise SystemExit(f"Logo tidak ditemukan: {SUMBER}")
    logo = logo_terpangkas()
    KELUAR.mkdir(parents=True, exist_ok=True)

    berkas = [
        # nama,                    sisi, radius, isi
        ("icon-32.png",              32,   0.22, 0.86),   # favicon: sekecil ini, isi hampir penuh
        ("icon-192.png",            192,   0.22, 0.76),
        ("icon-512.png",            512,   0.22, 0.76),
        ("apple-touch-icon.png",    180,   0.00, 0.76),   # iOS melengkungkan sendiri
        ("icon-maskable-512.png",   512,   0.00, 0.52),   # dipangkas jadi lingkaran
        ("mark-64.png",              64,   0.22, 0.80),   # penanda kecil di kepala halaman
    ]
    for nama, sisi, radius, isi in berkas:
        ikon(logo, sisi, radius, isi).save(KELUAR / nama, "PNG", optimize=True)
        print(f"  {nama:26} {sisi}x{sisi}  {(KELUAR / nama).stat().st_size:>6} bita")
    print(f"\n{len(berkas)} ikon ditulis ke {KELUAR}")


if __name__ == "__main__":
    main()
