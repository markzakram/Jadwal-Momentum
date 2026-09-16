"use client";

import { useState } from "react";
import DateText from "../DateText";
import TipeTag from "../TipeTag";
import { platformColor, statusColor } from "@/lib/palette";
import { countdown, nextEvent, statusOf, toIso } from "@/lib/status";
import { STATUSES, type Entry, type Status } from "@/lib/types";

const PER_COLUMN = 6;

export default function BoardView({
  rows,
  today,
  showTipe = false,
}: {
  rows: Entry[];
  today: Date;
  showTipe?: boolean;
}) {
  const [expanded, setExpanded] = useState<Status | null>(null);

  const byStatus = new Map<Status, Entry[]>(STATUSES.map((s) => [s, []]));
  for (const it of rows) byStatus.get(statusOf(it, today))!.push(it);

  for (const list of byStatus.values()) {
    list.sort((a, b) => {
      const ea = nextEvent(a, statusOf(a, today)).date;
      const eb = nextEvent(b, statusOf(b, today)).date;
      if (!ea) return 1;
      if (!eb) return -1;
      return ea.getTime() - eb.getTime();
    });
  }

  return (
    <section className="board">
      {STATUSES.map((s) => {
        const list = byStatus.get(s)!;
        const open = expanded === s;
        const shown = open ? list : list.slice(0, PER_COLUMN);
        const hidden = list.length - shown.length;
        const done = s === "Selesai";

        return (
          <div className="col" key={s}>
            <div className="col-head">
              <i style={{ background: statusColor(s) }} />
              <b style={{ color: done ? "var(--muted)" : "var(--text)" }}>{s}</b>
              <em>{list.length}</em>
            </div>

            {list.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--dim)", padding: "6px 2px" }}>—</div>
            )}

            {shown.map((it) => {
              const cd = countdown(it, s, today);
              const ev = nextEvent(it, s);
              return (
                <article className={`bcard${done ? " done" : ""}`} key={it.id}>
                  <div className="bcard-top">
                    <span className="bcard-plat" style={{ color: platformColor(it.platform) }}>
                      <i style={{ background: platformColor(it.platform) }} />
                      {it.platform}
                    </span>
                    {showTipe && <TipeTag tipe={it.tipe} />}
                  </div>
                  <div className="bcard-title" style={done ? { color: "var(--muted)", fontWeight: 500 } : undefined}>
                    {it.linkWeb ? (
                      <a href={it.linkWeb} target="_blank" rel="noopener noreferrer">{it.program || "—"}</a>
                    ) : (
                      it.program || "—"
                    )}
                  </div>

                  {!done && (
                    <div className="bcard-rows">
                      {it.regTutup && (
                        <div>
                          <span>Tutup</span>
                          <span>
                            <DateText it={it} field="regTutup" short />
                          </span>
                        </div>
                      )}
                      {ev.date && ev.field && (
                        <div>
                          <span>{ev.what}</span>
                          <span>
                            <DateText it={it} field={ev.field} short value={toIso(ev.date)} />
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {cd && (
                    <div
                      className="bcard-cd"
                      style={{
                        background: `rgba(var(--${s === "Buka" ? "warn" : s === "Menunggu Hasil" ? "hasil" : "slate"}-rgb), 0.12)`,
                        color: statusColor(s === "Buka" ? "Tes Berlangsung" : s),
                      }}
                    >
                      {cd}
                    </div>
                  )}
                </article>
              );
            })}

            {hidden > 0 && (
              <button
                type="button"
                className="col-more"
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => setExpanded(s)}
              >
                + {hidden} lainnya
              </button>
            )}
            {open && list.length > PER_COLUMN && (
              <button
                type="button"
                className="col-more"
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => setExpanded(null)}
              >
                Ringkas
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
