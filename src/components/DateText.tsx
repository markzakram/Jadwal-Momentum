"use client";

import { dateStatusOf } from "@/lib/confidence";
import { fmt, fmtShort } from "@/lib/status";
import { DATE_STATUS_INFO, type Entry } from "@/lib/types";

/**
 * Satu tanggal beserta tingkat keyakinannya. Tanggal resmi tampil polos;
 * yang lain diberi garis putus-putus DAN tanda kecil, jadi bedanya tidak
 * pernah bergantung pada warna saja.
 */
export default function DateText({
  it,
  field,
  short = false,
  value,
}: {
  it: Entry;
  field: string;
  short?: boolean;
  /** dipakai bila tanggalnya sudah dihitung di tempat lain (mis. ujung rentang) */
  value?: string;
}) {
  const raw = value ?? String(it[field as keyof Entry] ?? "");
  if (!raw) return <>{"—"}</>;

  const status = dateStatusOf(it, field);
  const text = short ? fmtShort(raw) : fmt(raw);
  if (status === "resmi") return <>{text}</>;

  const info = DATE_STATUS_INFO[status];
  return (
    <span className={`dt dt-${status}`} title={`${info.label} — ${info.hint}`}>
      {text}
      <span className="dt-mark" aria-hidden="true">
        {info.mark}
      </span>
      <span className="only-sr"> ({info.label})</span>
    </span>
  );
}
