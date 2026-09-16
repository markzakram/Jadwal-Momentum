"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { ACCENTS } from "@/lib/palette";

export default function ThemeControls() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<string>("emerald");

  // Nilai sebenarnya dibaca setelah mount - saat render pertama, markup harus
  // sama persis dengan yang dikirim server.
  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.dataset.theme === "light" ? "light" : "dark");
    if (el.dataset.accent) setAccent(el.dataset.accent);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: preferensi tidak tersimpan, tampilan tetap jalan */
    }
  }

  function applyAccent(name: string) {
    const a = ACCENTS[name] ?? ACCENTS.emerald;
    const el = document.documentElement;
    el.style.setProperty("--accent", a[0]);
    el.style.setProperty("--accent-rgb", a[1]);
    el.dataset.accent = name;
    setAccent(name);
    try {
      localStorage.setItem("accent", name);
    } catch {
      /* idem */
    }
  }

  return (
    <>
      <div className="swatches">
        {Object.entries(ACCENTS).map(([name, [hex]]) => (
          <button
            key={name}
            type="button"
            className={`sw${accent === name ? " on" : ""}`}
            style={{ background: hex }}
            title={`Warna aksen ${name}`}
            aria-label={`Warna aksen ${name}`}
            aria-pressed={accent === name}
            onClick={() => applyAccent(name)}
          />
        ))}
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        title="Ganti tema gelap/terang"
        aria-label="Ganti tema gelap/terang"
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
      </button>
    </>
  );
}
