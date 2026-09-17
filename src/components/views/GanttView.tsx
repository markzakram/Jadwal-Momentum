"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Icon from "../Icon";
import PlatformMark from "../PlatformMark";
import TipeTag from "../TipeTag";
import { ZOOMS, buildGantt, defaultZoom, type GBar, type GMark, type GRow, type ZoomKey } from "@/lib/gantt";
import { platformColor } from "@/lib/palette";
import { MONTHS, fmt, toIso } from "@/lib/status";
import { DATE_STATUS_INFO, type Entry } from "@/lib/types";

/**
 * Gantt. Menggantikan "rel 37 hari" yang dulu menempel di Ruang Kendali.
 *
 * Tiga hal yang membuatnya berbeda dari rel itu:
 *   - skalanya piksel-per-hari, bukan persen, jadi panjang batang berarti sama
 *     di seluruh gambar dan tidak berubah tiap kali penyaring diubah;
 *   - seluruh baris tergambar, dikelompokkan per platform dan bisa dilipat,
 *     bukan sembilan baris teratas;
 *   - rentangnya seluas data - berbulan-bulan - dengan kolom nama yang menempel
 *     saat digulir ke samping dan kepala bulan yang menempel saat digulir ke bawah.
 */

const ROW_H = 26;
const HEAD_H = 30;

interface TipData {
  x: number;
  y: number;
  head: string;
  plat: string;
  what: string;
  when: string;
  extra: string;
  note: string;
}

const d2 = (d: Date) => fmt(toIso(d));

function barTip(row: GRow, b: GBar): Omit<TipData, "x" | "y"> {
  const single = b.days === 1;
  const info = DATE_STATUS_INFO[b.status];
  return {
    head: row.entry.program || row.entry.platform,
    plat: row.entry.platform,
    what: b.label,
    when: single ? d2(b.from) : `${d2(b.from)} – ${d2(b.to)}`,
    extra: single ? "1 hari" : `${b.days} hari`,
    note: b.clamped
      ? "Di sheet tanggal akhir mendahului tanggal mulai — digambar sebagai satu hari."
      : b.status === "resmi"
        ? ""
        : `${info.label} — ${info.hint}`,
  };
}

function markTip(row: GRow, m: GMark): Omit<TipData, "x" | "y"> {
  const info = DATE_STATUS_INFO[m.status];
  return {
    head: row.entry.program || row.entry.platform,
    plat: row.entry.platform,
    what: m.label,
    when: d2(m.date),
    extra: "",
    note: m.status === "resmi" ? "" : `${info.label} — ${info.hint}`,
  };
}

export default function GanttView({
  rows,
  today,
  crunch,
  showTipe = false,
}: {
  rows: Entry[];
  today: Date;
  crunch?: Set<number>;
  showTipe?: boolean;
}) {
  const model = useMemo(() => buildGantt(rows, today), [rows, today]);

  // Zoom awal dihitung dari panjang rentang - nilai yang sama di server dan di
  // browser, jadi tidak ada beda markup saat hidrasi. Pilihan tersimpan baru
  // dibaca setelah mount.
  const [zoom, setZoom] = useState<ZoomKey>(() => defaultZoom(model.totalDays));
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
  const [tip, setTip] = useState<TipData | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const z = localStorage.getItem("gzoom") as ZoomKey | null;
      if (z && ZOOMS.some((x) => x.key === z)) setZoom(z);
    } catch {
      /* mode privat: pilihan tidak tersimpan, tampilan tetap jalan */
    }
  }, []);

  function pickZoom(z: ZoomKey) {
    setZoom(z);
    try {
      localStorage.setItem("gzoom", z);
    } catch {
      /* idem */
    }
  }

  const dayW = ZOOMS.find((z) => z.key === zoom)!.dayW;
  const trackW = Math.max(model.totalDays * dayW, 320);
  const todayIn = model.todayDay >= 0 && model.todayDay <= model.totalDays;

  // Garis minggu baru berguna kalau satu minggu cukup lebar untuk dibedakan.
  const weeks = useMemo(() => {
    if (dayW < 5) return [];
    const out: number[] = [];
    const first = (8 - model.from.getDay()) % 7;
    for (let i = first; i < model.totalDays; i += 7) out.push(i);
    return out;
  }, [model.from, model.totalDays, dayW]);

  // Buka di hari ini, bukan di awal rentang - bagian yang dicari orang ada di
  // sekitar tanggal sekarang, bukan berbulan-bulan sebelumnya.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !todayIn) return;
    const labelW = parseFloat(getComputedStyle(el).getPropertyValue("--glabel")) || 0;
    el.scrollLeft = Math.max(0, labelW + model.todayDay * dayW - el.clientWidth * 0.32);
  }, [dayW, model.todayDay, todayIn]);

  function toggle(platform: string) {
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  // Dijepit di kedua ujung: batang yang sebagian tergulir keluar layar bisa
  // memberi koordinat negatif, dan kotaknya tidak boleh ikut keluar.
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 12), Math.max(12, max));

  function hover(e: MouseEvent, data: Omit<TipData, "x" | "y">) {
    setTip({
      ...data,
      x: clamp(e.clientX + 14, window.innerWidth - 284),
      y: clamp(e.clientY + 18, window.innerHeight - 168),
    });
  }

  const nRows = model.groups.reduce((n, g) => n + g.rows.length, 0);

  if (nRows === 0) {
    return <div className="empty">Tidak ada baris bertanggal untuk digambar.</div>;
  }

  return (
    <section className="gantt" onMouseLeave={() => setTip(null)}>
      <div className="gantt-top">
        <h3>Lini Masa</h3>
        <span className="gantt-range mono">
          {MONTHS[model.months[0].month]} {model.months[0].year} —{" "}
          {MONTHS[model.months[model.months.length - 1].month]} {model.months[model.months.length - 1].year}
        </span>

        <div className="gantt-legend">
          <span><i className="lg reg" />Pendaftaran</span>
          <span><i className="lg tes" />Tes</span>
          <span><i className="lg peng" />Pengumuman</span>
          <span><i className="lg soft" />Belum resmi</span>
          <span><i className="lg now" />Hari ini</span>
        </div>

        <div className="seg gzoom" role="group" aria-label="Kerapatan waktu">
          {ZOOMS.map((z) => (
            <button
              key={z.key}
              type="button"
              className={zoom === z.key ? "on" : undefined}
              onClick={() => pickZoom(z.key)}
              aria-pressed={zoom === z.key}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gantt-scroll" ref={scroller}>
        <div className="gantt-inner" style={{ "--gtrack": `${trackW}px` } as CSSProperties}>
          <div className="gantt-mhead">
            <div className="gantt-corner">
              <span className="mono">{nRows} baris</span>
            </div>
            <div className="gantt-mstrip">
              {model.months.map((m, i) => (
                <span
                  key={m.key}
                  className="gmonth"
                  style={{ left: m.day * dayW, width: m.days * dayW }}
                >
                  {MONTHS[m.month]}
                  {(i === 0 || m.month === 0) && <b> {m.year}</b>}
                </span>
              ))}
            </div>
          </div>

          <div className="gantt-body">
            {/* Lapisan ini selebar TRACK, bukan selebar baris — kalau tidak, pita
                bulan dan garis hari ini jatuh di atas kolom nama. */}
            <div className="gantt-layer" aria-hidden="true">
              {model.months.map((m, i) => (
                <div
                  key={m.key}
                  className={`gband${i % 2 ? " alt" : ""}`}
                  style={{ left: m.day * dayW, width: m.days * dayW }}
                />
              ))}
              {weeks.map((w) => (
                <div key={w} className="gweek" style={{ left: w * dayW }} />
              ))}
            </div>

            {todayIn && (
              <div className="gantt-nowlayer" aria-hidden="true">
                <div className="gnow" style={{ left: model.todayDay * dayW }} />
              </div>
            )}

            {model.groups.map((g) => {
              const off = closed.has(g.platform);
              return (
                <div className="ggroup" key={g.platform}>
                  <div className="ggrow ghead" style={{ height: HEAD_H }}>
                    <button
                      type="button"
                      className={`glbl gheadbtn${off ? " off" : ""}`}
                      onClick={() => toggle(g.platform)}
                      aria-expanded={!off}
                    >
                      <span className="gchev">
                        <Icon name="chevron" size={12} />
                      </span>
                      <PlatformMark platform={g.platform} size={13} />
                      <b style={{ color: platformColor(g.platform) }}>{g.platform}</b>
                      <em>{g.rows.length}</em>
                    </button>
                    <div className="gtrack">
                      <div
                        className="gspan"
                        style={{
                          left: g.day * dayW,
                          width: Math.max((g.endDay - g.day) * dayW, 6),
                          background: platformColor(g.platform),
                        }}
                      />
                    </div>
                  </div>

                  {!off &&
                    g.rows.map((r) => (
                      <div className="ggrow" key={r.entry.id} style={{ height: ROW_H }}>
                        <div className="glbl">
                          {crunch?.has(r.entry.id) && (
                            <span className="crunch-mark">
                              <Icon name="layers" size={11} label="Tesnya jatuh di periode yang menumpuk" />
                            </span>
                          )}
                          <span className="gname" title={`${r.entry.platform} — ${r.entry.program}`}>
                            {r.entry.linkWeb ? (
                              <a href={r.entry.linkWeb} target="_blank" rel="noopener noreferrer">
                                {r.entry.program || "—"}
                              </a>
                            ) : (
                              r.entry.program || "—"
                            )}
                          </span>
                          {showTipe && <TipeTag tipe={r.entry.tipe} />}
                        </div>

                        <div className="gtrack">
                          {r.bars.map((b) => (
                            <div
                              key={b.key}
                              className={`gbar ${b.kind}${b.status === "resmi" ? "" : " soft"}`}
                              style={{ left: b.day * dayW, width: Math.max(b.days * dayW, 5) }}
                              onMouseEnter={(e) => hover(e, barTip(r, b))}
                              onMouseLeave={() => setTip(null)}
                              role="img"
                              aria-label={`${r.entry.platform} ${r.entry.program} — ${b.label}, ${
                                b.days === 1 ? d2(b.from) : `${d2(b.from)} sampai ${d2(b.to)}`
                              }`}
                            />
                          ))}
                          {r.marks.map((m) => (
                            <span
                              key={m.key}
                              className={`gmark${m.status === "resmi" ? "" : " soft"}`}
                              style={{ left: m.day * dayW + dayW / 2 }}
                              onMouseEnter={(e) => hover(e, markTip(r, m))}
                              onMouseLeave={() => setTip(null)}
                              role="img"
                              aria-label={`${r.entry.platform} ${r.entry.program} — ${m.label}, ${d2(m.date)}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tip && (
        <div className="gtip" style={{ left: tip.x, top: tip.y }} role="presentation">
          <div className="gtip-plat">{tip.plat}</div>
          <div className="gtip-head">{tip.head}</div>
          <div className="gtip-what">{tip.what}</div>
          <div className="gtip-when mono">
            {tip.when}
            {tip.extra && <span> · {tip.extra}</span>}
          </div>
          {tip.note && <div className="gtip-note">{tip.note}</div>}
        </div>
      )}

      <p className="foot" style={{ margin: "var(--s2) 0 0" }}>
        {nRows} program tergambar dalam {model.totalDays} hari.
        {model.skipped > 0 && ` ${model.skipped} baris tanpa satu pun tanggal tidak bisa digambar.`}{" "}
        Klik nama platform untuk melipat kelompoknya.
      </p>
    </section>
  );
}
