import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { G } from "../styles/tokens";

const API = import.meta.env.VITE_API_URL;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const M = {
  mono: "'DM Mono',monospace",
  sans: "'DM Sans',sans-serif",
  serif: "'Playfair Display',serif",
  green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
  blue: "#60a5fa", purple: "#a78bfa", cyan: "#22d3ee",
};

const BADGE_STYLES = {
  flip:           { color: M.amber, border: "rgba(251,191,36,0.25)" },
  dealer_absent:  { color: M.blue,  border: "rgba(96,165,250,0.25)" },
  dealer_unusual: { color: M.blue,  border: "rgba(96,165,250,0.25)" },
  ratio_extreme:  { color: M.purple,border: "rgba(167,139,250,0.25)" },
  crowding:       { color: M.cyan,  border: "rgba(34,211,238,0.25)" },
  divergence:     { color: M.red,   border: "rgba(239,68,68,0.25)" },
  shift:          { color: M.green, border: "rgba(34,197,94,0.25)" },
};

// ── TERMINAL LOADING SCREEN ─────────────────────────────────────────────

const TERM_LINES = [
  { text: "# initialising COT pipeline", style: "comment", delay: 200 },
  { text: "import yfinance, pandas, numpy", style: "fn", delay: 400 },
  { text: "from services.cot_service import download_cot_data", style: "fn", delay: 600 },
  { text: "", delay: 700 },
  { text: "download_cot_data('combined', years=[2018..2026])", style: "fn", delay: 900, stage: "downloading COT data...", pct: 5 },
  { text: "  Fetching 2018... 2,847 rows", style: "ok", delay: 1200, stage: "fetching 2018...", pct: 15 },
  { text: "  Fetching 2019... 3,102 rows", style: "ok", delay: 1500, stage: "fetching 2019...", pct: 25 },
  { text: "  Fetching 2020... 2,956 rows", style: "ok", delay: 1800, stage: "fetching 2020...", pct: 35 },
  { text: "  Fetching 2021... 3,214 rows", style: "ok", delay: 2050, stage: "fetching 2021...", pct: 42 },
  { text: "  Fetching 2022... 3,048 rows", style: "ok", delay: 2250, stage: "fetching 2022...", pct: 50 },
  { text: "  Fetching 2023... 3,187 rows", style: "ok", delay: 2450, stage: "fetching 2023...", pct: 58 },
  { text: "  Fetching 2024... 3,091 rows", style: "ok", delay: 2650, stage: "fetching 2024...", pct: 66 },
  { text: "  Fetching 2025... 1,612 rows", style: "ok", delay: 2850, stage: "fetching 2025...", pct: 72 },
  { text: "  Fetching 2026... 812 rows", style: "ok", delay: 3000, stage: "fetching 2026...", pct: 76 },
  { text: "clean_financial_cot_data(raw, INSTRUMENT_MAP) -> 10 instruments", style: "dim", delay: 3300, stage: "cleaning & mapping...", pct: 82 },
  { text: "feature_engineering(cot_clean) -> ratios, proportions, crowding", style: "dim", delay: 3600, stage: "feature engineering...", pct: 88 },
  { text: "generate_insights(cot_clean, lookback=104) -> signals", style: "dim", delay: 4000, stage: "generating insights...", pct: 94 },
  { text: "", delay: 4300 },
  { text: "Pipeline complete. Rendering...", style: "ok", delay: 4500, stage: "rendering...", pct: 100 },
];

function LoadingScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("initialising...");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers = TERM_LINES.map((line, i) =>
      setTimeout(() => {
        setVisibleLines(i + 1);
        if (line.pct !== undefined) setPct(line.pct);
        if (line.stage) setStage(line.stage);
      }, line.delay)
    );
    const fadeTimer = setTimeout(() => setFading(true), 4800);
    const doneTimer = setTimeout(onComplete, 5200);
    return () => { timers.forEach(clearTimeout); clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onComplete]);

  const lineColor = (s) => {
    if (s === "comment") return G.text3 || "#555";
    if (s === "fn") return M.blue;
    if (s === "ok") return M.green;
    if (s === "dim") return G.text2 || "#999";
    return G.text || "#ccc";
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: G.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1, transition: "opacity 0.4s",
    }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: M.serif, fontSize: 22, fontWeight: 900, color: G.text }}>Signum</span>
        <span style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, letterSpacing: "2px", textTransform: "uppercase", marginLeft: 6 }}>Analytics</span>
      </div>

      <div style={{ width: 520, background: G.s1, border: `1px solid ${G.border2}`, borderRadius: 4, overflow: "hidden", fontFamily: M.mono, fontSize: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: G.s2, borderBottom: `1px solid ${G.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
          <span style={{ fontSize: 10, color: G.text3, marginLeft: 8 }}>cot_pipeline.py</span>
        </div>
        <div style={{ padding: "14px 16px", height: 280, overflow: "hidden" }}>
          {TERM_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ color: lineColor(line.style), marginBottom: 3, lineHeight: 1.7, whiteSpace: "nowrap" }}>
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 520, marginTop: 16 }}>
        <div style={{ height: 2, background: G.border, borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: M.green, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 6 }}>
          <span>{stage}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ── NAV ─────────────────────────────────────────────────────────────────

function Nav({ navigate, instrument }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", background: G.bgDark, borderBottom: `1px solid ${G.borderDk}`,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontFamily: M.serif, fontSize: 17, fontWeight: 900, color: G.textInv }}>Signum</span>
          <span style={{ fontFamily: M.mono, fontSize: 8, color: G.textInv3, letterSpacing: "2px", textTransform: "uppercase" }}>Analytics</span>
        </div>
        <span style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, marginLeft: 16 }}>
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>models
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>cot
          <span style={{ color: G.borderDk, margin: "0 6px" }}>/</span>
          <span style={{ color: G.textInv2 }}>{instrument}</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {["Overview", "Models", "Markets"].map(label => {
          const active = label === "Models";
          return (
            <button key={label}
              onClick={() => {
                if (label === "Overview") navigate("/");
                if (label === "Models") navigate("/models");
                if (label === "Markets") navigate("/markets");
              }}
              style={{
                padding: "5px 16px", borderRadius: 4, fontSize: 12, fontWeight: 400,
                fontFamily: M.sans,
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
    </nav>
  );
}

// ── CHART TOOLTIP ───────────────────────────────────────────────────────

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: G.bgDark, border: `1px solid ${G.borderDk}`,
      borderRadius: 4, padding: "8px 12px", fontFamily: M.mono, fontSize: 10,
    }}>
      <div style={{ color: G.textInv3, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 1 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
}

// ── FULLSCREEN MODAL ────────────────────────────────────────────────────

function FullscreenModal({ title, subtitle, legend, children, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
    }}
      onClick={onClose}
    >
      <div style={{
        flex: 1, margin: 20, background: G.bg,
        border: `1px solid ${G.border2}`, borderRadius: 6,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${G.border}`, background: G.s1, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: M.mono, fontSize: 12, color: G.text }}>{title}</span>
            {legend && (
              <div style={{ display: "flex", gap: 14, fontFamily: M.mono, fontSize: 10, color: G.text3 }}>
                {legend.map((l, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 3, borderRadius: 1, background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            fontFamily: M.mono, fontSize: 11, color: G.text3, background: "none",
            border: `1px solid ${G.border}`, borderRadius: 3, padding: "4px 12px",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.borderColor = G.border2; }}
            onMouseLeave={e => { e.currentTarget.style.color = G.text3; e.currentTarget.style.borderColor = G.border; }}
          >ESC · close</button>
        </div>
        {subtitle && (
          <div style={{ padding: "10px 20px 0", fontFamily: M.mono, fontSize: 10, color: G.text3, lineHeight: 1.6, flexShrink: 0 }}>
            {subtitle}
          </div>
        )}
        {/* Chart fills remaining space */}
        <div style={{ flex: 1, padding: "16px 20px" }}>
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── CHART BOX ───────────────────────────────────────────────────────────

function ChartBox({ title, subtitle, legend, children, height = 500 }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div style={{ border: `1px solid ${G.border}`, borderRadius: 4, background: G.bg, marginBottom: 10, transition: "border-color 0.2s" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 14px", borderBottom: `1px solid ${G.border}`, background: G.s1,
        }}>
          <span style={{ fontFamily: M.mono, fontSize: 10, color: G.text2 }}>{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {legend && (
              <div style={{ display: "flex", gap: 12, fontFamily: M.mono, fontSize: 9, color: G.text3 }}>
                {legend.map((l, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 3, borderRadius: 1, background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => setFullscreen(true)} style={{
              fontFamily: M.mono, fontSize: 9, color: G.text3, background: "none",
              border: `1px solid ${G.border}`, borderRadius: 2, padding: "2px 8px",
              cursor: "pointer", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.borderColor = G.border2; }}
              onMouseLeave={e => { e.currentTarget.style.color = G.text3; e.currentTarget.style.borderColor = G.border; }}
            >expand</button>
          </div>
        </div>
        {subtitle && (
          <div style={{ padding: "8px 14px 0", fontFamily: M.mono, fontSize: 9, color: G.text3, lineHeight: 1.6 }}>
            {subtitle}
          </div>
        )}
        <div style={{ padding: "12px 8px" }}>
          <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
        </div>
      </div>

      {fullscreen && (
        <FullscreenModal title={title} subtitle={subtitle} legend={legend} onClose={() => setFullscreen(false)}>
          {children}
        </FullscreenModal>
      )}
    </>
  );
}

// ── PROOF CHART RENDERERS ───────────────────────────────────────────────

function DistributionProof({ proof }) {
  if (!proof?.bins) return null;
  const maxH = Math.max(...proof.bins.map(b => b.height));
  const pctl = proof.percentile;
  const isExtreme = pctl > 90 || pctl < 10;
  const caption = `Current value is at the ${pctl.toFixed(0)}th percentile of the past 2 years — ${pctl.toFixed(0)}% of historical readings have been lower, ${(100 - pctl).toFixed(0)}% have been higher.`;

  return (
    <div style={{ padding: "16px 20px", background: G.s1, borderTop: `1px solid ${G.border}` }}>
      <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        {proof.column} · distribution over lookback window
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
        {proof.bins.map((bin, i) => (
          <div key={i} style={{
            flex: 1, height: `${(bin.height / maxH) * 100}%`, minHeight: 2, borderRadius: "2px 2px 0 0",
            background: bin.is_current ? M.amber : M.blue,
            opacity: bin.is_current ? 0.9 : 0.2,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${G.border}` }}>
        <span>p5: {proof.p5.toFixed(2)}</span>
        <span>median: {proof.median.toFixed(2)}</span>
        <span style={{ color: isExtreme ? M.amber : G.text2, fontWeight: 500, fontSize: 10 }}>
          current: {proof.current.toFixed(2)} (p{pctl.toFixed(0)})
        </span>
        <span>p95: {proof.p95.toFixed(2)}</span>
      </div>
      <div style={{ fontFamily: M.sans, fontSize: 11, color: G.text3, lineHeight: 1.7, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${G.border}` }}>
        {caption}
      </div>
    </div>
  );
}

function ProportionBarsProof({ proof }) {
  if (!proof?.longs) return null;
  const dominant_long = proof.longs.dealer >= proof.longs.asset_mgr && proof.longs.dealer >= proof.longs.hedge_fund ? "Dealers" : proof.longs.asset_mgr >= proof.longs.hedge_fund ? "Asset Managers" : "Hedge Funds";
  const dominant_short = proof.shorts.dealer >= proof.shorts.asset_mgr && proof.shorts.dealer >= proof.shorts.hedge_fund ? "Dealers" : proof.shorts.asset_mgr >= proof.shorts.hedge_fund ? "Asset Managers" : "Hedge Funds";

  const renderBar = (data, label) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text2, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", height: 28, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${data.dealer * 100}%`, background: M.blue, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: M.mono, fontSize: 9, color: "rgba(255,255,255,0.9)" }}>{(data.dealer * 100).toFixed(0)}%</span>
        </div>
        <div style={{ width: `${data.asset_mgr * 100}%`, background: M.green, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: M.mono, fontSize: 9, color: "rgba(255,255,255,0.9)" }}>{(data.asset_mgr * 100).toFixed(0)}%</span>
        </div>
        <div style={{ width: `${data.hedge_fund * 100}%`, background: M.amber, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: M.mono, fontSize: 9, color: "rgba(255,255,255,0.9)" }}>{(data.hedge_fund * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ padding: "16px 20px", background: G.s1, borderTop: `1px solid ${G.border}` }}>
      <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        proportion of total open interest · latest week
      </div>
      {renderBar(proof.longs, "LONGS")}
      {renderBar(proof.shorts, "SHORTS")}
      <div style={{ display: "flex", gap: 16, fontFamily: M.mono, fontSize: 8, color: G.text3, marginTop: 8 }}>
        <span><span style={{ display: "inline-block", width: 8, height: 3, background: M.blue, marginRight: 4 }} />dealer</span>
        <span><span style={{ display: "inline-block", width: 8, height: 3, background: M.green, marginRight: 4 }} />asset_mgr</span>
        <span><span style={{ display: "inline-block", width: 8, height: 3, background: M.amber, marginRight: 4 }} />lev_money</span>
      </div>
      <div style={{ fontFamily: M.sans, fontSize: 11, color: G.text3, lineHeight: 1.7, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${G.border}` }}>
        {dominant_long} hold the largest share of longs ({(Math.max(proof.longs.dealer, proof.longs.asset_mgr, proof.longs.hedge_fund) * 100).toFixed(0)}% of OI). {dominant_short} hold the largest share of shorts ({(Math.max(proof.shorts.dealer, proof.shorts.asset_mgr, proof.shorts.hedge_fund) * 100).toFixed(0)}% of OI).
      </div>
    </div>
  );
}

function WeeklyBarsProof({ proof }) {
  if (!proof?.values) return null;
  const max = Math.max(...proof.values);
  const min = Math.min(...proof.values);
  const range = max - min || 1;
  const trending = proof.values.length >= 3 && proof.values[proof.values.length - 1] > proof.values[proof.values.length - 3];
  const direction = proof.delta_prop >= 0 ? "increasing" : "decreasing";

  return (
    <div style={{ padding: "16px 20px", background: G.s1, borderTop: `1px solid ${G.border}` }}>
      <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        {proof.column} · last {proof.values.length} weeks
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
        {proof.values.map((v, i) => {
          const isLast = i === proof.values.length - 1;
          const h = ((v - min) / range) * 80 + 15;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", height: h, borderRadius: "2px 2px 0 0", background: M.green, opacity: isLast ? 0.9 : 0.25 }} />
              <span style={{ fontFamily: M.mono, fontSize: 7, color: isLast ? G.text2 : G.text3, marginTop: 3 }}>{proof.dates[i]}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: M.mono, fontSize: 10, color: M.green, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${G.border}` }}>
        Δ proportion: {proof.delta_prop >= 0 ? "+" : ""}{(proof.delta_prop * 100).toFixed(1)}% of OI · Δ absolute: {proof.delta_abs.toLocaleString()} contracts
      </div>
      <div style={{ fontFamily: M.sans, fontSize: 11, color: G.text3, lineHeight: 1.7, marginTop: 10 }}>
        This group's share of OI {direction === "increasing" ? "rose" : "fell"} by {Math.abs(proof.delta_prop * 100).toFixed(1)} points, alongside a {proof.delta_abs.toLocaleString()} contract change in the same direction. Note: if this group also appears in a shift signal on the opposite side the same week, they may be putting on spread trades or increasing gross exposure rather than taking a directional view.
      </div>
    </div>
  );
}

function BeforeAfterProof({ proof }) {
  if (!proof?.values) return null;
  const max = Math.max(...proof.values.map(Math.abs));
  const flippedTo = proof.curr_val >= 0 ? "net long" : "net short";
  const flippedFrom = proof.prev_val >= 0 ? "net long" : "net short";

  return (
    <div style={{ padding: "16px 20px", background: G.s1, borderTop: `1px solid ${G.border}` }}>
      <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        {proof.column} · {proof.actor} · last {proof.values.length} weeks
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 100 }}>
        {proof.values.map((v, i) => {
          const isLast = i === proof.values.length - 1;
          const isPrev = i === proof.values.length - 2;
          const h = (Math.abs(v) / max) * 80 + 10;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "100%", height: h, borderRadius: 2,
                background: v >= 0 ? M.green : M.red,
                opacity: (isLast || isPrev) ? 0.9 : 0.2,
              }} />
              <span style={{ fontFamily: M.mono, fontSize: 7, color: (isLast || isPrev) ? G.text2 : G.text3, marginTop: 3 }}>
                {proof.dates[i]}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: M.mono, fontSize: 10, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${G.border}`, color: proof.curr_val >= 0 ? M.green : M.red }}>
        {proof.prev_date}: {proof.prev_val.toLocaleString()} -> {proof.curr_date}: {proof.curr_val.toLocaleString()}
      </div>
      <div style={{ fontFamily: M.sans, fontSize: 11, color: G.text3, lineHeight: 1.7, marginTop: 10 }}>
        {proof.actor}'s net position moved from {proof.prev_val.toLocaleString()} ({flippedFrom}) on {proof.prev_date} to {proof.curr_val.toLocaleString()} ({flippedTo}) on {proof.curr_date}. Green bars = net long, red = net short.
      </div>
    </div>
  );
}

function ProofChart({ proof }) {
  if (!proof) return null;
  switch (proof.chart_type) {
    case "distribution": return <DistributionProof proof={proof} />;
    case "proportion_bars": return <ProportionBarsProof proof={proof} />;
    case "weekly_bars": return <WeeklyBarsProof proof={proof} />;
    case "before_after": return <BeforeAfterProof proof={proof} />;
    default: return null;
  }
}

// ── INSIGHT CARD ────────────────────────────────────────────────────────

function InsightCard({ insight }) {
  const badge = BADGE_STYLES[insight.type] || { color: G.text3, border: G.border };
  return (
    <div style={{ border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ padding: "14px 18px" }}>
        <span style={{
          fontFamily: M.mono, fontSize: 8, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase",
          padding: "2px 7px", borderRadius: 2, display: "inline-block", marginBottom: 8,
          color: badge.color, border: `1px solid ${badge.border}`,
        }}>{insight.type.replace("_", " ")}</span>
        <span style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%", marginLeft: 6,
          background: insight.severity === "high" ? M.red : G.text3,
        }} />
        <p style={{ fontSize: 13, color: G.text, lineHeight: 1.7, marginBottom: 6 }}>{insight.text}</p>
      </div>
      <ProofChart proof={insight.proof} />
    </div>
  );
}

// ── DATA EXPLAINER ──────────────────────────────────────────────────────

function DataExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 14 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", cursor: "pointer", border: "none", background: "none", width: "100%", textAlign: "left",
      }}>
        <span style={{ fontFamily: M.mono, fontSize: 10, color: G.text2, display: "flex", alignItems: "center", gap: 8 }}>
          About this data — CFTC Commitments of Traders (COT)
        </span>
        <span style={{ fontFamily: M.mono, fontSize: 10, color: G.text3 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", fontFamily: M.mono, fontSize: 10, lineHeight: 1.9, color: G.text3 }}>
          <p style={{ fontFamily: M.sans, fontSize: 12, fontWeight: 600, color: G.text2, margin: "12px 0 6px" }}>What is the COT report?</p>
          The Commitments of Traders report is published weekly by the CFTC. It breaks down open interest in futures markets by trader category. We use the Traders in Financial Futures (TFF) variant — equity indices, treasuries, currencies, and bitcoin.

          <p style={{ fontFamily: M.sans, fontSize: 12, fontWeight: 600, color: G.text2, margin: "14px 0 6px" }}>Important limitations</p>
          <span style={{ color: M.amber }}>This data covers futures positions only.</span> It does not include OTC swaps, spot market holdings, ETF flows, options books (unless combined report), or internal desk allocations. Large institutions often hold significant positions outside the futures market. For example, a pension fund may appear lightly positioned in futures while holding substantial equity exposure via direct ownership. Use this data as a directional signal of sentiment, not a complete measure of institutional exposure.

          <p style={{ fontFamily: M.sans, fontSize: 12, fontWeight: 600, color: G.text2, margin: "14px 0 6px" }}>Trader categories</p>
          <span style={{ color: M.blue }}>■ Dealers</span> — Banks/broker-dealers. Typically hedge client flow. Short = hedging, not directional.<br />
          <span style={{ color: M.green }}>■ Asset Managers</span> — Pensions, mutuals. Structurally long equities. Gauge of conviction.<br />
          <span style={{ color: M.amber }}>■ Leveraged Money</span> — Hedge funds, CTAs. Most active directional. Extremes often precede reversals.<br />

          <p style={{ fontFamily: M.sans, fontSize: 12, fontWeight: 600, color: G.text2, margin: "14px 0 6px" }}>Variables</p>
          <span style={{ color: G.text2 }}>Net Position</span> = Long − Short · <span style={{ color: G.text2 }}>Ratio</span> = Long ÷ Short · <span style={{ color: G.text2 }}>Proportion</span> = Group ÷ OI · <span style={{ color: G.text2 }}>Crowding</span> = (Long + Short) ÷ OI

          <p style={{ fontFamily: M.sans, fontSize: 12, fontWeight: 600, color: G.text2, margin: "14px 0 6px" }}>Timing</p>
          Positions reflect Tuesday close. Published Friday 3:30 PM ET. Price data aligned to same Tuesday.

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${G.border}`, fontSize: 9 }}>
            Source: CFTC TFF combined · Price: yFinance · Percentile: (series &lt; value).mean() · Shift threshold: &gt;5% OI &amp;&amp; abs Δ confirms
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────

export default function COTPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const instrument = searchParams.get("instrument") || "SP500";

  const [showLoader, setShowLoader] = useState(true);
  const [data, setData] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderDone = useRef(false);

  // Fetch instrument list once
  useEffect(() => {
    fetch(`${API}/api/cot/instruments`).then(r => r.json()).then(d => setInstruments(d.instruments || [])).catch(() => {});
  }, []);

  // Fetch instrument data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/cot/instrument?instrument=${instrument}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setData(null); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [instrument]);

  const switchInstrument = (inst) => {
    setSearchParams({ instrument: inst });
  };

  // ── Date formatter: "2025-04-07" -> "Apr '25" ──
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (d) => {
    const parts = d.split("-");
    return `${MONTHS[parseInt(parts[1], 10) - 1]} '${parts[0].slice(2)}`;
  };
  const fmtDateShort = (d) => {
    const parts = d.split("-");
    return `${parseInt(parts[2], 10)} ${MONTHS[parseInt(parts[1], 10) - 1]}`;
  };

  // ── Build chart data from API response ──
  const mainChartData = data?.main_chart?.dates?.map((d, i) => ({
    date: fmtDate(d),
    dealer: data.main_chart.dealer_net[i],
    am: data.main_chart.am_net[i],
    hf: data.main_chart.hf_net[i],
    price: data.main_chart.price?.[i] ?? null,
  })) || [];

  const hasPrice = mainChartData.some(d => d.price !== null);

  const crowdingData = data?.crowding?.dates?.map((d, i) => ({
    date: fmtDate(d),
    dealer: +(data.crowding.dealer_crowding[i] * 100).toFixed(1),
    am: +(data.crowding.am_crowding[i] * 100).toFixed(1),
    hf: +(data.crowding.hf_crowding[i] * 100).toFixed(1),
    price: data.main_chart?.price?.[i] ?? null,
  })) || [];

  const longDecompData = data?.decomposition?.dates?.slice(-12).map((d, i) => {
    const offset = data.decomposition.dates.length - 12;
    return {
      date: fmtDateShort(d),
      dealer: data.decomposition.dealer_long[offset + i],
      am: data.decomposition.am_long[offset + i],
      hf: data.decomposition.hf_long[offset + i],
      other: data.decomposition.other_long[offset + i],
    };
  }) || [];

  const shortDecompData = data?.decomposition?.dates?.slice(-12).map((d, i) => {
    const offset = data.decomposition.dates.length - 12;
    return {
      date: fmtDateShort(d),
      dealer: data.decomposition.dealer_short[offset + i],
      am: data.decomposition.am_short[offset + i],
      hf: data.decomposition.hf_short[offset + i],
      other: data.decomposition.other_short[offset + i],
    };
  }) || [];

  const LEG = [
    { label: "dealer", color: M.blue },
    { label: "asset_mgr", color: M.green },
    { label: "lev_money", color: M.amber },
    ...(hasPrice ? [{ label: "price (rhs)", color: M.purple }] : []),
  ];

  const DECOMP_LEG = [
    { label: "dealer", color: M.blue },
    { label: "asset_mgr", color: M.green },
    { label: "lev_money", color: M.amber },
    { label: "other", color: "#555" },
  ];

  if (showLoader) {
    return <LoadingScreen onComplete={() => setShowLoader(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: M.sans, color: G.text }}>
      <style>{`
        ${FONT}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::placeholder { color:${G.text3}; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${G.border2}; border-radius:2px; }
      `}</style>

      <Nav navigate={navigate} instrument={instrument} />

      {/* INSTRUMENT BAR */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 4, padding: "10px 20px", flexWrap: "wrap", rowGap: 6,
        background: G.s1, borderBottom: `1px solid ${G.border}`,
      }}>
        <span style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, letterSpacing: 1, textTransform: "uppercase", marginRight: 8, flexShrink: 0 }}>Instrument</span>
        {instruments.map(inst => (
          <button key={inst.instrument} onClick={() => switchInstrument(inst.instrument)} style={{
            fontFamily: M.mono, fontSize: 10, padding: "4px 11px",
            border: `1px solid ${G.border}`, borderRadius: 3,
            background: instrument === inst.instrument ? G.text : "none",
            color: instrument === inst.instrument ? G.bg : G.text3,
            fontWeight: instrument === inst.instrument ? 500 : 400,
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>{inst.instrument}</button>
        ))}
      </div>

      {/* PAGE CONTENT */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 28px" }}>

        {error && <div style={{ padding: 40, color: M.red, fontSize: 12, textAlign: "center", fontFamily: M.mono }}>Failed to load: {error}</div>}
        {loading && !error && <div style={{ padding: 60, color: G.text3, fontSize: 11, textAlign: "center", fontFamily: M.mono }}>Loading COT data...</div>}

        {!loading && !error && data?.summary && (
          <>
            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${G.border}` }}>
              <h1 style={{ fontFamily: M.serif, fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{instrument}</h1>
              <span style={{ fontFamily: M.mono, fontSize: 11, color: G.text3 }}>{data.summary?.ticker}</span>
              <span style={{ fontFamily: M.mono, fontSize: 11, color: G.text3 }}>OI: {data.summary?.open_interest?.toLocaleString()}</span>
              <span style={{ fontFamily: M.mono, fontSize: 11, color: G.text3 }}>report: {data.summary?.latest_date}</span>
            </div>

            {/* DATA EXPLAINER */}
            <DataExplainer />

            {/* RAW STRIP */}
            <div style={{
              background: G.s1, border: `1px solid ${G.border}`, borderRadius: 3,
              padding: "10px 14px", marginBottom: 14,
              fontFamily: M.mono, fontSize: 10, lineHeight: 1.8, overflowX: "auto",
            }}>
              <span style={{ color: G.text3 }}># cot_clean[cot_clean['Instrument'] == '{instrument}'].iloc[-1]</span><br />
              <span style={{ color: G.text3 }}>Dealer_Net</span>: <span style={{ color: data.summary.dealer_net >= 0 ? M.green : M.red }}>{data.summary.dealer_net.toLocaleString()}</span>&nbsp;&nbsp;
              <span style={{ color: G.text3 }}>AM_Net</span>: <span style={{ color: data.summary.am_net >= 0 ? M.green : M.red }}>{data.summary.am_net.toLocaleString()}</span>&nbsp;&nbsp;
              <span style={{ color: G.text3 }}>Lev_Net</span>: <span style={{ color: data.summary.hf_net >= 0 ? M.green : M.red }}>{data.summary.hf_net.toLocaleString()}</span>&nbsp;&nbsp;
              <span style={{ color: G.text3 }}>OI</span>: <span style={{ color: G.text2 }}>{data.summary.open_interest.toLocaleString()}</span>
            </div>

            {/* FUTURES DISCLAIMER */}
            <div style={{
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 3, padding: "10px 14px", marginBottom: 14,
              fontFamily: M.mono, fontSize: 10, lineHeight: 1.7, color: G.text3,
            }}>
              <span style={{ color: M.amber, fontWeight: 500 }}>Futures data only.</span> This report covers regulated futures (and options on futures) positions reported to the CFTC. It does not capture OTC derivatives, spot positions, ETF flows, or internal institutional allocations. The data represents a meaningful but incomplete picture of institutional positioning — treat it as a directional signal, not a complete census.
            </div>

            {/* MAIN CHART: NET POSITIONING */}
            <ChartBox title="net_positioning" legend={LEG} height={500}
              subtitle="Each line = long contracts minus short contracts for that group. When a line is above zero, that group is net long (betting price goes up). When below zero, net long. Watch for crossovers — when hedge funds flip from net short to net long while dealers go the opposite way, it often signals a turning point.">
              <LineChart data={mainChartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} interval={Math.floor(mainChartData.length / 8)} />
                <YAxis yAxisId="left" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                {hasPrice && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => v?.toLocaleString()} />}
                <Tooltip content={<ChartTip />} />
                <ReferenceLine yAxisId="left" y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <Line yAxisId="left" type="monotone" dataKey="dealer" stroke={M.blue} dot={false} strokeWidth={1.2} opacity={0.8} name="Dealer" />
                <Line yAxisId="left" type="monotone" dataKey="am" stroke={M.green} dot={false} strokeWidth={1.2} opacity={0.8} name="Asset Mgr" />
                <Line yAxisId="left" type="monotone" dataKey="hf" stroke={M.amber} dot={false} strokeWidth={1.8} opacity={0.9} name="Hedge Fund" />
                {hasPrice && <Line yAxisId="right" type="monotone" dataKey="price" stroke={M.purple} dot={false} strokeWidth={1} opacity={0.5} strokeDasharray="4 3" name="Price" connectNulls />}
              </LineChart>
            </ChartBox>

            {/* CROWDING */}
            <ChartBox title="crowding (group_OI / total_OI)" legend={LEG} height={380}
              subtitle="Each group's total footprint in the market: (their longs + their shorts) ÷ total OI. High crowding means one group is on both sides of a huge share of trades — concentrated risk. When a group's crowding drops sharply, they're stepping out of the market entirely.">
              <LineChart data={crowdingData}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} interval={Math.floor(crowdingData.length / 6)} />
                <YAxis yAxisId="left" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => `${v}%`} />
                {hasPrice && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => v?.toLocaleString()} />}
                <Tooltip content={<ChartTip />} />
                <Line yAxisId="left" type="monotone" dataKey="dealer" stroke={M.blue} dot={false} strokeWidth={1.2} opacity={0.8} name="Dealer" />
                <Line yAxisId="left" type="monotone" dataKey="am" stroke={M.green} dot={false} strokeWidth={1.2} opacity={0.8} name="Asset Mgr" />
                <Line yAxisId="left" type="monotone" dataKey="hf" stroke={M.amber} dot={false} strokeWidth={1.5} opacity={0.9} name="Hedge Fund" />
                {hasPrice && <Line yAxisId="right" type="monotone" dataKey="price" stroke={M.purple} dot={false} strokeWidth={1} opacity={0.4} strokeDasharray="4 3" name="Price" connectNulls />}
              </LineChart>
            </ChartBox>

            {/* OI DECOMPOSITION — STACKED */}
            {longDecompData.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ChartBox title="OI decomposition — longs" legend={DECOMP_LEG} height={380}
                  subtitle="Who holds the long side. Each bar stacks to 100% of OI. When one colour dominates, that group controls the bullish bet. 'Other' includes smaller reportable traders and non-reportable positions.">
                  <BarChart data={longDecompData} stackOffset="expand">
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fontSize: 7, fontFamily: M.mono, fill: G.text3 }} />
                    <YAxis tick={{ fontSize: 7, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="dealer" stackId="a" fill={M.blue} opacity={0.8} name="Dealer" />
                    <Bar dataKey="am" stackId="a" fill={M.green} opacity={0.8} name="Asset Mgr" />
                    <Bar dataKey="hf" stackId="a" fill={M.amber} opacity={0.8} name="Hedge Fund" />
                    <Bar dataKey="other" stackId="a" fill="#555" opacity={0.5} name="Other/Non-Rept" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartBox>

                <ChartBox title="OI decomposition — shorts" legend={DECOMP_LEG} height={380}
                  subtitle="Who holds the short side. Dealers typically dominate here because they hedge client longs by selling futures. If dealer share drops and hedge fund share rises, the short side is becoming more speculative — a different risk profile.">
                  <BarChart data={shortDecompData} stackOffset="expand">
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fontSize: 7, fontFamily: M.mono, fill: G.text3 }} />
                    <YAxis tick={{ fontSize: 7, fontFamily: M.mono, fill: G.text3 }} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="dealer" stackId="a" fill={M.blue} opacity={0.8} name="Dealer" />
                    <Bar dataKey="am" stackId="a" fill={M.green} opacity={0.8} name="Asset Mgr" />
                    <Bar dataKey="hf" stackId="a" fill={M.amber} opacity={0.8} name="Hedge Fund" />
                    <Bar dataKey="other" stackId="a" fill="#555" opacity={0.5} name="Other/Non-Rept" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartBox>
              </div>
            )}

            {/* ── INSIGHTS WITH PROOF CHARTS ── */}
            {data.insights?.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${G.border}` }}>
                <h2 style={{ fontFamily: M.serif, fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", marginBottom: 4 }}>Generated Insights</h2>
                <p style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, marginBottom: 20 }}>
                  <span style={{ color: M.green }}>&gt;</span> generate_insights(cot_clean, lookback=104).filter(instrument='{instrument}') -&gt; {data.insights.length} signals
                </p>
                {data.insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
              </div>
            )}

            {/* ── RAW TAIL ── */}
            {data.tail?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontFamily: M.mono, fontSize: 10, color: G.text3, marginBottom: 8 }}>
                  <span style={{ color: M.green }}>&gt;</span> cot_clean[cot_clean['Instrument'] == '{instrument}'].tail(5)
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: M.mono, fontSize: 10 }}>
                    <thead>
                      <tr>
                        {Object.keys(data.tail[0]).map(k => (
                          <th key={k} style={{ textAlign: "left", padding: "5px 8px", color: G.text3, fontWeight: 500, borderBottom: `1px solid ${G.border2}`, background: G.s1, whiteSpace: "nowrap" }}>
                            {k.replace("Report_Date_as_MM_DD_YYYY", "date").replace("Open_Interest_All", "OI")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.tail.map((row, i) => {
                        const isLast = i === data.tail.length - 1;
                        return (
                          <tr key={i} style={{ background: isLast ? G.s1 : "none" }}>
                            {Object.entries(row).map(([k, v], j) => {
                              let color = G.text2;
                              if (typeof v === "number" && k.includes("Net")) color = v >= 0 ? M.green : M.red;
                              if (isLast && j === 0) color = M.green;
                              const display = typeof v === "number"
                                ? (Math.abs(v) > 100 ? v.toLocaleString() : v?.toFixed?.(2))
                                : v;
                              return (
                                <td key={j} style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color, whiteSpace: "nowrap" }}>
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SOURCE */}
            <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, padding: "16px 0 24px" }}>
              src: CFTC TFF combined · yfinance · pipeline v0.2 · percentile: (series &lt; value).mean() · shift: &gt;5% OI &amp;&amp; abs Δ confirms
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{
        background: G.bgDarker, borderTop: `1px solid ${G.borderDk}`,
        padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: M.serif, fontSize: 15, fontWeight: 700, color: G.textInv3 }}>Signum</span>
        <span style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, letterSpacing: "0.5px" }}>
          COT data via CFTC · For informational purposes only
        </span>
      </footer>
    </div>
  );
}
