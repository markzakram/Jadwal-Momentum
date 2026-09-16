"use client";

import { useState } from "react";
import Icon from "./Icon";
import { STATUS_ICON, statusColor } from "@/lib/palette";
import { STATUSES, type Status } from "@/lib/types";

const SIZE = 190;
const R_OUT = 86;
const R_IN = 53; // cutout ~62%, sama seperti versi Chart.js lama
const CX = SIZE / 2;
const CY = SIZE / 2;

function sector(a0: number, a1: number): string {
  const pt = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(R_OUT, a0);
  const [x1, y1] = pt(R_OUT, a1);
  const [x2, y2] = pt(R_IN, a1);
  const [x3, y3] = pt(R_IN, a0);
  return `M${x0} ${y0} A${R_OUT} ${R_OUT} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${R_IN} ${R_IN} 0 ${large} 0 ${x3} ${y3} Z`;
}

export default function StatusDonut({
  counts,
  total,
  subtitle,
}: {
  counts: Record<Status, number>;
  total: number;
  subtitle: string;
}) {
  const [hover, setHover] = useState<{ label: Status; n: number; x: number; y: number } | null>(null);

  const slices = STATUSES.filter((s) => counts[s] > 0);
  const sum = slices.reduce((a, s) => a + counts[s], 0);

  // Jarak 2px antar irisan, dinyatakan sebagai sudut pada radius luar.
  const gap = 2 / R_OUT;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const span = (counts[s] / sum) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + span;
    angle = a1;
    return { status: s, a0, a1: Math.max(a0 + 0.001, a1 - (slices.length > 1 ? gap : 0)) };
  });

  return (
    <div className="cc">
      <p className="csub">{subtitle}</p>

      {sum === 0 ? (
        <div className="empty" style={{ padding: "40px 0" }}>
          Belum ada data untuk ditampilkan.
        </div>
      ) : (
        <>
          <svg
            className="chart-svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ maxHeight: 200 }}
            role="img"
            aria-label={`Distribusi status: ${slices.map((s) => `${s} ${counts[s]}`).join(", ")}`}
            onMouseLeave={() => setHover(null)}
          >
            {slices.length === 1 ? (
              <circle
                className="mark"
                cx={CX}
                cy={CY}
                r={(R_OUT + R_IN) / 2}
                fill="none"
                strokeWidth={R_OUT - R_IN}
                style={{ stroke: statusColor(slices[0]) }}
                onMouseMove={(e) =>
                  setHover({ label: slices[0], n: counts[slices[0]], x: e.clientX, y: e.clientY })
                }
              />
            ) : (
              arcs.map((a) => (
                <path
                  key={a.status}
                  className="mark"
                  d={sector(a.a0, a.a1)}
                  style={{ fill: statusColor(a.status) }}
                  onMouseMove={(e) =>
                    setHover({ label: a.status, n: counts[a.status], x: e.clientX, y: e.clientY })
                  }
                />
              ))
            )}
            <text x={CX} y={CY - 4} textAnchor="middle" className="val" style={{ fontSize: 26 }}>
              {total}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" style={{ fontSize: 10 }}>
              seleksi
            </text>
          </svg>

          <div className="chart-legend">
            {slices.map((s) => (
              <span key={s}>
                <span style={{ color: statusColor(s), display: "inline-flex" }}>
                  <Icon name={STATUS_ICON[s]} size={12} />
                </span>
                {s} <b style={{ color: "var(--text)" }}>{counts[s]}</b>
              </span>
            ))}
          </div>

          <details style={{ marginTop: 10 }}>
            <summary className="csub" style={{ cursor: "pointer" }}>
              Lihat sebagai tabel
            </summary>
            <table className="tblview">
              <thead>
                <tr>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Jumlah</th>
                  <th style={{ textAlign: "right" }}>Porsi</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((s) => (
                  <tr key={s}>
                    <td>
                      <span style={{ color: statusColor(s), display: "inline-flex", verticalAlign: "-2px", marginRight: 5 }}>
                        <Icon name={STATUS_ICON[s]} size={12} />
                      </span>
                      {s}
                    </td>
                    <td className="n">{counts[s]}</td>
                    <td className="n">{Math.round((counts[s] / sum) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}

      {hover && (
        <div className="tip" style={{ left: hover.x, top: hover.y, position: "fixed" }}>
          {hover.label}: {hover.n} seleksi ({Math.round((hover.n / sum) * 100)}%)
        </div>
      )}
    </div>
  );
}
