"use client";

import { useState } from "react";
import DateText from "../DateText";
import Icon, { type IconName } from "../Icon";
import PlatformMark from "../PlatformMark";
import TipeTag from "../TipeTag";
import { MOMEN_INFO, buildMomen, type MomenItem, type MomenKey } from "@/lib/momen";
import { fmt, toIso } from "@/lib/status";
import type { Entry } from "@/lib/types";

/**
 * Momen pemasaran - jadwal yang sama, dibaca dari sisi "minggu ini kita
 * mendorong apa".
 *
 * Dua momen persiapan ditaruh paling atas dan paling lebar: di situlah orang
 * sudah terdaftar dan WAJIB bersiap, sehingga materi persiapan paling mungkin
 * dibeli. Tiga momen pendaftaran di bawahnya lebih sempit karena daftarnya
 * memang pendek - jendelanya cuma satu-dua minggu.
 */

const IKON: Record<MomenKey, IconName> = {
  persiapan: "target",
  antar: "stairs",
  tutup: "hourglass",
  baru: "megaphone",
  segera: "calendarPlus",
};

/** Sama dengan Papan Status - kolom yang menjulang membuat grid timpang. */
const PER_GROUP = 6;

function kapan(it: MomenItem, key: MomenKey): string {
  if (key === "baru") return it.days === 0 ? "hari ini" : `${-it.days} h lalu`;
  if (it.days === 0) return "hari ini";
  if (it.days === 1) return "besok";
  return `${it.days} h`;
}

export default function MomenView({
  rows,
  today,
  showTipe = false,
}: {
  rows: Entry[];
  today: Date;
  showTipe?: boolean;
}) {
  const [terbuka, setTerbuka] = useState<ReadonlySet<MomenKey>>(() => new Set());
  const { groups, lainnya } = buildMomen(rows, today);

  function alih(k: MomenKey) {
    setTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="momen">
      <div className="momen-top">
        <h3>Momen pemasaran</h3>
        <span className="mono">per {fmt(toIso(today))}</span>
        <p>
          {total} program sedang berada di salah satu momen di bawah
          {lainnya > 0 && ` · ${lainnya} lainnya belum atau sudah lewat`}
        </p>
      </div>

      <div className="momen-grid">
        {groups.map((g) => {
          const info = MOMEN_INFO[g.key];
          const prep = g.key === "persiapan" || g.key === "antar";
          const buka = terbuka.has(g.key);
          const tampil = buka ? g.items : g.items.slice(0, PER_GROUP);
          const sisa = g.items.length - tampil.length;
          return (
            <div
              key={g.key}
              className={`mgroup${prep ? " prep" : ""}${g.items.length === 0 ? " kosong" : ""}`}
            >
              <div className="mgroup-head">
                <span className="mgroup-ico">
                  <Icon name={IKON[g.key]} size={16} />
                </span>
                <b>{info.judul}</b>
                <em>{g.items.length}</em>
              </div>
              <p className="mgroup-arahan">{info.arahan}</p>

              {g.items.length === 0 ? (
                <div className="mgroup-empty">Tidak ada minggu ini.</div>
              ) : (
                <ul className="mlist">
                  {tampil.map((m) => (
                    <li className="mitem" key={m.entry.id}>
                      <div className="mitem-top">
                        <PlatformMark platform={m.entry.platform} size={12} />
                        <span className="mitem-plat">{m.entry.platform}</span>
                        {showTipe && <TipeTag tipe={m.entry.tipe} />}
                        <span className={`mitem-days${m.days >= 0 && m.days <= 3 && g.key !== "baru" ? " dekat" : ""}`}>
                          {kapan(m, g.key)}
                        </span>
                      </div>
                      {/* Program kosong tidak diganti nama platform - nama itu sudah
                          tampil tepat di atasnya, dan mengulangnya menyamarkan bahwa
                          barisnya memang belum bernama. */}
                      <div className={`mitem-prog${m.entry.program ? "" : " tanpa"}`}>
                        {!m.entry.program ? (
                          "Tanpa nama program"
                        ) : m.entry.linkWeb ? (
                          <a href={m.entry.linkWeb} target="_blank" rel="noopener noreferrer">
                            {m.entry.program}
                          </a>
                        ) : (
                          m.entry.program
                        )}
                      </div>
                      <div className="mitem-bawah">
                        <span className="mitem-when">
                          {m.label} <DateText it={m.entry} field={String(m.field)} short value={toIso(m.date)} />
                        </span>
                        {/* Materi yang didorong di momen ini - ditaruh di tempat yang
                            langsung terjangkau, bukan tersembunyi di tampilan lain. */}
                        {m.entry.linkEbook && (
                          <a className="mitem-ebook" href={m.entry.linkEbook} target="_blank" rel="noopener noreferrer">
                            <Icon name="book" size={12} />
                            Ebook
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {(sisa > 0 || (buka && g.items.length > PER_GROUP)) && (
                <button type="button" className="mgroup-more" onClick={() => alih(g.key)}>
                  {buka ? "Ringkas" : `+ ${sisa} lainnya`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
