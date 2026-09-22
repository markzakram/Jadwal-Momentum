/**
 * Alat baca-tulis Google Sheets untuk perawatan data.
 *
 * Dipisah tegas dari aplikasi web. Halaman dashboard memakai token
 * `spreadsheets.readonly` dan tidak akan pernah bisa menulis walau service
 * account-nya Editor; berkas inilah satu-satunya yang meminta token tulis, dan
 * ia hanya jalan di mesin sendiri - tidak pernah ikut ke Vercel.
 *
 * Pakai:
 *   node scripts/sheet.mjs baca DATA
 *   node scripts/sheet.mjs cadangkan
 */

import { createSign } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** .env.local dibaca sendiri supaya skrip ini tidak butuh dependensi apa pun. */
function env() {
  const out = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* tanpa .env.local, jatuh ke process.env */
  }
  return { ...out, ...process.env };
}

const ENV = env();
export const SHEET_ID = ENV.GOOGLE_SHEET_ID;

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const b64 = (x) => Buffer.from(x).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let _token = null;

async function token() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && _token.exp > now + 60) return _token.value;

  const file = ENV.GOOGLE_SERVICE_ACCOUNT_FILE || "./credential.json";
  const sa = JSON.parse(readFileSync(join(ROOT, file.replace(/^\.\//, "")), "utf8"));
  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";

  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud, iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${claim}`);
  const assertion = `${head}.${claim}.${b64(signer.sign(sa.private_key.replace(/\\n/g, "\n")))}`;

  const res = await fetch(aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`token gagal: ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
  _token = { value: j.access_token, exp: now + (j.expires_in || 3600) };
  return j.access_token;
}

async function api(path, init = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error?.message ?? text; } catch { /* biarkan mentah */ }
    throw new Error(`HTTP ${res.status} — ${String(msg).slice(0, 240)}`);
  }
  return text ? JSON.parse(text) : {};
}

/** Nilai satu rentang. Tanpa rentang = seluruh bagian terpakai sheet itu. */
export async function baca(range) {
  const j = await api(`/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`);
  return j.values ?? [];
}

/** Tulis beberapa rentang sekaligus - satu permintaan, jadi tidak ada keadaan setengah jadi. */
export async function tulis(updates) {
  return api(`/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: updates.map(([range, values]) => ({ range, values })),
    }),
  });
}

/** Operasi struktural: sisip kolom, hapus baris, dan sejenisnya. */
export async function struktur(requests) {
  return api(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests }) });
}

export async function properti() {
  const j = await api(`?fields=sheets.properties`);
  return j.sheets.map((s) => s.properties);
}

/** Salin seluruh isi tiap sheet ke satu berkas JSON bertanda waktu. */
export async function cadangkan(label = "") {
  const props = await properti();
  const isi = {};
  for (const p of props) isi[p.title] = await baca(p.title);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = join(ROOT, "backup");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `sheet-${stamp}${label ? "-" + label : ""}.json`);
  writeFileSync(file, JSON.stringify({ spreadsheetId: SHEET_ID, waktu: new Date().toISOString(), sheets: isi }, null, 1), "utf8");

  const ringkas = Object.entries(isi).map(([k, v]) => `${k}=${v.length}`).join(" ");
  return { file, ringkas };
}

// --- CLI kecil -------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("sheet.mjs")) {
  const [, , cmd, arg] = process.argv;
  if (cmd === "baca") {
    const v = await baca(arg || "DATA");
    console.log(`${v.length} baris`);
    v.slice(0, 5).forEach((r, i) => console.log(String(i + 1).padStart(3), r.slice(0, 6).join(" | ")));
  } else if (cmd === "cadangkan") {
    const { file, ringkas } = await cadangkan(arg);
    console.log("tersimpan:", file);
    console.log("isi      :", ringkas);
  } else if (cmd === "props") {
    console.log(await properti());
  } else {
    console.log("perintah: baca <sheet> | cadangkan [label] | props");
  }
}
