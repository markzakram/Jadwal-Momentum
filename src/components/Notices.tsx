"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DateText from "./DateText";
import { countChanges, diffSnapshots, takeSnapshot, type Change, type Snapshot } from "@/lib/changes";
import { periodIso, type CrunchPeriod } from "@/lib/conflicts";
import { platformColor } from "@/lib/palette";
import { daysBetween, fmt, fmtShort, toIso } from "@/lib/status";
import { countBySeverity, validateRows } from "@/lib/validate";
import type { Entry, SheetKey } from "@/lib/types";

/**
 * Satu baris pemberitahuan untuk tiga hal sekaligus: perubahan sejak terakhir
 * dibuka, kekeliruan isi sheet, dan periode tes yang menumpuk.
 *
 * Dulu ketiganya panel terpisah dan menumpuk jadi tiga pita sebelum data — 141px
 * perabot yang tidak satu pun berisi jadwal. Sekarang ringkasannya satu baris
 * berisi tiga keping; rinciannya muncul saat dibuka.
 */

const KEY = (sheet: string) => `jadwal:snapshot:${sheet}`;

function readSnapshot(sheet: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY(sheet));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(s: Snapshot): boolean {
  try {
    localStorage.setItem(KEY(s.sheet), JSON.stringify(s));
    return true;
  } catch {
    return false; // mode privat atau kuota penuh
  }
}

function sinceLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hari = Math.floor(ms / 864e5);
  if (hari >= 2) return `${hari} hari lalu`;
  if (hari === 1) return "kemarin";
  const jam = Math.floor(ms / 36e5);
  return jam >= 1 ? `${jam} jam lalu` : "beberapa menit lalu";
}

function show(v: string, isDate: boolean): string {
  if (!v) return "kosong";
  if (isDate) return fmt(v);
  return v.length > 70 ? `${v.slice(0, 70)}…` : v;
}

export default function Notices({
  rows,
  today,
  sheet,
  periods,
}: {
  rows: Entry[];
  today: Date;
  sheet: SheetKey;
  periods: CrunchPeriod[];
}) {
  const findings = useMemo(() => validateRows(rows, today), [rows, today]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [since, setSince] = useState("");
  const [bisaSimpan, setBisaSimpan] = useState(true);

  const evaluate = useCallback(() => {
    const next = takeSnapshot(rows, sheet, new Date());
    const prev = readSnapshot(sheet);
    // Kunjungan pertama disimpan diam-diam; tanpa ini seluruh sheet akan
    // dilaporkan sebagai "berubah".
    if (!prev || prev.v !== next.v || prev.sheet !== next.sheet) {
      setBisaSimpan(writeSnapshot(next));
      setChanges([]);
      return;
    }
    setChanges(diffSnapshots(prev, next));
    setSince(sinceLabel(prev.takenAt));
  }, [rows, sheet]);

  // localStorage tidak boleh disentuh saat render: markup server dan klien
  // harus identik.
  useEffect(() => {
    evaluate();
  }, [evaluate]);

  function tandaiDibaca() {
    const ok = writeSnapshot(takeSnapshot(rows, sheet, new Date()));
    setBisaSimpan(ok);
    if (ok) setChanges([]);
  }

  const nIssue = countBySeverity(findings);
  const nChange = countChanges(changes);

  const chips = [
    changes.length > 0 && { k: "changes", warna: "var(--info)", teks: `${nChange.total} perubahan` },
    findings.length > 0 && {
      k: "issues",
      warna: nIssue.error ? "var(--bad)" : "var(--slate)",
      teks: `${nIssue.rows} baris perlu diperiksa`,
    },
    periods.length > 0 && { k: "crunch", warna: "var(--warn)", teks: `${periods.length} periode menumpuk` },
  ].filter(Boolean) as { k: string; warna: string; teks: string }[];

  if (!chips.length) return null;
  // Hanya kabar baru yang layak menyela. Kekeliruan sheet akan terus ada sampai
  // diperbaiki, jadi kalau ikut membuka panel, panelnya terbuka tiap kali
  // halaman dibuka; keping merah di ringkasan sudah cukup menandainya.
  const penting = nChange.tanggal > 0;

  return (
    <details className="notices" open={penting}>
      <summary>
        {chips.map((c) => (
          <span className="nchip" key={c.k}>
            <i style={{ background: c.warna }} aria-hidden="true" />
            {c.teks}
          </span>
        ))}
        <span className="nhint">lihat rincian</span>
      </summary>

      <div className="nbody">
        {changes.length > 0 && (
          <section className="nsec">
            <h4>
              <i style={{ background: "var(--info)" }} aria-hidden="true" />
              Berubah sejak kamu terakhir membuka
              <em>
                dibanding {since} · {nChange.ubah} diubah, {nChange.baru} baru, {nChange.hilang} hilang
              </em>
            </h4>
            <div className="nrows">
              {changes.map((c) => (
                <div className="nrow" key={`${c.kind}-${c.id}`}>
                  <span className={`ntag ${c.kind}`}>
                    {c.kind === "baru" ? "BARU" : c.kind === "hilang" ? "HILANG" : "DIUBAH"}
                  </span>
                  <span className="nwho">
                    <i style={{ background: platformColor(c.platform) }} aria-hidden="true" />
                    {c.platform}
                    {c.program ? ` — ${c.program}` : ""}
                  </span>
                  <span className="nwhat">
                    {c.fields.length === 0
                      ? c.kind === "baru"
                        ? "Belum ada saat kamu terakhir membuka."
                        : "Sudah tidak ada di sheet."
                      : c.fields.map((f) => (
                          <span className="nfield" key={f.field}>
                            <b>{f.label}</b>
                            <s>{show(f.from, f.isDate)}</s>
                            <span aria-hidden="true">→</span>
                            <u>{show(f.to, f.isDate)}</u>
                          </span>
                        ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="nfoot">
              <button type="button" className="btn-mini" onClick={tandaiDibaca} disabled={!bisaSimpan}>
                Tandai sudah dibaca
              </button>
              <span>
                {bisaSimpan
                  ? "Dibandingkan dengan cuplikan di peramban ini saja, jadi hitungannya per orang."
                  : "Peramban menolak menyimpan cuplikan, jadi daftar ini tidak bisa ditandai."}
              </span>
            </div>
          </section>
        )}

        {findings.length > 0 && (
          <section className="nsec">
            <h4>
              <i style={{ background: nIssue.error ? "var(--bad)" : "var(--slate)" }} aria-hidden="true" />
              Perlu diperiksa di sheet
              <em>
                dari {rows.length} baris · {nIssue.error} perlu diperbaiki, {nIssue.warning} perlu dicek
              </em>
            </h4>
            <div className="nrows">
              {findings.map((f, i) => (
                <div className="nrow" key={`${f.id}-${f.rule}-${i}`}>
                  <span className={`ntag ${f.severity}`}>{f.severity === "error" ? "PERBAIKI" : "CEK"}</span>
                  <span className="nwho">
                    <i style={{ background: platformColor(f.platform) }} aria-hidden="true" />
                    {f.platform}
                    {f.program ? ` — ${f.program}` : ""}
                  </span>
                  <span className="nwhat">{f.message}</span>
                </div>
              ))}
            </div>
            <div className="nfoot">
              <span>Perbaikannya di Google Sheets; halaman ini menyusul paling lama 5 menit setelahnya.</span>
            </div>
          </section>
        )}

        {periods.length > 0 && (
          <section className="nsec">
            <h4>
              <i style={{ background: "var(--warn)" }} aria-hidden="true" />
              Periode tes menumpuk
              <em>
                180 hari ke depan · puncaknya {Math.max(...periods.map((p) => p.peak))} platform bersamaan
              </em>
            </h4>
            <div className="nperiods">
              {periods.map((p) => {
                const iso = periodIso(p);
                const mulai = daysBetween(today, p.from);
                return (
                  <div className="nperiod" key={iso.from}>
                    <div className="np-when">
                      <b>
                        {fmtShort(iso.from)} – {fmt(iso.to)}
                      </b>
                      <span>
                        {p.days} hari · {p.platforms.length} platform
                        {p.platforms.length !== p.peak ? `, puncak ${p.peak}` : ""}
                        {mulai > 0 ? ` · ${mulai} hari lagi` : mulai === 0 ? " · mulai hari ini" : " · berjalan"}
                      </span>
                    </div>
                    <ul className="np-rows">
                      {p.entries.map((b) => (
                        <li key={`${b.entry.id}-${b.label}`}>
                          <i style={{ background: platformColor(b.entry.platform) }} aria-hidden="true" />
                          <span className="np-prog">{b.entry.program || b.entry.platform}</span>
                          <span className="np-tahap">{b.label}</span>
                          <span className="np-tgl mono">
                            <DateText it={b.entry} field={b.field} short value={toIso(b.start)} /> –{" "}
                            {fmtShort(toIso(b.end))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="nfoot">
              <span>
                Dihitung dari rentang tes tab aktif, antar platform berbeda. Gelombang sesama platform tidak
                dihitung bertabrakan karena memang dijalankan serentak.
              </span>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
