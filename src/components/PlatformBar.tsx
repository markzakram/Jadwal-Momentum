"use client";

import { useState } from "react";
import { platformColor } from "@/lib/palette";

const ROW_H = 26;
const BAR_H = 18; // batang tipis; sisa 8px jadi jarak antarbatang
const LABEL_W = 116;
const VALUE_W = 26;
const WIDTH = 420;

/**
 * Nama platform ditulis langsung di sumbu, jadi identitas tidak pernah
 * bergantung pada warna saja - itu sekaligus kelonggaran yang dibutuhkan
 * karena beberapa pasangan warna berada di ambang bawah keterbedaan CVD.
 * Satu seri saja, jadi tidak perlu kotak legenda; judul panel sudah menamainya.
 */
export default function PlatformBar({ counts }: { counts: Map<string, number> }) {
  const [hover, setHover] = useState<{ name: string; n: number; x: number; y: number } | null>(null);

  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = rows.length ? Math.max(...rows.map((r) => r[1])) : 0;
  const plotW = WIDTH - LABEL_W - VALUE_W;
  const height = Math.max(rows.length * ROW_H, ROW_H);

  if (!rows.length) {
    return (
      <div className="cc">
        <div className="empty" style={{ padding: "40px 0" }}>
          Belum ada data untuk ditampilkan.
        </div>
      </div>
    );
  }

  return (
    <div className="cc">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`Jumlah seleksi per platform: ${rows.map(([p, n]) => `${p} ${n}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
      >
        {rows.map(([name, n], i) => {
          const y = i * ROW_H;
          const w = max ? Math.max((n / max) * plotW, 3) : 3;
          return (
            <g key={name}>
              <text x={LABEL_W - 8} y={y + BAR_H / 2 + 4} textAnchor="end">
                {name}
              </text>
              <rect
                className="mark"
                x={LABEL_W}
                y={y + (ROW_H - BAR_H) / 2}
                width={w}
                height={BAR_H}
                rx={4}
                style={{ fill: platformColor(name) }}
                onMouseMove={(e) => setHover({ name, n, x: e.clientX, y: e.clientY })}
              />
              <text x={LABEL_W + w + 7} y={y + BAR_H / 2 + 4} className="val">
                {n}
              </text>
            </g>
          );
        })}
      </svg>

      <details style={{ marginTop: 10 }}>
        <summary className="csub" style={{ cursor: "pointer" }}>
          Lihat sebagai tabel
        </summary>
        <table className="tblview">
          <thead>
            <tr>
              <th>Platform</th>
              <th style={{ textAlign: "right" }}>Seleksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, n]) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="n">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {hover && (
        <div className="tip" style={{ left: hover.x, top: hover.y, position: "fixed" }}>
          {hover.name}: {hover.n} seleksi
        </div>
      )}
    </div>
  );
}
