import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * Token akses Google dari sebuah service account, tanpa pustaka tambahan.
 *
 * Kenapa tidak memakai `googleapis` seperti proyek task-tracker: di sana ia
 * memang perlu (menulis, belasan endpoint). Di sini yang dibutuhkan hanya
 * membaca satu rentang nilai, dan `googleapis` membawa ~1 MB dependensi yang
 * juga TIDAK ikut cache ISR Next.js - cache 5 menit itu hanya berlaku untuk
 * `fetch()`. Menandatangani JWT sendiri lebih ringan dan mempertahankan cache.
 *
 * Kuncinya tidak pernah ikut ke browser: berkas ini hanya diimpor komponen
 * server.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** Token berlaku satu jam; disimpan di memori proses supaya tidak dicetak ulang tiap permintaan. */
let cached: { token: string; expiresAt: number } | null = null;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Dua cara memberi kunci:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  isi berkas JSON-nya langsung (dipakai di Vercel)
 *   GOOGLE_SERVICE_ACCOUNT_FILE  path ke berkas JSON (dipakai di mesin sendiri,
 *                                supaya kuncinya tidak perlu digandakan)
 */
export function serviceAccount(): ServiceAccount | null {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
    if (!file) return null;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      return null;
    }
  }

  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.client_email || !sa.private_key) return null;
    // Variabel lingkungan hanya bisa satu baris, jadi baris baru di dalam kunci
    // tersimpan sebagai "\n" harfiah. Tanpa dikembalikan, penandatanganan gagal.
    return { ...sa, private_key: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export async function accessToken(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt > now + 60) return cached.token;

  const sa = serviceAccount();
  if (!sa) throw new Error("kunci service account tidak terbaca");

  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud, iat: now, exp: now + 3600 }));

  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${claim}`);
  const assertion = `${head}.${claim}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch(aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Pesan Google cukup jelas ("invalid_grant", "invalid_client"), jadi
    // diteruskan apa adanya - ia yang membedakan kunci salah dari jam meleset.
    throw new Error(`token ditolak (HTTP ${res.status}) ${body.slice(0, 160)}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("token kosong dari Google");

  cached = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return json.access_token;
}
