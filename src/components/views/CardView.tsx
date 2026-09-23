"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import DateText from "../DateText";
import Icon from "../Icon";
import PlatformMark from "../PlatformMark";
import TipeTag from "../TipeTag";
import { STATUS_BADGE, STATUS_ICON, countdownTone, platformColor } from "@/lib/palette";
import { dateStatusOf } from "@/lib/confidence";
import { MONTHS, countdown, pd, statusOf } from "@/lib/status";
import type { Entry } from "@/lib/types";

/**
 * Kartu rincian — seluruh isi satu baris sheet dalam satu tempat, termasuk
 * catatan yang tidak muat di tampilan mana pun yang lain.
 *
 * Bentuknya meneruskan kartu di dashboard Apps Script, dengan tiga perbaikan:
 *   - tanggal yang tidak terbaca dulu tampil "NaN undefined NaN"; di sini ia
 *     menjadi "—", dan tanggal yang belum resmi membawa penanda keyakinannya;
 *   - kolom yang memang kosong dibuang, bukan ditampilkan sebagai baris hampa;
 *   - ikon digambar sebagai SVG, bukan emoji yang berbeda bentuk antar perangkat.
 */

const NOTE_CLAMP = 190;

function Field({
  label,
  tone,
  arsip,
  children,
}: {
  label: string;
  tone?: string;
  /** tanggal yang sama dari arsip tahun lalu, sudah diformat */
  arsip?: string;
  children: ReactNode;
}) {
  return (
    <div className="rc-f">
      <div className="rc-k" style={tone ? { color: tone } : undefined}>
        {label}
      </div>
      <div className="rc-v">{children}</div>
      {arsip && <div className="rc-arsip">{arsip}</div>}
    </div>
  );
}

/** "2025: 21 Nov" atau "2025: 21 – 27 Nov" - tahunnya selalu tertulis. */
function tglArsip(a: string, b?: string): string | undefined {
  const da = pd(a);
  if (!da) return undefined;
  const db = b ? pd(b) : null;
  const f = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (!db || db.getTime() === da.getTime()) return `${da.getFullYear()}: ${f(da)}`;
  return `${da.getFullYear()}: ${f(da)} – ${f(db)}`;
}

/** Satu rentang tanggal. Ujung yang kosong tidak dikarang - ia jadi tanggal tunggal. */
function Range({ it, a, b }: { it: Entry; a: keyof Entry; b: keyof Entry }) {
  const va = String(it[a] ?? "");
  const vb = String(it[b] ?? "");
  if (!va && !vb) return <>—</>;
  if (!va) return <DateText it={it} field={String(b)} short />;
  if (!vb || vb === va) return <DateText it={it} field={String(a)} short />;
  return (
    <>
      <DateText it={it} field={String(a)} short />
      {" – "}
      <DateText it={it} field={String(b)} short />
    </>
  );
}

export default function CardView({
  rows,
  today,
  crunch,
  showTipe = false,
  pembanding = {},
  focusId = null,
}: {
  rows: Entry[];
  today: Date;
  /** baris yang tesnya jatuh di periode menumpuk */
  crunch?: Set<number>;
  showTipe?: boolean;
  pembanding?: Record<number, Entry>;
  focusId?: number | null;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const [disalin, setDisalin] = useState<number | null>(null);

  // Tautan ?id= berakhir di sini. `block: "center"`, bukan "start": kepala
  // halaman menempel di atas dan akan menutupi kartu yang baru saja dituju.
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`p-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId]);

  /**
   * Hanya ?sheet= yang dipertahankan dari alamat sekarang. Kata kunci pencarian
   * atau tab yang sedang aktif tidak ikut - penerima tautan harus melihat
   * program itu, bukan tampilan pribadi pengirimnya.
   */
  async function salinTautan(id: number) {
    const u = new URL(window.location.href);
    const sheet = u.searchParams.get("sheet");
    u.search = "";
    u.hash = "";
    if (sheet) u.searchParams.set("sheet", sheet);
    u.searchParams.set("id", String(id));
    try {
      await navigator.clipboard.writeText(u.toString());
      setDisalin(id);
      setTimeout(() => setDisalin((v) => (v === id ? null : v)), 2000);
    } catch {
      window.prompt("Salin tautan program ini:", u.toString());
    }
  }

  function toggleNote(id: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rcards">
      {rows.map((it) => {
        const s = statusOf(it, today);
        const cd = countdown(it, s, today);
        // Tiap kolom berdiri sendiri: "Tahap 2 —" pada program yang memang cuma
        // satu tahap bukan informasi, ia malah menyiratkan ada tahap kedua yang
        // tanggalnya belum diketahui.
        const t1 = it.tahap1 || it.t1Mulai || it.t1Akhir;
        const t2 = it.tahap2 || it.t2Mulai || it.t2Akhir;
        const longNote = it.catatan.length > NOTE_CLAMP;
        const noteOpen = open.has(it.id);

        /*
         * Arsip hanya ditampilkan di samping tanggal yang BELUM resmi. Tanggal
         * resmi tidak butuh pembanding; tanggal tebakan justru butuh - dan
         * pembanding itulah yang dulu dikutip manual di kartu SEL.
         */
        const lalu = pembanding[it.id];
        const bukti = (a: keyof Entry, b?: keyof Entry, tahap?: "tahap1" | "tahap2"): string | undefined => {
          if (!lalu || dateStatusOf(it, String(a)) === "resmi") return undefined;
          const t = tglArsip(String(lalu[a] ?? ""), b ? String(lalu[b] ?? "") : undefined);
          if (!t || !tahap) return t;
          // Tahap dibandingkan menurut POSISI (tahap 1 dengan tahap 1), dan posisi
          // tidak menjamin tahapnya sama: tahap 1 PCAM 10 adalah "PU & TKD", tahap 1
          // PCAM 9 adalah "Seleksi Administrasi". Tanpa nama tahap arsipnya, "2025:
          // 28 Nov" terbaca seolah tes PU & TKD tahun lalu jatuh tanggal itu.
          const namaLalu = String(lalu[tahap] ?? "").trim();
          const namaKini = String(it[tahap] ?? "").trim();
          return namaLalu && namaLalu.toLowerCase() !== namaKini.toLowerCase() ? `${t} · ${namaLalu}` : t;
        };
        const buktiApapun = !!lalu && (["regBuka", "regTutup", "t1Mulai", "t2Mulai", "pengT1", "pengT2", "pengAkhir"] as const)
          .some((f) => bukti(f));

        return (
          <article
            className={`rcard${focusId === it.id ? " fokus" : ""}`}
            id={`p-${it.id}`}
            key={it.id}
            style={{ "--acc": platformColor(it.platform) } as CSSProperties}
          >
            <div className="rc-top">
              <span className="rc-plat">
                <PlatformMark platform={it.platform} size={13} />
                {it.linkWeb ? (
                  <a href={it.linkWeb} target="_blank" rel="noopener noreferrer">
                    {it.platform}
                    <Icon name="external" size={11} />
                  </a>
                ) : (
                  it.platform
                )}
              </span>
              {showTipe && <TipeTag tipe={it.tipe} />}
              <span className={`badge pill ${STATUS_BADGE[s]}`}>
                <Icon name={STATUS_ICON[s]} size={13} />
                {s}
              </span>
            </div>

            <h3 className="rc-prog">{it.program || "—"}</h3>

            <div className="rc-chips">
              {cd && (
                <span className="rc-cd" style={countdownTone(s)}>
                  <Icon name="clock" size={12} />
                  {cd}
                </span>
              )}
              {crunch?.has(it.id) && (
                <span className="rc-crunch" title="Tesnya jatuh di periode yang menumpuk dengan seleksi lain">
                  <Icon name="layers" size={12} />
                  Periode menumpuk
                </span>
              )}
            </div>

            <div className="rc-meta">
              <Field label="Reg Buka" arsip={bukti("regBuka")}>
                <DateText it={it} field="regBuka" />
              </Field>
              <Field label="Reg Tutup" arsip={bukti("regTutup")}>
                <DateText it={it} field="regTutup" />
              </Field>

              {t1 && (
                <Field label={it.tahap1 || "Tahap 1"} arsip={bukti("t1Mulai", "t1Akhir", "tahap1")}>
                  <Range it={it} a="t1Mulai" b="t1Akhir" />
                </Field>
              )}
              {t2 && (
                <Field label={it.tahap2 || "Tahap 2"} arsip={bukti("t2Mulai", "t2Akhir", "tahap2")}>
                  <Range it={it} a="t2Mulai" b="t2Akhir" />
                </Field>
              )}

              {it.pengT1 && (
                <Field label="Peng. Tahap 1" arsip={bukti("pengT1")}>
                  <DateText it={it} field="pengT1" />
                </Field>
              )}
              {it.pengT2 && (
                <Field label="Peng. Tahap 2" arsip={bukti("pengT2")}>
                  <DateText it={it} field="pengT2" />
                </Field>
              )}
              {it.pengAkhir && (
                <Field label="Peng. Akhir" tone="var(--hasil)" arsip={bukti("pengAkhir")}>
                  <DateText it={it} field="pengAkhir" />
                </Field>
              )}

              {/* Nama program arsipnya selalu ditulis - pasangan yang janggal harus
                  kelihatan janggal, bukan tersembunyi di balik angka tanggal. */}
              {buktiApapun && (
                <div className="rc-pembanding">
                  Pembanding: <b>{lalu!.program}</b>
                </div>
              )}
            </div>

            {it.catatan && (
              <div className={`rc-note${longNote && !noteOpen ? " clip" : ""}`}>
                <p>{it.catatan}</p>
                {longNote && (
                  <button type="button" className="rc-more" onClick={() => toggleNote(it.id)}>
                    {noteOpen ? "Ringkas" : "Selengkapnya"}
                  </button>
                )}
              </div>
            )}

            {/* Selalu dirender - tombol salin tautan ada di setiap kartu, termasuk
                yang tidak punya situs resmi maupun ebook. */}
            <div className="rc-links">
                {it.linkWeb && (
                  <a href={it.linkWeb} target="_blank" rel="noopener noreferrer">
                    <Icon name="globe" size={13} />
                    Situs Resmi
                  </a>
                )}
                {it.linkEbook && (
                  <a href={it.linkEbook} target="_blank" rel="noopener noreferrer">
                    <Icon name="book" size={13} />
                    Ebook
                  </a>
                )}
                <button type="button" className="rc-salin" onClick={() => salinTautan(it.id)} title="Salin tautan ke program ini">
                  <Icon name="link" size={13} />
                  {disalin === it.id ? "Tersalin" : "Salin tautan"}
                </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
