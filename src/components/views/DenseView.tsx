"use client";

import DateText from "../DateText";
import Icon from "../Icon";
import PlatformMark from "../PlatformMark";
import TipeTag from "../TipeTag";
import { STATUS_BADGE, STATUS_ICON } from "@/lib/palette";
import { daysBetween, nextEvent, statusOf, toIso } from "@/lib/status";
import type { Entry } from "@/lib/types";

/**
 * Daftar padat. Dulu tampilan ini juga memuat "rel 37 hari" di atas tabelnya —
 * sebuah Gantt mini berskala persen yang hanya memuat sembilan baris teratas.
 * Rel itu dipindahkan dan digantikan tampilan Lini Masa tersendiri, yang bisa
 * memuat seluruh baris dengan skala hari yang sebenarnya.
 */
export default function DenseView({
  rows,
  today,
  crunch,
  showTipe = false,
}: {
  rows: Entry[];
  today: Date;
  /** baris yang tesnya jatuh di periode menumpuk — ditandai agar terlihat saat memindai */
  crunch?: Set<number>;
  /** kolom Tipe hanya muncul di tab "Semua"; di tab lain ia mengulang judul tab */
  showTipe?: boolean;
}) {
  return (
    <section className={`dense${showTipe ? " has-tipe" : ""}`}>
      <div className="dense-head">
        <span>PLATFORM</span>
        {showTipe && <span>TIPE</span>}
        <span>PROGRAM</span>
        <span>STATUS</span>
        <span className="dense-tutup">REG TUTUP</span>
        <span>YANG DIHITUNG</span>
        <span style={{ textAlign: "right" }}>SISA</span>
      </div>
      {rows.map((it) => {
        const s = statusOf(it, today);
        const ev = nextEvent(it, s);
        const sisa = ev.date ? daysBetween(today, ev.date) : null;
        const urgent = sisa !== null && sisa <= 7;
        return (
          <div className="dense-row" key={it.id}>
            <span className="dense-plat" title={it.platform}>
              <PlatformMark platform={it.platform} size={13} />
              {it.platform}
            </span>
            {showTipe && (
              <span className="dense-tipe">
                <TipeTag tipe={it.tipe} />
              </span>
            )}
            <span className="dense-prog" title={it.program}>
              {crunch?.has(it.id) && (
                <span className="crunch-mark">
                  <Icon name="layers" size={12} label="Tesnya jatuh di periode yang menumpuk" />
                </span>
              )}
              {it.linkWeb ? (
                <a href={it.linkWeb} target="_blank" rel="noopener noreferrer">{it.program || "—"}</a>
              ) : (
                it.program || "—"
              )}
            </span>
            <span className={`badge ${STATUS_BADGE[s]}`}>
              <Icon name={STATUS_ICON[s]} size={13} />
              {s}
            </span>
            <span className="dense-cell dense-tutup">
              <DateText it={it} field="regTutup" short />
            </span>
            {/* nama tahap boleh terpotong, tanggalnya tidak - itu bagian yang dicari */}
            <span className="dense-cell dense-next" title={ev.what}>
              <span className="dn-what">{ev.what}</span>
              {ev.field && ev.date && (
                <span className="dn-when">
                  <DateText it={it} field={ev.field} short value={toIso(ev.date)} />
                </span>
              )}
            </span>
            <span className="dense-sisa" style={{ color: sisa === null ? "var(--dim)" : urgent ? "var(--warn)" : "var(--muted)" }}>
              {sisa === null ? "—" : sisa === 0 ? "hari ini" : sisa < 0 ? `${-sisa} h lalu` : `${sisa} h`}
            </span>
          </div>
        );
      })}
    </section>
  );
}
