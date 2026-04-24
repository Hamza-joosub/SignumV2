import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
// Sector + venue display metadata. The API only carries the logical
// `Instrument` key; sector grouping and venue sub-labels live here.
// Coverage tier is surfaced by the API now (per-row `Coverage` field),
// so no client-side COVERAGE map is needed.

const INSTRUMENT_META = {
  'US10Y':      { sector: 'RATES',    label: 'US 10Y',       sub: 'CBOT' },
  '3 Month US': { sector: 'RATES',    label: '3M SOFR',      sub: 'CME' },
  '1 Month US': { sector: 'RATES',    label: '1M SOFR',      sub: 'CME' },
  'SP500':      { sector: 'EQUITIES', label: 'S&P 500',      sub: 'CME' },
  'NASDAQ':     { sector: 'EQUITIES', label: 'Nasdaq 100',   sub: 'CME' },
  'russel':     { sector: 'EQUITIES', label: 'Russell 2000', sub: 'CME + ICE' },
  'GBP':        { sector: 'FX',       label: 'British Pound',sub: 'CME' },
  'YEN':        { sector: 'FX',       label: 'Japanese Yen', sub: 'CME' },
  'CAD':        { sector: 'FX',       label: 'Canadian Dollar', sub: 'CME' },
  'CHF':        { sector: 'FX',       label: 'Swiss Franc',  sub: 'CME' },
  'BTC':        { sector: 'CRYPTO',   label: 'Bitcoin',      sub: 'CME + Coinbase' },
};

const SECTOR_ORDER = ['RATES', 'EQUITIES', 'FX', 'CRYPTO'];
const META_ORDER = Object.keys(INSTRUMENT_META);

// Order: HF first (most tactical — the closest read on speculative sentiment),
// then AM (strategic allocators), then Dealer (passive hedgers of client flow).
// All three buckets carry spread flags per the TFF report.
// Primary view = HF + AM (the two directional views); Dealer is hidden by
// default because it's a passive-hedge context read, not a positioning view.
const CATEGORIES = [
  { key: 'HF',     label: 'Hedge Fund',     header: 'Hedge Fund',  rankKey: 'HF_rank',     chg1WKey: 'HF_chg_pp_1W',     chg1MKey: 'HF_chg_pp_1M',     flagKey: 'HF_spread_flagged',     ratioKey: 'HF_spread_ratio',     spreadRankKey: 'HF_spread_rank' },
  { key: 'AM',     label: 'Asset Manager',  header: 'Asset Mgr',   rankKey: 'AM_rank',     chg1WKey: 'AM_chg_pp_1W',     chg1MKey: 'AM_chg_pp_1M',     flagKey: 'AM_spread_flagged',     ratioKey: 'AM_spread_ratio',     spreadRankKey: 'AM_spread_rank' },
  { key: 'Dealer', label: 'Dealer',         header: 'Dealer',      rankKey: 'Dealer_rank', chg1WKey: 'Dealer_chg_pp_1W', chg1MKey: 'Dealer_chg_pp_1M', flagKey: 'Dealer_spread_flagged', ratioKey: 'Dealer_spread_ratio', spreadRankKey: 'Dealer_spread_rank' },
];

const PRIMARY_CATEGORIES = CATEGORIES.slice(0, 2);

const COV_STYLE = {
  high:     { color: M.green, bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  label: "HIGH COV" },
  moderate: { color: M.amber, bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", label: "MOD COV"  },
  low:      { color: M.red,   bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)",  label: "LOW COV"  },
};

function gridColsFor(n) {
  return `220px repeat(${n}, minmax(100px, 1fr)) minmax(200px, 280px)`;
}

// ── HELPERS ──────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

function rankColor(rank) {
  if (rank == null || Number.isNaN(rank)) return null;
  const r = Math.max(0, Math.min(100, rank));
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

// Below this threshold (in pp of OI) a 1W positioning change reads as
// "sideways" rather than directional. 0.3pp is small enough that any
// meaningful weekly repositioning shows an arrow, but tight enough that
// noise-level moves don't.
const MOMENTUM_FLAT_THRESHOLD_PP = 0.3;

function momentumGlyph(chg1W) {
  if (chg1W == null || Number.isNaN(chg1W)) return null;
  if (Math.abs(chg1W) < MOMENTUM_FLAT_THRESHOLD_PP) return '→';
  return chg1W > 0 ? '↑' : '↓';
}

function fmtPp(v) {
  if (v == null || Number.isNaN(v)) return '--';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}pp`;
}

function fmtPct(v) {
  if (v == null || Number.isNaN(v)) return '--';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

// Sign-based colouring for tooltip values. Finance convention: positive = green,
// negative = red. "Near-zero" gets muted so tiny noise moves don't visually shout.
function signColor(v, flatEps = 0.05) {
  if (v == null || Number.isNaN(v)) return G.text3;
  if (Math.abs(v) < flatEps) return G.text3;
  return v > 0 ? M.green : M.red;
}

// ── NAV ──────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav className="cf-nav" style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", background: G.bgDark, borderBottom: `1px solid ${G.borderDk}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontFamily: M.serif, fontSize: 17, fontWeight: 900, color: G.textInv }}>Kurtopy</span>
          <span className="cf-nav-analytics" style={{ fontFamily: M.mono, fontSize: 8, color: G.textInv3, letterSpacing: "2px", textTransform: "uppercase" }}>Analytics</span>
        </div>
        <span className="cf-nav-breadcrumb" style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, marginLeft: 16, whiteSpace: "nowrap" }}>
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>
          <span
            onClick={() => navigate("/models")}
            style={{ cursor: "pointer", color: G.textInv3, transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = G.textInv}
            onMouseLeave={e => e.currentTarget.style.color = G.textInv3}
          >models</span>
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>
          <span style={{ color: G.textInv2 }}>cot</span>
        </span>
      </div>
      <div className="cf-nav-buttons" style={{ display: "flex", gap: 2 }}>
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
        <div className="cf-nav-search-box" style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.06)", border: `1px solid ${G.borderDk}`,
          borderRadius: 4, padding: "5px 12px",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.textInv3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="cf-nav-search-input" placeholder="Search ticker..." value={q}
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
    <div className="cf-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
      <div>
        <h1 className="cf-title" style={{ fontFamily: M.serif, fontSize: 30, fontWeight: 700, color: G.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Financial Positioning
        </h1>
        <div className="cf-subtitle" style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
          CFTC TFF{count ? ` -- ${count} instruments` : ""}{latestDate ? ` -- report ${latestDate}` : ""} -- percentile ranks vs {lookback}w lookback
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
  const meta = INSTRUMENT_META[inst.Instrument] || { label: inst.Instrument, sub: "" };
  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 0,
      background: rankColor(inst.HF_rank) || G.s2,
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
        <span style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 700, color: "#fff" }}>{inst.HF_rank}</span>
      </div>
    </div>
  );
}

function ExtremesStrip({ data }) {
  const valid = data.filter(d => d.HF_rank != null);
  const byRank = [...valid].sort((a, b) => b.HF_rank - a.HF_rank);
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
    <div className="cf-extremes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
      <Block title="Hedge Funds -- most long" items={mostLong} />
      <Block title="Hedge Funds -- most short" items={mostShort} />
    </div>
  );
}

// ── READING GUIDE ────────────────────────────────────────────────────────

function readingGuide(lookback) {
  return `The number is a percentile rank — how extreme current positioning is vs the last ${lookback} weeks. Calculated as spread-adjusted net position (longs minus shorts) divided by open interest, so it accounts for how large the market is. 100 = more intensely positioned long than any recent point. 0 = most intensely short. 50 = neutral.

**Hedge Funds** — leveraged money, CTAs and systematic traders. The most tactical, reactive group. Closest read on short-term speculative sentiment.

**Asset Managers** — pension funds, insurance, mutual funds, sovereign wealth. Long horizons and structural mandates. Moves here reflect allocation shifts, not tactical bets.

**Dealers** — market makers hedging client flow. Passive counterparty to the rest of the market. An extreme reading is *warehoused risk*, not a directional view.

**Coverage** — how much of institutional positioning is captured by futures in this instrument. HIGH (rates, FX) is a near-complete picture. MODERATE (equities) misses cash / ETF / single-name. LOW (BTC, post-ETF) is mostly basis trades, not sentiment — caveat accordingly.

**OI bar** — how much trading activity there is relative to normal. Extremes in quiet markets are less reliable.

**Yellow triangle** — a lot of the positioning is calendar-spread activity, not directional. Take that reading with a grain of salt.

**Arrow in cell corner** — direction the bucket moved over the last week. ↑ building long, ↓ building short, → sideways. Hover the cell for exact 1W and 1M numbers plus the price change.

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
  const [tipPos, setTipPos] = useState({ x: 0, y: 0, below: false });
  const meta = INSTRUMENT_META[inst.Instrument] || { label: inst.Instrument };
  const rank = inst[category.rankKey];
  const flagged = category.flagKey ? !!inst[category.flagKey] : false;
  const isNull = rank == null || Number.isNaN(rank);
  const bg = rankColor(rank);

  const chg1W = inst[category.chg1WKey];
  const chg1M = inst[category.chg1MKey];
  const glyph = momentumGlyph(chg1W);

  // Place the tooltip relative to the viewport and render it through a portal
  // to document.body — sidesteps every grid/overflow/stacking-context gotcha
  // that was letting the column-header row paint on top of the tooltip.
  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const TOOLTIP_APPROX_HEIGHT = flagged ? 220 : 170;
    const GAP = 8;
    const below = rect.top < TOOLTIP_APPROX_HEIGHT + GAP;
    setTipPos({
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom + GAP : rect.top - GAP,
      below,
    });
    setHov(true);
  };

  const tooltip = hov && createPortal(
    <div style={{
      position: "fixed",
      left: tipPos.x,
      top: tipPos.y,
      transform: `translate(-50%, ${tipPos.below ? '0' : '-100%'})`,
      background: G.bgDark,
      border: `1px solid ${G.border2}`,
      borderRadius: 4,
      padding: "10px 12px",
      fontFamily: M.mono,
      fontSize: 10,
      color: G.text,
      zIndex: 9999,
      pointerEvents: "none",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      minWidth: 220,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{meta.label}</div>
      <div style={{ color: G.text3, marginTop: 3, whiteSpace: "nowrap" }}>{category.label}</div>
      <div style={{ color: G.text2, marginTop: 6, whiteSpace: "nowrap" }}>
        Rank: {isNull ? "n/a" : `${ordinal(rank)} percentile`}
      </div>

      <div style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: `1px solid ${G.border}`,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        columnGap: 10,
        rowGap: 3,
        fontSize: 9.5,
      }}>
        <span style={{ color: G.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>Pos 1W</span>
        <span style={{ color: signColor(chg1W, 0.05), textAlign: "right" }}>{fmtPp(chg1W)}</span>
        <span style={{ color: G.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>Pos 1M</span>
        <span style={{ color: signColor(chg1M, 0.05), textAlign: "right" }}>{fmtPp(chg1M)}</span>
        <span style={{ color: G.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>Price 1W</span>
        <span style={{ color: signColor(inst.price_chg_pct_1W, 0.05), textAlign: "right" }}>{fmtPct(inst.price_chg_pct_1W)}</span>
        <span style={{ color: G.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>Price 1M</span>
        <span style={{ color: signColor(inst.price_chg_pct_1M, 0.05), textAlign: "right" }}>{fmtPct(inst.price_chg_pct_1M)}</span>
      </div>

      {flagged && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${G.border}`,
          color: M.amber,
          fontSize: 9,
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
    </div>,
    document.body
  );

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        background: bg || G.s2,
        borderRadius: 4,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: M.mono,
        color: isNull ? G.text3 : "#fff",
        cursor: "default",
        overflow: "visible",
      }}
    >
      <span style={{
        position: "relative",
        zIndex: 1,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}>{isNull ? "—" : rank}</span>
      {glyph && (
        <span style={{
          position: "relative",
          zIndex: 1,
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 400,
          color: "rgba(255,255,255,0.92)",
          textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          pointerEvents: "none",
          userSelect: "none",
        }}>{glyph}</span>
      )}
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
      {tooltip}
    </div>
  );
}

// ── OI COLUMN ────────────────────────────────────────────────────────────

function OICol({ inst }) {
  const rank = inst.OI_rank;
  const wow = inst.oi_chg_pct_1W;
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

// ── COVERAGE PILL ────────────────────────────────────────────────────────

function CoveragePill({ coverage }) {
  const style = COV_STYLE[coverage];
  if (!style) return null;
  return (
    <span style={{
      display: "inline-block",
      fontFamily: M.mono,
      fontSize: 7.5,
      fontWeight: 500,
      letterSpacing: 0.5,
      color: style.color,
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 2,
      padding: "1px 5px",
      marginLeft: 6,
      verticalAlign: "middle",
    }}>{style.label}</span>
  );
}

// ── GRID ─────────────────────────────────────────────────────────────────

function Row({ inst, categories, gridCols }) {
  const meta = INSTRUMENT_META[inst.Instrument] || { label: inst.Instrument, sub: "" };
  return (
    <div
      className="cf-row"
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        columnGap: 10,
        alignItems: "center",
        padding: "4px 0",
        borderRadius: 4,
      }}
    >
      <div className="cf-label-col" style={{ paddingLeft: 4 }}>
        <div style={{ fontFamily: M.sans, fontSize: 15, color: G.text, fontWeight: 400, letterSpacing: -0.2, display: "flex", alignItems: "center" }}>
          <span>{meta.label}</span>
          <CoveragePill coverage={inst.Coverage} />
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
    <div className="cf-col-headers" style={{
      display: "grid",
      gridTemplateColumns: gridCols,
      columnGap: 10,
      alignItems: "end",
      paddingBottom: 10,
      marginBottom: 8,
      borderBottom: `1px solid ${G.border}`,
    }}>
      <div className="cf-label-col" />
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
    const meta = INSTRUMENT_META[inst.Instrument];
    if (!meta) continue;
    bySector[meta.sector].push(inst);
  }
  for (const s of SECTOR_ORDER) {
    bySector[s].sort((a, b) => META_ORDER.indexOf(a.Instrument) - META_ORDER.indexOf(b.Instrument));
  }

  const innerClass = `cf-grid-inner cf-grid-inner-${categories.length >= 3 ? "all" : "primary"}`;
  const minWidth = categories.length >= 3 ? 820 : 680;

  return (
    <div className="cf-grid-scroll" style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div className={innerClass} style={{ minWidth }}>
        <ColumnHeaders categories={categories} gridCols={gridCols} />
        {SECTOR_ORDER.map(s => <SectorBlock key={s} sector={s} rows={bySector[s]} categories={categories} gridCols={gridCols} />)}
      </div>
    </div>
  );
}

// ── SUMMARY ──────────────────────────────────────────────────────────────

function SummaryPanel({ summary }) {
  const isEmpty = !summary || !summary.trim();
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
      {isEmpty ? (
        <div style={{ fontFamily: M.mono, fontSize: 11, color: G.text3, fontStyle: "italic", lineHeight: 1.6 }}>
          Summary unavailable. The Anthropic call may have failed on the last refresh -- it will be retried on the next run.
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
      HF = Hedge Fund / Leveraged Money (tactical speculators). AM = Asset Manager (strategic allocators: pensions / insurance / SWFs). Dealer = market makers hedging client flow (passive).<br />
      Cell = percentile rank of spread-adjusted Net positioning / Open Interest over the selected lookback window. 0 = most net short, 100 = most net long.<br />
      Yellow corner = spread flag: calendar spread activity unusually elevated (ratio &ge; 75th pct). Hover for detail.<br />
      Coverage pill = how much of real institutional positioning futures capture (HIGH = rates/FX; MOD = equities; LOW = BTC post-ETF).<br />
      OI bar shows OI_rank; bar colour flips at 50. Raw OI is meaningless without context.
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────

export default function COTOverview() {
  const navigate = useNavigate();
  const [lookback, setLookback] = useState(52);
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
    fetch(`${API}/api/cot/overview?lookback=${lookback}`)
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

  const latestDate = data[0]?.Report_Date_as_MM_DD_YYYY;
  const count = data.length;

  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: M.sans }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing: border-box; }
        .cf-grid-scroll::-webkit-scrollbar { height: 4px; }
        .cf-grid-scroll::-webkit-scrollbar-thumb { background: ${G.border2}; border-radius: 2px; }
        .cf-row { background: transparent; transition: background 0.15s; }
        .cf-row:hover { background: ${G.s1}; }
        .cf-label-col { background: ${G.bg}; }
        .cf-row:hover .cf-label-col { background: ${G.s1}; }
        .cf-col-headers .cf-label-col { background: ${G.bg}; }

        @media (max-width: 768px) {
          .cf-main { padding: 20px 16px 48px !important; }
          .cf-header { gap: 14px !important; align-items: flex-start !important; }
          .cf-title { font-size: 24px !important; }
          .cf-subtitle { font-size: 8.5px !important; line-height: 1.5 !important; }
          .cf-extremes { grid-template-columns: 1fr !important; gap: 20px !important; margin-bottom: 28px !important; }
          .cf-grid-inner-primary { min-width: 540px !important; }
          .cf-grid-inner-all { min-width: 660px !important; }
          .cf-label-col {
            position: sticky !important;
            left: 0 !important;
            z-index: 2 !important;
            box-shadow: 6px 0 8px -6px rgba(0,0,0,0.4);
            padding-left: 2px !important;
            padding-right: 6px !important;
          }
          .cf-nav { padding: 0 16px !important; }
          .cf-nav-analytics { display: none !important; }
          .cf-nav-buttons { display: none !important; }
          .cf-nav-search-input { width: 0 !important; padding: 0 !important; transition: width 0.2s; }
          .cf-nav-search-input::placeholder { opacity: 0; }
          .cf-nav-search-box:focus-within .cf-nav-search-input { width: 140px !important; padding: 0 4px !important; }
          .cf-nav-search-box:focus-within .cf-nav-search-input::placeholder { opacity: 1; }
        }

        @media (max-width: 480px) {
          .cf-title { font-size: 22px !important; }
          .cf-grid-inner-primary { min-width: 460px !important; }
          .cf-grid-inner-all { min-width: 560px !important; }
        }
      `}</style>
      <Nav navigate={navigate} />
      <main className="cf-main" style={{ padding: "32px 40px 60px", maxWidth: 1400, margin: "0 auto" }}>
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
