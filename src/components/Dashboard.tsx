"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import Notices from "./Notices";
import PlatformBar from "./PlatformBar";
import StatusDonut from "./StatusDonut";
import ThemeControls from "./ThemeControls";
import AgendaView from "./views/AgendaView";
import BoardView from "./views/BoardView";
import CardView from "./views/CardView";
import DenseView from "./views/DenseView";
import GanttView from "./views/GanttView";
import MomenView from "./views/MomenView";
import { crunchIds, findCrunch } from "@/lib/conflicts";
import { APP_VERSION, BUILD_SHA } from "@/lib/version";
import { rowStatuses } from "@/lib/confidence";
import { daysBetween, fmt, nextEvent, pd, statusOf, tWindow } from "@/lib/status";
import {
  DATE_STATUSES,
  TABS,
  DATE_STATUS_INFO,
  SHEETS,
  STATUSES,
  VIEWS,
  type DateStatus,
  type Entry,
  type SheetKey,
  type SheetPayload,
  type Status,
  type TabKey,
  type ViewKey,
} from "@/lib/types";

type SortKey = "dekat" | "reg" | "tes" | "platform";

export default function Dashboard({
  payload,
  sheet,
  serverToday,
  pembanding = {},
  focusId = null,
}: {
  payload: SheetPayload;
  sheet: SheetKey;
  serverToday: string;
  /** baris arsip yang berpasangan, per id baris tahun ini - lihat lib/tahunLalu.ts */
  pembanding?: Record<number, Entry>;
  /** dari ?id= - program yang dituju tautan per program */
  focusId?: number | null;
}) {
  const [view, setView] = useState<ViewKey>("kendali");
  const [tab, setTab] = useState<TabKey>("Real");
  const [q, setQ] = useState("");
  const [fPlatform, setFPlatform] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("dekat");
  const [todayIso, setTodayIso] = useState(serverToday);
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Render pertama memakai nilai yang sama dengan server; preferensi tersimpan
  // baru dibaca setelah mount, jadi markupnya tidak pernah berbeda.
  useEffect(() => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (local !== serverToday) setTodayIso(local);
    // Keduanya dibaca dari atribut <html>, bukan langsung dari localStorage:
    // skrip di layout sudah memasangnya sebelum paint pertama, jadi tidak ada
    // kedipan dari tab "Real" ke tab yang sebenarnya dipilih.
    const el = document.documentElement;
    const storedView = el.dataset.view as ViewKey | undefined;
    if (storedView && VIEWS.some((v) => v.key === storedView)) setView(storedView);
    const storedTab = el.dataset.tab as TabKey | undefined;
    if (storedTab && (TABS as readonly string[]).includes(storedTab)) setTab(storedTab);
  }, [serverToday]);

  /*
   * Tautan ?id= membuka tampilan Rincian di tab Semua dengan penyaring bersih,
   * supaya programnya PASTI terlihat - tab Real saja bisa menyembunyikannya.
   * Dideklarasikan SESUDAH pemulih pilihan di atas: efek berjalan berurutan,
   * dan yang belakangan menang.
   *
   * setView/setTab dipanggil langsung, BUKAN pickView/pickTab: membuka tautan
   * dari rekan tidak boleh mengubah tampilan yang tersimpan milik pembukanya.
   */
  const fokusAda = focusId !== null && payload.rows.some((r) => r.id === focusId);
  useEffect(() => {
    if (!fokusAda) return;
    setView("rincian");
    setTab("Semua");
    setQ("");
    setFPlatform("all");
    setFStatus("all");
  }, [fokusAda]);

  function pickTab(t: TabKey) {
    setTab(t);
    document.documentElement.dataset.tab = t;
    try {
      localStorage.setItem("tab", t);
    } catch {
      /* mode privat: pilihan tidak tersimpan, tampilan tetap jalan */
    }
  }

  // Google Calendar butuh URL mutlak; origin baru diketahui di browser.
  useEffect(() => {
    const qs = sheet === "DATA" ? "" : `?sheet=${sheet}`;
    setFeedUrl(`${window.location.origin}/kalender.ics${qs}`);
  }, [sheet]);

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Salin tautan kalender ini:", feedUrl);
    }
  }

  function pickView(v: ViewKey) {
    setView(v);
    document.documentElement.dataset.view = v;
    try {
      localStorage.setItem("view", v);
    } catch {
      /* private mode: pilihan tidak tersimpan, tampilan tetap jalan */
    }
  }

  const today = useMemo(() => pd(todayIso) ?? new Date(), [todayIso]);
  const rows = payload.rows;
  const label = SHEETS.find((s) => s.key === sheet)?.label ?? sheet;

  const tabRows = useMemo(
    () => (tab === "Semua" ? rows : rows.filter((r) => r.tipe === tab)),
    [rows, tab],
  );
  const platforms = useMemo(
    () => [...new Set(rows.map((r) => r.platform).filter(Boolean))].sort(),
    [rows],
  );

  const statusCounts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const it of tabRows) c[statusOf(it, today)]++;
    return c;
  }, [tabRows, today]);

  const platformCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of tabRows) if (it.platform) m.set(it.platform, (m.get(it.platform) ?? 0) + 1);
    return m;
  }, [tabRows]);

  const crunch = useMemo(() => findCrunch(tabRows, today), [tabRows, today]);
  const crunchSet = useMemo(() => crunchIds(crunch), [crunch]);

  const closingSoon = useMemo(
    () =>
      tabRows.filter((it) => {
        if (statusOf(it, today) !== "Buka") return false;
        const rt = pd(it.regTutup);
        return rt ? daysBetween(today, rt) <= 7 : false;
      }).length,
    [tabRows, today],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = tabRows.filter((it) => {
      if (fPlatform !== "all" && it.platform !== fPlatform) return false;
      if (fStatus !== "all" && statusOf(it, today) !== fStatus) return false;
      if (needle) {
        const hay = `${it.platform} ${it.program} ${it.tahap1} ${it.tahap2} ${it.catatan}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    out.sort((a: Entry, b: Entry) => {
      if (sort === "platform") return `${a.platform}${a.program}`.localeCompare(`${b.platform}${b.program}`);
      if (sort === "dekat") {
        const ea = nextEvent(a, statusOf(a, today)).date;
        const eb = nextEvent(b, statusOf(b, today)).date;
        if (!ea) return 1;
        if (!eb) return -1;
        return ea.getTime() - eb.getTime();
      }
      const ka = sort === "tes" ? (tWindow(a).ts ?? pd(a.regBuka)) : pd(a.regBuka);
      const kb = sort === "tes" ? (tWindow(b).ts ?? pd(b.regBuka)) : pd(b.regBuka);
      if (!ka) return 1;
      if (!kb) return -1;
      return ka.getTime() - kb.getTime();
    });
    return out;
  }, [tabRows, q, fPlatform, fStatus, sort, today]);

  /** Hanya status yang benar-benar dipakai baris terlihat yang dijelaskan. */
  const legenda = useMemo(() => {
    const seen = new Set<DateStatus>();
    for (const it of visible) for (const s of rowStatuses(it)) if (s !== "resmi") seen.add(s);
    return DATE_STATUSES.filter((s) => s !== "resmi" && seen.has(s));
  }, [visible]);

  return (
    <>
      <header className="top">
        <div className="wrap head-row">
          <div className="brand">
            {/* Kubus Product Momentum di atas ubin putih, bukan logo telanjang:
                wajah merah tuanya (#8f011e) nyaris lenyap di panel gelap. */}
            <img className="brand-mark" src="/logo/mark-64.png" alt="" width={34} height={34} />
            <div className="brand-text">
              <h1>
                Product<b>Momentum</b>
                <span
                  className="brand-ver"
                  title={BUILD_SHA ? `Build ${BUILD_SHA}` : "Dijalankan dari mesin sendiri"}
                >
                  v{APP_VERSION}
                </span>
              </h1>
              <p>Divisi Produk</p>
            </div>
          </div>

          <div className="head-ctrl">
            <div className="seg">
              {SHEETS.map((s) => (
                <Link
                  key={s.key}
                  href={s.key === "DATA" ? "/" : `/?sheet=${s.key}`}
                  className={s.key === sheet ? "on" : undefined}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <ThemeControls />
            <span className="date-pill">{fmt(todayIso)}</span>
          </div>
        </div>
      </header>

      <main className="wrap">
        {payload.warning && <div className="notice">{payload.warning}</div>}
        {/* Hari ini beberapa baris duplikat dihapus dan digabung. Tautan lama yang
            menunjuk ke sana harus menjelaskan dirinya, bukan diam-diam membuka
            halaman biasa seolah tautannya berhasil. */}
        {focusId !== null && !fokusAda && (
          <div className="notice">
            Program #{focusId} tidak ada di sheet ini — mungkin sudah dihapus atau digabung dengan baris lain.
          </div>
        )}

        <section className="kpis" style={{ marginTop: payload.warning ? 12 : 0 }}>
          <div className="kpi">
            <div className="k">TOTAL</div>
            <div className="n">{tabRows.length}</div>
          </div>
          <div className="kpi g">
            <div className="k">BUKA</div>
            <div className="n">{statusCounts.Buka}</div>
          </div>
          <div className="kpi w">
            <div className="k" title="Tes Berlangsung"><span className="k-l">TES BERLANGSUNG</span><span className="k-s">TES</span></div>
            <div className="n">{statusCounts["Tes Berlangsung"]}</div>
          </div>
          <div className="kpi o">
            <div className="k" title="Tutup ≤ 7 Hari"><span className="k-l">TUTUP ≤ 7 HARI</span><span className="k-s">TUTUP ≤7H</span></div>
            <div className="n">{closingSoon}</div>
          </div>
          <div className="kpi h">
            <div className="k" title="Menunggu Hasil"><span className="k-l">MENUNGGU HASIL</span><span className="k-s">HASIL</span></div>
            <div className="n">{statusCounts["Menunggu Hasil"]}</div>
          </div>
        </section>

        <Notices rows={rows} today={today} sheet={sheet} periods={crunch} />

        <details className="summary">
          <summary>
            <Icon name="chevron" size={13} />
            Ringkasan grafik
          </summary>
          <div className="charts">
            <div className="panel">
              <h3>Distribusi Status</h3>
              <StatusDonut
                counts={statusCounts}
                total={tabRows.length}
                subtitle={`${tab} · ${tabRows.length} seleksi`}
              />
            </div>
            <div className="panel">
              <h3>Jumlah Seleksi per Platform</h3>
              <p className="csub">Banyaknya program tiap platform</p>
              <PlatformBar counts={platformCounts} />
            </div>
          </div>
        </details>

        <div className="searchbar">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Cari platform, program, atau catatan..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari"
          />
          <select value={fPlatform} onChange={(e) => setFPlatform(e.target.value)} aria-label="Saring platform">
            <option value="all">Semua Platform</option>
            {platforms.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Saring status">
            <option value="all">Semua Status</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Tab menyaring DATA; tombol ikon di kanan mengganti CARA data yang sama
            ditampilkan — dua hal berbeda, jadi bentuknya juga dibedakan. */}
        <div className="tabbar">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`tab${tab === t ? " on" : ""}`}
                onClick={() => pickTab(t)}
              >
                {t}
                <em>{t === "Semua" ? rows.length : rows.filter((r) => r.tipe === t).length}</em>
              </button>
            ))}
          </div>

          <div className="viewbtns" role="group" aria-label="Pilih tampilan">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`viewbtn${view === v.key ? " on" : ""}`}
                onClick={() => pickView(v.key)}
                title={`${v.label} — ${v.hint}`}
                aria-pressed={view === v.key}
              >
                <Icon name={v.icon} size={17} label={v.label} />
                {/* Hanya tampil di bilah bawah ponsel. aria-hidden karena nama
                    tombolnya sudah dibawa ikon - pembaca layar tidak perlu
                    mendengar "Ruang Kendali, Daftar". */}
                <span className="viewbtn-lbl" aria-hidden="true">{v.short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="resultbar">
          <span className="rowcount">
            {visible.length} dari {tabRows.length} baris
          </span>
          {legenda.length > 0 && (
            <span className="dtlegend">
              {legenda.map((s) => (
                <span key={s} title={DATE_STATUS_INFO[s].hint}>
                  <span className={`dt dt-${s}`}>
                    tanggal
                    <span className="dt-mark">{DATE_STATUS_INFO[s].mark}</span>
                  </span>
                  = {DATE_STATUS_INFO[s].label.toLowerCase()}
                </span>
              ))}
            </span>
          )}
          {/* Agenda, Lini Masa, dan Momen punya urutan bawaannya sendiri, jadi
              pemilih urutan disembunyikan supaya tidak tampak tak bekerja. */}
          {view !== "agenda" && view !== "gantt" && view !== "momen" && (
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Urutkan">
              <option value="dekat">Urut: Terdekat</option>
              <option value="reg">Urut: Reg Buka</option>
              <option value="tes">Urut: Mulai Tes</option>
              <option value="platform">Urut: Platform</option>
            </select>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty">Tidak ada data yang cocok.</div>
        ) : view === "kendali" ? (
          <DenseView rows={visible} today={today} crunch={crunchSet} showTipe={tab === "Semua"} />
        ) : view === "momen" ? (
          <MomenView rows={visible} today={today} showTipe={tab === "Semua"} />
        ) : view === "rincian" ? (
          <CardView rows={visible} today={today} crunch={crunchSet} showTipe={tab === "Semua"} pembanding={pembanding} focusId={focusId} />
        ) : view === "gantt" ? (
          <GanttView rows={visible} today={today} crunch={crunchSet} showTipe={tab === "Semua"} />
        ) : view === "agenda" ? (
          <AgendaView rows={visible} today={today} showTipe={tab === "Semua"} />
        ) : (
          <BoardView rows={visible} today={today} showTipe={tab === "Semua"} />
        )}

        <footer className="foot">
          <div className="feedbar">
            <b style={{ color: "var(--muted)", fontWeight: 600 }}>Langganan kalender</b>
            <code className="feedurl">{feedUrl || `/kalender.ics${sheet === "DATA" ? "" : `?sheet=${sheet}`}`}</code>
            <button type="button" className="btn-mini" onClick={copyFeed} disabled={!feedUrl}>
              {copied ? "Tersalin" : "Salin"}
            </button>
            <a className="plain" href={`/kalender.ics${sheet === "DATA" ? "" : `?sheet=${sheet}`}`}>
              Unduh .ics
            </a>
            <span>
              Tempel tautannya di Google Calendar › Other calendars › From URL. Google menyegarkan langganan
              beberapa jam sekali, jadi perubahan tidak langsung muncul di kalender.
            </span>
          </div>
          {payload.source === "sheet"
            ? `Sumber: Google Sheets, sheet ${sheet}. Perubahan di Sheets menyusul paling lama 5 menit.`
            : `Sumber: data contoh dalam repo (${sheet}).`}
          {" "}Penyuntingan data dilakukan di Google Sheets, bukan di halaman ini.
        </footer>
      </main>
    </>
  );
}
