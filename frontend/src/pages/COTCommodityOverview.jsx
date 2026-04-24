import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { G } from "../styles/tokens";

const API = import.meta.env.VITE_API_URL;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const M = {
  mono: "'DM Mono',monospace",
  sans: "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
  serif: "'Playfair Display',serif",
  green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
  blue: "#60a5fa", purple: "#a78bfa",
};

// ── META ────────────────────────────────────────────────────────────────
// Sector and venue metadata — the API response only carries the logical
// instrument name, so the mapping lives here on the frontend.

const COMMODITY_META = {
  'Oil_WTI':     { sector: 'ENERGY',            label: 'Oil WTI',      sub: 'NYMEX + ICE' },
  'Oil_Brent':   { sector: 'ENERGY',            label: 'Oil Brent',    sub: 'NYMEX' },
  'Oil_Hedging': { sector: 'ENERGY',            label: 'Oil Hedging',  sub: 'APO + Cal spread' },
  'Nat_Gas':     { sector: 'ENERGY',            label: 'Nat Gas',      sub: 'ICE + NYMEX' },
  'Gold':        { sector: 'METALS',            label: 'Gold',         sub: 'COMEX' },
  'Silver':      { sector: 'METALS',            label: 'Silver',       sub: 'COMEX' },
  'Copper':      { sector: 'METALS',            label: 'Copper',       sub: 'COMEX' },
  'Platinum':    { sector: 'METALS',            label: 'Platinum',     sub: 'NYMEX' },
  'Palladium':   { sector: 'METALS',            label: 'Palladium',    sub: 'NYMEX' },
  'Corn':        { sector: 'GRAINS',            label: 'Corn',         sub: 'CBOT' },
  'Soybean':     { sector: 'GRAINS',            label: 'Soybean',      sub: 'CBOT complex' },
  'Wheat_SRW':   { sector: 'GRAINS',            label: 'Wheat SRW',    sub: 'CBOT' },
  'Wheat_HRW':   { sector: 'GRAINS',            label: 'Wheat HRW',    sub: 'KCBT' },
  'Wheat_HRS':   { sector: 'GRAINS',            label: 'Wheat HRS',    sub: 'MGEX' },
  'Sugar':       { sector: 'SOFTS & LIVESTOCK', label: 'Sugar',        sub: 'ICE No.11' },
  'Coffee':      { sector: 'SOFTS & LIVESTOCK', label: 'Coffee',       sub: 'ICE' },
  'Cocoa':       { sector: 'SOFTS & LIVESTOCK', label: 'Cocoa',        sub: 'ICE' },
  'Cotton':      { sector: 'SOFTS & LIVESTOCK', label: 'Cotton',       sub: 'ICE No.2' },
  'Live Cattle': { sector: 'SOFTS & LIVESTOCK', label: 'Live Cattle',  sub: 'CME' },
};

const SECTOR_ORDER = ['ENERGY', 'METALS', 'GRAINS', 'SOFTS & LIVESTOCK'];
const META_ORDER = Object.keys(COMMODITY_META);

const CATEGORIES = [
  { key: 'MM', label: 'Money Mgr',         header: 'Money Mgr',    rankKey: 'MM_rank', flagKey: 'MM_spread_flagged', ratioKey: 'MM_spread_ratio', spreadRankKey: 'MM_spread_rank' },
  { key: 'PM', label: 'Producer/Merchant', header: 'Prod / Merch', rankKey: 'PM_rank' },
  { key: 'SW', label: 'Swap Dealer',       header: 'Swap Dealer',  rankKey: 'SW_rank', flagKey: 'SW_spread_flagged', ratioKey: 'SW_spread_ratio', spreadRankKey: 'SW_spread_rank' },
  { key: 'OT', label: 'Other Reportable',  header: 'Other Rept',   rankKey: 'OT_rank' },
];

const PRIMARY_CATEGORIES = CATEGORIES.slice(0, 2);

function gridColsFor(n) {
  return `220px repeat(${n}, minmax(100px, 1fr)) minmax(200px, 280px)`;
}

// ── HELPERS ──────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function rankColor(rank) {
  if (rank == null || Number.isNaN(rank)) return null;
  const r = Math.max(0, Math.min(100, rank));
  // Two-segment interpolation: red → dark neutral → green
  if (r <= 50) {
    const t = r / 50;
    return `rgb(${Math.round(lerp(220, 28, t))}, ${Math.round(lerp(40, 48, t))}, ${Math.round(lerp(45, 50, t))})`;
  }
  const t = (r - 50) / 50;
  return `rgb(${Math.round(lerp(28, 34, t))}, ${Math.round(lerp(48, 197, t))}, ${Math.round(lerp(50, 94, t))})`;
}

function ordinal(n) {
  if (n == null || Number.isNaN(n)) return "--";
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const last = n % 10;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
}

function fmtWow(wow) {
  if (wow == null || Number.isNaN(wow)) return { text: '--', color: G.text3 };
  const abs = Math.abs(wow);
  if (abs < 0.5) return { text: 'flat', color: G.text3 };
  const sign = wow > 0 ? '+' : '';
  return {
    text: `${sign}${Math.round(wow)}%`,
    color: wow > 0 ? M.green : M.red,
  };
}

// ── NAV ──────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav className="cc-nav" style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", background: G.bgDark, borderBottom: `1px solid ${G.borderDk}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontFamily: M.serif, fontSize: 17, fontWeight: 900, color: G.textInv }}>Kurtopy</span>
          <span className="cc-nav-analytics" style={{ fontFamily: M.mono, fontSize: 8, color: G.textInv3, letterSpacing: "2px", textTransform: "uppercase" }}>Analytics</span>
        </div>
        <span className="cc-nav-breadcrumb" style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, marginLeft: 16, whiteSpace: "nowrap" }}>
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>
          <span
            onClick={() => navigate("/models")}
            style={{ cursor: "pointer", color: G.textInv3, transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = G.textInv}
            onMouseLeave={e => e.currentTarget.style.color = G.textInv3}
          >models</span>
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>
          <span style={{ color: G.textInv2 }}>cot-commodity</span>
        </span>
      </div>
      <div className="cc-nav-buttons" style={{ display: "flex", gap: 2 }}>
        {["Overview", "Models", "Markets"].map(label => {
          const active = label === "Models";
          return (
            <button key={label}
              onClick={() => { if (label === "Overview") navigate("/"); if (label === "Models") navigate("/models"); if (label === "Markets") navigate("/markets"); }}
              style={{
                padding: "5px 16px", borderRadius: 4, fontSize: 12, fontWeight: 400, fontFamily: M.sans,
                color: active ? G.textInv : G.textInv2,
                background: active ? "rgba(255,255,255,0.1)" : "none",
                border: "none", cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = G.textInv; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = G.textInv2; }}
            >{label}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="cc-nav-search-box" style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.06)", border: `1px solid ${G.borderDk}`,
          borderRadius: 4, padding: "5px 12px",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.textInv3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="cc-nav-search-input" placeholder="Search ticker..." value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && q.trim()) { navigate(`/markets/instrument/${q.trim()}`); setQ(""); } }}
            style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: G.textInv, width: 110, fontFamily: M.mono }}
          />
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: G.textInv, cursor: "pointer",
        }}>H</div>
      </div>
    </nav>
  );
}

// ── HEADER ───────────────────────────────────────────────────────────────

function PillToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4, padding: 2 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              fontFamily: M.mono,
              fontSize: 10,
              color: active ? G.text : G.text3,
              background: active ? G.s2 : "transparent",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: 0.5,
            }}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

function Header({ lookback, setLookback, showAllBuckets, setShowAllBuckets, latestDate, count }) {
  return (
    <div className="cc-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
      <div>
        <h1 className="cc-title" style={{ fontFamily: M.serif, fontSize: 30, fontWeight: 700, color: G.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Commodity Positioning
        </h1>
        <div className="cc-subtitle" style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
          CFTC Disaggregated{count ? ` -- ${count} commodities` : ""}{latestDate ? ` -- report ${latestDate}` : ""} -- percentile ranks vs {lookback}w lookback
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <PillToggle
          options={[{ value: false, label: "Primary" }, { value: true, label: "All" }]}
          value={showAllBuckets}
          onChange={setShowAllBuckets}
        />
        <PillToggle
          options={[13, 26, 52].map(lb => ({ value: lb, label: `${lb}w` }))}
          value={lookback}
          onChange={setLookback}
        />
      </div>
    </div>
  );
}

// ── EXTREMES STRIP ───────────────────────────────────────────────────────

function ExtremeCard({ inst }) {
  const meta = COMMODITY_META[inst.Instrument] || { label: inst.Instrument, sub: "" };
  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 0,
      background: rankColor(inst.MM_rank) || G.s2,
      borderRadius: 4,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontFamily: M.mono, fontSize: 8, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {meta.sub}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: M.sans, fontSize: 14, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</span>
        <span style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, color: "#fff" }}>{inst.MM_rank}</span>
      </div>
    </div>
  );
}

function ExtremesStrip({ data }) {
  const valid = data.filter(d => d.MM_rank != null);
  const byRank = [...valid].sort((a, b) => b.MM_rank - a.MM_rank);
  const mostLong = byRank.slice(0, 3);
  const mostShort = byRank.slice(-3).reverse();

  const Block = ({ title, items }) => (
    <div>
      <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {items.map(inst => <ExtremeCard key={inst.Instrument} inst={inst} />)}
      </div>
    </div>
  );

  return (
    <div className="cc-extremes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
      <Block title="Money Managers -- most long" items={mostLong} />
      <Block title="Money Managers -- most short" items={mostShort} />
    </div>
  );
}

// ── READING GUIDE ────────────────────────────────────────────────────────

function readingGuide(lookback) {
  return `The number is a percentile rank — how extreme current positioning is vs the last ${lookback} weeks. Calculated as net position (longs minus shorts) divided by open interest, so it accounts for how large the market is. 100 = more intensely positioned long than any recent point. 0 = most intensely short. 50 = neutral.

**Money Managers** — hedge funds and large speculators. Where the smart money is positioned.

**Prod/Merc** — the farmers, miners and refiners who actually use these commodities. They hedge the opposite side. When they agree with Money Managers, something significant is happening.

**OI bar** — how much trading activity there is relative to normal. Extremes in quiet markets are less reliable.

**Yellow triangle** — a lot of the positioning is from traders betting on price differences between delivery dates, not on price direction. Take that reading with a grain of salt.

**13w / 26w / 52w** — how far back to compare. Short = what's happening now. Long = the bigger picture.`;
}

function ReadingGuide({ lookback }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      marginBottom: 36,
      background: G.s1,
      border: `1px solid ${G.border}`,
      borderRadius: 4,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontFamily: M.mono,
          fontSize: 10,
          color: G.text2,
          letterSpacing: 1,
          textTransform: "uppercase",
          textAlign: "left",
        }}
      >
        <span>How to read this</span>
        <span style={{ fontSize: 10, color: G.text3, lineHeight: 1 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={{
          padding: "4px 18px 18px",
          fontFamily: M.sans,
          fontSize: 12.5,
          color: G.text2,
          lineHeight: 1.7,
          borderTop: `1px solid ${G.border}`,
        }}>
          <ReactMarkdown components={{
            p: ({ children }) => <p style={{ margin: "10px 0" }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color: G.text, fontWeight: 500 }}>{children}</strong>,
          }}>{readingGuide(lookback)}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ── RANK CELL ────────────────────────────────────────────────────────────

function RankCell({ inst, category }) {
  const [hov, setHov] = useState(false);
  const meta = COMMODITY_META[inst.Instrument] || { label: inst.Instrument };
  const rank = inst[category.rankKey];
  const flagged = category.flagKey ? !!inst[category.flagKey] : false;
  const isNull = rank == null || Number.isNaN(rank);
  const bg = rankColor(rank);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        background: bg || G.s2,
        borderRadius: 4,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: M.mono,
        fontSize: 13,
        fontWeight: 600,
        color: isNull ? G.text3 : "#fff",
        cursor: "default",
        overflow: "visible",
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>{isNull ? "—" : rank}</span>
      {flagged && (
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          width: 0, height: 0,
          borderLeft: "12px solid transparent",
          borderTop: "12px solid #f59e0b",
          borderTopRightRadius: 4,
          pointerEvents: "none",
        }} />
      )}
      {hov && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: G.bgDark,
          border: `1px solid ${G.border2}`,
          borderRadius: 4,
          padding: "8px 12px",
          fontFamily: M.mono,
          fontSize: 10,
          color: G.text,
          whiteSpace: "nowrap",
          zIndex: 10,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          minWidth: 200,
        }}>
          <div style={{ fontSize: 11, fontWeight: 500 }}>{meta.label}</div>
          <div style={{ color: G.text3, marginTop: 3 }}>{category.label}</div>
          <div style={{ color: G.text2, marginTop: 6 }}>
            Rank: {isNull ? "n/a" : `${ordinal(rank)} percentile`}
          </div>
          {flagged && (
            <div style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${G.border}`,
              color: M.amber,
              fontSize: 9,
              whiteSpace: "normal",
              lineHeight: 1.5,
              maxWidth: 240,
            }}>
              <div style={{ fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>spread flag</div>
              <div style={{ color: G.text2, marginTop: 3 }}>
                ratio {inst[category.ratioKey]?.toFixed(3)} -- {ordinal(inst[category.spreadRankKey])} pct
              </div>
              <div style={{ color: G.text3, marginTop: 4 }}>
                Positioning reading may be inflated by calendar spread activity rather than pure directional conviction.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── OI COLUMN ────────────────────────────────────────────────────────────

function OICol({ inst }) {
  const rank = inst.OI_rank;
  const wow = inst.OI_wow;
  const isNull = rank == null || Number.isNaN(rank);
  const r = isNull ? 0 : Math.max(0, Math.min(100, rank));
  const barColor = r >= 50 ? M.green : M.red;
  const wowFmt = fmtWow(wow);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 54px", alignItems: "center", columnGap: 12, paddingLeft: 20 }}>
      <div style={{
        height: 4,
        background: G.s2,
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: isNull ? "0%" : `${r}%`,
          background: barColor,
          borderRadius: 2,
          transition: "width 0.3s",
        }} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: M.mono, fontSize: 10, color: G.text3, lineHeight: 1.3 }}>
          {isNull ? "--" : ordinal(r)}
        </div>
        <div style={{ fontFamily: M.mono, fontSize: 13, fontWeight: 500, color: wowFmt.color, lineHeight: 1.3, marginTop: 2 }}>
          {wowFmt.text}
        </div>
      </div>
    </div>
  );
}

// ── GRID ─────────────────────────────────────────────────────────────────

function Row({ inst, categories, gridCols }) {
  const meta = COMMODITY_META[inst.Instrument] || { label: inst.Instrument, sub: "" };
  return (
    <div
      className="cc-row"
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        columnGap: 10,
        alignItems: "center",
        padding: "4px 0",
        borderRadius: 4,
      }}
    >
      <div className="cc-label-col" style={{ paddingLeft: 4 }}>
        <div style={{ fontFamily: M.sans, fontSize: 15, color: G.text, fontWeight: 400, letterSpacing: -0.2 }}>
          {meta.label}
        </div>
        <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 3, letterSpacing: 0.3, textTransform: "uppercase" }}>
          {meta.sub}
        </div>
      </div>
      {categories.map(cat => (
        <RankCell key={cat.key} inst={inst} category={cat} />
      ))}
      <OICol inst={inst} />
    </div>
  );
}

function SectorBlock({ sector, rows, categories, gridCols }) {
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, textTransform: "uppercase", letterSpacing: 1.2 }}>
          {sector}
        </div>
        <div style={{ flex: 1, height: 1, background: G.border }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(inst => <Row key={inst.Instrument} inst={inst} categories={categories} gridCols={gridCols} />)}
      </div>
    </div>
  );
}

function ColumnHeaders({ categories, gridCols }) {
  const headerCell = {
    fontFamily: M.mono,
    fontSize: 9,
    color: G.text3,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    padding: "2px 0",
  };
  return (
    <div className="cc-col-headers" style={{
      display: "grid",
      gridTemplateColumns: gridCols,
      columnGap: 10,
      alignItems: "end",
      paddingBottom: 10,
      marginBottom: 8,
      borderBottom: `1px solid ${G.border}`,
    }}>
      <div className="cc-label-col" />
      {categories.map(cat => (
        <div key={cat.key} style={headerCell}>{cat.header}</div>
      ))}
      <div style={{ ...headerCell, textAlign: "left", paddingLeft: 20 }}>Open Interest</div>
    </div>
  );
}

function Grid({ data, categories, gridCols }) {
  const bySector = {};
  for (const s of SECTOR_ORDER) bySector[s] = [];
  for (const inst of data) {
    const meta = COMMODITY_META[inst.Instrument];
    if (!meta) continue;
    bySector[meta.sector].push(inst);
  }
  for (const s of SECTOR_ORDER) {
    bySector[s].sort((a, b) => META_ORDER.indexOf(a.Instrument) - META_ORDER.indexOf(b.Instrument));
  }

  const minWidth = categories.length >= 4 ? 940 : 720;
  const innerClass = `cc-grid-inner cc-grid-inner-${categories.length >= 4 ? "all" : "primary"}`;

  return (
    <div className="cc-grid-scroll" style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div className={innerClass} style={{ minWidth }}>
        <ColumnHeaders categories={categories} gridCols={gridCols} />
        {SECTOR_ORDER.map(s => <SectorBlock key={s} sector={s} rows={bySector[s]} categories={categories} gridCols={gridCols} />)}
      </div>
    </div>
  );
}

// ── SUMMARY ──────────────────────────────────────────────────────────────

const PLACEHOLDER_SUMMARY = "temp summary of cot-commodity-data";

function SummaryPanel({ summary }) {
  const isPlaceholder = !summary || summary.trim() === PLACEHOLDER_SUMMARY;
  return (
    <div style={{ marginTop: 40, padding: 20, background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, textTransform: "uppercase", letterSpacing: 1 }}>
          AI Positioning Note
        </div>
        <span style={{
          fontFamily: M.mono, fontSize: 8,
          padding: "2px 7px",
          background: "rgba(167,139,250,0.1)",
          color: M.purple,
          border: `1px solid rgba(167,139,250,0.25)`,
          borderRadius: 2,
          letterSpacing: 0.5,
          textTransform: "lowercase",
        }}>claude sonnet</span>
      </div>
      {isPlaceholder ? (
        <div style={{ fontFamily: M.mono, fontSize: 11, color: G.text3, fontStyle: "italic", lineHeight: 1.6 }}>
          Commodity-specific positioning narrative will appear here once the LLM summary is wired. The backend currently returns placeholder text.
        </div>
      ) : (
        <div style={{ fontFamily: M.sans, fontSize: 13, color: G.text, lineHeight: 1.7 }}>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
      <div style={{ marginTop: 14, padding: "8px 12px", background: G.s2, borderRadius: 3, fontFamily: M.mono, fontSize: 9, color: G.text3, lineHeight: 1.6 }}>
        Generated by AI. May contain errors or misinterpretations. Descriptive only -- not investment advice.
      </div>
    </div>
  );
}

// ── FOOTNOTE ─────────────────────────────────────────────────────────────

function Footnote() {
  return (
    <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${G.border}`, fontFamily: M.mono, fontSize: 9, color: G.text3, lineHeight: 1.8 }}>
      MM = Money Manager (hedge funds / CTAs). PM = Producer / Merchant (physical hedgers). SW = Swap Dealer (banks hedging OTC). OT = Other Reportable.<br />
      Cell = percentile rank of Net positioning / Open Interest over the selected lookback window. 0 = most net short, 100 = most net long.<br />
      Yellow corner = spread flag: calendar spread activity unusually elevated (ratio &ge; 75th pct). Hover for detail.<br />
      OI bar shows OI_rank; bar colour flips at 50. Raw OI is meaningless without context.
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────

export default function COTCommodityOverview() {
  const navigate = useNavigate();
  const [lookback, setLookback] = useState(26);
  const [showAllBuckets, setShowAllBuckets] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeCategories = showAllBuckets ? CATEGORIES : PRIMARY_CATEGORIES;
  const gridCols = gridColsFor(activeCategories.length);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/commodity_cot/overview?lookback=${lookback}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(res => {
        if (cancelled) return;
        setData(res.instruments || []);
        setSummary(res.summary || "");
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lookback]);

  const latestDate = data[0]?.['Report_Date_as_YYYY-MM-DD'];
  const count = data.length;

  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: M.sans }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing: border-box; }
        .cc-grid-scroll::-webkit-scrollbar { height: 4px; }
        .cc-grid-scroll::-webkit-scrollbar-thumb { background: ${G.border2}; border-radius: 2px; }
        .cc-row { background: transparent; transition: background 0.15s; }
        .cc-row:hover { background: ${G.s1}; }
        .cc-label-col { background: ${G.bg}; }
        .cc-row:hover .cc-label-col { background: ${G.s1}; }
        .cc-col-headers .cc-label-col { background: ${G.bg}; }

        @media (max-width: 768px) {
          .cc-main { padding: 20px 16px 48px !important; }
          .cc-header { gap: 14px !important; align-items: flex-start !important; }
          .cc-title { font-size: 24px !important; }
          .cc-subtitle { font-size: 8.5px !important; line-height: 1.5 !important; }
          .cc-extremes { grid-template-columns: 1fr !important; gap: 20px !important; margin-bottom: 28px !important; }
          .cc-grid-inner-primary { min-width: 540px !important; }
          .cc-grid-inner-all { min-width: 760px !important; }
          .cc-label-col {
            position: sticky !important;
            left: 0 !important;
            z-index: 2 !important;
            box-shadow: 6px 0 8px -6px rgba(0,0,0,0.4);
            padding-left: 2px !important;
            padding-right: 6px !important;
          }
          .cc-nav { padding: 0 16px !important; }
          .cc-nav-analytics { display: none !important; }
          .cc-nav-buttons { display: none !important; }
          .cc-nav-search-input { width: 0 !important; padding: 0 !important; transition: width 0.2s; }
          .cc-nav-search-input::placeholder { opacity: 0; }
          .cc-nav-search-box:focus-within .cc-nav-search-input { width: 140px !important; padding: 0 4px !important; }
          .cc-nav-search-box:focus-within .cc-nav-search-input::placeholder { opacity: 1; }
        }

        @media (max-width: 480px) {
          .cc-title { font-size: 22px !important; }
          .cc-grid-inner-primary { min-width: 460px !important; }
          .cc-grid-inner-all { min-width: 660px !important; }
        }
      `}</style>
      <Nav navigate={navigate} />
      <main className="cc-main" style={{ padding: "32px 40px 60px", maxWidth: 1400, margin: "0 auto" }}>
        <Header
          lookback={lookback}
          setLookback={setLookback}
          showAllBuckets={showAllBuckets}
          setShowAllBuckets={setShowAllBuckets}
          latestDate={latestDate}
          count={count}
        />
        {loading && (
          <div style={{ fontFamily: M.mono, fontSize: 11, color: G.text3, padding: "40px 0" }}>
            loading positioning data...
          </div>
        )}
        {error && !loading && (
          <div style={{ fontFamily: M.mono, fontSize: 11, color: M.red, padding: "40px 0" }}>
            error: {error}
          </div>
        )}
        {!loading && !error && data.length > 0 && (
          <>
            <ExtremesStrip data={data} />
            <ReadingGuide lookback={lookback} />
            <Grid data={data} categories={activeCategories} gridCols={gridCols} />
            <Footnote />
            <SummaryPanel summary={summary} />
          </>
        )}
        {!loading && !error && data.length === 0 && (
          <div style={{ fontFamily: M.mono, fontSize: 11, color: G.text3, padding: "40px 0" }}>
            No instruments returned. Boot refresh may still be running -- check back shortly.
          </div>
        )}
      </main>
    </div>
  );
}
