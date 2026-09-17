"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import DateText from "../DateText";
import Icon from "../Icon";
import TipeTag from "../TipeTag";
import { STATUS_BADGE, STATUS_ICON, countdownTone, platformColor } from "@/lib/palette";
import { countdown, statusOf } from "@/lib/status";
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

function Field({ label, tone, children }: { label: string; tone?: string; children: ReactNode }) {
  return (
    <div className="rc-f">
      <div className="rc-k" style={tone ? { color: tone } : undefined}>
        {label}
      </div>
      <div className="rc-v">{children}</div>
    </div>
  );
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
}: {
  rows: Entry[];
  today: Date;
  /** baris yang tesnya jatuh di periode menumpuk */
  crunch?: Set<number>;
  showTipe?: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());

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

        return (
          <article
            className="rcard"
            key={it.id}
            style={{ "--acc": platformColor(it.platform) } as CSSProperties}
          >
            <div className="rc-top">
              <span className="rc-plat">
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
              <Field label="Reg Buka">
                <DateText it={it} field="regBuka" />
              </Field>
              <Field label="Reg Tutup">
                <DateText it={it} field="regTutup" />
              </Field>

              {t1 && (
                <Field label={it.tahap1 || "Tahap 1"}>
                  <Range it={it} a="t1Mulai" b="t1Akhir" />
                </Field>
              )}
              {t2 && (
                <Field label={it.tahap2 || "Tahap 2"}>
                  <Range it={it} a="t2Mulai" b="t2Akhir" />
                </Field>
              )}

              {it.pengT1 && (
                <Field label="Peng. Tahap 1">
                  <DateText it={it} field="pengT1" />
                </Field>
              )}
              {it.pengT2 && (
                <Field label="Peng. Tahap 2">
                  <DateText it={it} field="pengT2" />
                </Field>
              )}
              {it.pengAkhir && (
                <Field label="Peng. Akhir" tone="var(--hasil)">
                  <DateText it={it} field="pengAkhir" />
                </Field>
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

            {(it.linkWeb || it.linkEbook) && (
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
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
