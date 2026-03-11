// ─────────────────────────────────────────────────────────────────────────────
// SIGNUM ANALYTICS — DESIGN TOKENS
// To switch themes: comment out the active block and uncomment the other.
// All pages import { G } from here, so every page updates automatically.
// ─────────────────────────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════
// THEME A — LIGHT  (eggshell + charcoal)
// ═══════════════════════════════════════════════════════════════════════════
/*
export const G = {
  bg: "#f4f1eb",   // eggshell warm white — main page background
  bgDark: "#2b2b28",   // charcoal — nav, dark bands, hover fills
  bgDarker: "#1e1e1c",   // deeper charcoal — footer

  s1: "#ece9e2",   // slightly darker eggshell — section headers, strips
  s2: "#e4e1d9",   // card / input surface

  text: "#1a1a18",   // near-black body text
  text2: "#4a4a45",   // secondary text
  text3: "#8a8a82",   // muted / labels
  text4: "#b8b8b0",   // very muted

  textInv: "#f4f1eb",   // inverted text (on dark surfaces)
  textInv2: "rgba(244,241,235,0.6)",
  textInv3: "rgba(244,241,235,0.35)",

  border: "#d8d5ce",   // main border
  border2: "#ccc9c1",   // stronger border
  borderDk: "#3a3a36",   // border on dark surfaces
  borderDk2: "rgba(255,255,255,0.06)",

  green: "#16a34a",
  red: "#dc2626",
  chart: "#2563eb",
  amber: "#f59e0b",
  teal: "#06ffa5",
  tealDim: "rgba(6,255,165,0.07)",
  tealMid: "rgba(6,255,165,0.13)",
  tealBorder: "rgba(6,255,165,0.25)",
};


 ═══════════════════════════════════════════════════════════════════════════
THEME B — DARK(near - black + off - white)
To activate: comment out Theme A above and uncomment this block
 ═══════════════════════════════════════════════════════════════════════════
*/

export const G = {
  bg: "#0d0d0b",   // near-black — main page background
  bgDark: "#1a1a17",   // slightly lighter dark — nav, dark bands, hover fills
  bgDarker: "#0a0a08",   // deepest — footer

  s1: "#141412",   // card / panel surface
  s2: "#1e1e1a",   // input / inner surface

  text: "#e8e5de",   // warm off-white body text
  text2: "#fff9f0ff",   // secondary text
  text3: "#f0f0dfff",   // muted / labels
  text4: "#f2f2daff",   // very muted

  textInv: "#d3d3c0ff",   // inverted text (on light surfaces — rarely used in dark mode)
  textInv2: "rgba(255, 255, 248, 0.6)",
  textInv3: "rgba(220, 220, 209, 0.35)",

  border: "#252520",   // main border
  border2: "#2e2e28",   // stronger border
  borderDk: "#1e1e1a",   // border on dark surfaces (same as s2)
  borderDk2: "rgba(255,255,255,0.04)",

  green: "#16a34a",
  red: "#dc2626",
  chart: "#2563eb",
  amber: "#f59e0b",
  teal: "#06ffa5",
  tealDim: "rgba(6,255,165,0.06)",
  tealMid: "rgba(6,255,165,0.10)",
  tealBorder: "rgba(6,255,165,0.18)",
};
