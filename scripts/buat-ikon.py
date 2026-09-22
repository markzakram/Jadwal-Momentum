# -*- coding: utf-8 -*-
"""
Ikon PWA dan favicon, dibuat dari logo Product Momentum.

Sumbernya logo/logo product momentum.png (kubus saja, tanpa teks). Berkas itu
transparan dan isinya tidak memenuhi kanvas, jadi di sini ia dipangkas ke kotak
isinya dulu - kalau tidak, logonya tampil kekecilan dengan bingkai kosong di
sekelilingnya pada setiap ikon.

LATAR PUTIH ATAU TRANSPARAN: dua-duanya dipakai, tergantung siapa yang memakan.

  transparan  favicon di bilah tab. Browser menaruhnya langsung di atas warna
              bilahnya sendiri; ubin putih di situ tampak seperti stiker
              tertempel, bukan ikon.

  putih       manifest, maskable, dan apple-touch-icon. iOS TIDAK menambahkan
              latar pada apple-touch-icon - PNG transparan berubah jadi logo
              merah di atas kotak HITAM di layar utama. Maskable wajib memenuhi
              persegi karena Android memangkasnya sendiri.

ProductTrack memakai icon-192 yang transparan sekaligus sebagai apple-touch-icon.
Itu tidak ditiru di sini, justru karena alasan di atas.

    python scripts/buat-ikon.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parent.parent
SUMBER = AKAR / "logo" / "logo product momentum.png"
KELUAR = AKAR / "public" / "logo"
PUTIH = (255, 255, 255)
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


def ikon(logo: Image.Image, sisi: int, radius_rel: float, isi_rel: float, latar) -> Image.Image:
    """Satu ikon persegi.

    radius_rel  kelengkungan sudut; 0 = kotak (iOS melengkungkan sendiri)
    isi_rel     besar logo terhadap kanvas. Versi maskable harus kecil karena
                Android memangkasnya jadi lingkaran - apa pun di luar 80% tengah
                bisa terpotong.
    latar       None = transparan
    """
    s = sisi * SKALA
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    if latar is not None:
        topeng = Image.new("L", (s, s), 0)
        ImageDraw.Draw(topeng).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_rel), fill=255)
        img.paste(Image.new("RGBA", (s, s), (*latar, 255)), (0, 0), topeng)

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
        # nama,                    sisi, radius, isi,  latar
        ("favicon-32.png",           32,   0.00, 1.00, None),   # bilah tab
        ("favicon-192.png",         192,   0.00, 1.00, None),   # bilah tab, layar rapat
        ("icon-192.png",            192,   0.22, 0.76, PUTIH),  # manifest
        ("icon-512.png",            512,   0.22, 0.76, PUTIH),  # manifest
        ("apple-touch-icon.png",    180,   0.00, 0.76, PUTIH),  # iOS melengkungkan sendiri
        ("icon-maskable-512.png",   512,   0.00, 0.52, PUTIH),  # dipangkas jadi lingkaran
        ("mark-64.png",              64,   0.22, 0.80, PUTIH),  # penanda di kepala halaman
    ]
    for nama, sisi, radius, isi, latar in berkas:
        ikon(logo, sisi, radius, isi, latar).save(KELUAR / nama, "PNG", optimize=True)
        jenis = "transparan" if latar is None else "putih"
        print(f"  {nama:26} {sisi:>4}px  {jenis:11} {(KELUAR / nama).stat().st_size:>6} bita")
    print(f"\n{len(berkas)} ikon ditulis ke {KELUAR}")

    lama = KELUAR / "icon-32.png"
    if lama.exists():
        lama.unlink()
        print("icon-32.png lama dihapus - digantikan favicon-32.png")


if __name__ == "__main__":
    main()
