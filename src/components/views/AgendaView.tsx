"use client";

import DateText from "../DateText";
import TipeTag from "../TipeTag";
import { platformColor } from "@/lib/palette";
import { MONTHS, agendaEvents, daysBetween, fmtShort, toIso } from "@/lib/status";
import type { AgendaEvent } from "@/lib/status";
import type { Entry } from "@/lib/types";

const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const KIND_LABEL: Record<AgendaEvent["kind"], string> = {
  daftar: "Pendaftaran",
  tes: "Tahap tes",
  hasil: "Pengumuman",
};

export default function AgendaView({
  rows,
  today,
  showTipe = false,
}: {
  rows: Entry[];
  today: Date;
  showTipe?: boolean;
}) {
  const events = agendaEvents(rows, today);

  if (!events.length) {
    return <div className="empty">Tidak ada kegiatan dari hari ini ke depan.</div>;
  }

  const months: { key: string; year: number; month: number; items: AgendaEvent[] }[] = [];
  for (const e of events) {
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    let bucket = months[months.length - 1];
    if (!bucket || bucket.key !== key) {
      bucket = { key, year: e.date.getFullYear(), month: e.date.getMonth(), items: [] };
      months.push(bucket);
    }
    bucket.items.push(e);
  }

  return (
    <section>
      {months.map((m) => (
        <div className="spine" key={m.key}>
          <div className="spine-month">
            <div className="m">{MONTHS[m.month]}</div>
            <div className="y mono">{m.year}</div>
            <div className="c">{m.items.length} kegiatan</div>
          </div>
          <div className="spine-items">
            {m.items.map((e) => {
              const sisa = daysBetween(today, e.date);
              const isToday = sisa === 0;
              const berentang = e.until && e.until.getTime() !== e.date.getTime();
              return (
                <div className="spine-row" key={e.key}>
                  <span className={`spine-when${isToday ? " now" : ""}`}>
                    <DateText it={e.entry} field={e.field} short value={toIso(e.date)} />
                    {berentang ? ` – ${fmtShort(toIso(e.until!))}` : ""}
                    {isToday ? " · hari ini" : sisa <= 7 ? ` · ${sisa} h` : ""}
                  </span>
                  <div>
                    <span className="spine-plat" style={{ color: platformColor(e.entry.platform) }}>
                      {e.entry.platform}
                    </span>
                    {showTipe && <TipeTag tipe={e.entry.tipe} />}
                    <div className="spine-title">
                      {e.entry.linkWeb ? (
                        <a href={e.entry.linkWeb} target="_blank" rel="noopener noreferrer">
                          {e.entry.program || e.entry.platform}
                        </a>
                      ) : (
                        e.entry.program || e.entry.platform
                      )}
                      <span style={{ color: "var(--muted)", fontWeight: 400 }}> — {e.label}</span>
                    </div>
                  </div>
                  <span className="spine-what" style={{ fontSize: 11, color: "var(--dim)" }}>
                    {KIND_LABEL[e.kind]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="foot" style={{ margin: "4px 0 0" }}>
        Menampilkan {events.length} kegiatan dari {MONTH_FULL[today.getMonth()]} {today.getFullYear()} ke depan. Satu
        program bisa muncul beberapa kali — sekali untuk tiap tanggal yang dicatat.
      </p>
    </section>
  );
}
