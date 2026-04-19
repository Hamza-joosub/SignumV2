import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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

const COVERAGE = {
  'US10Y': 'high', '1 Month US': 'high', '3 Month US': 'high',
  'GBP': 'high', 'YEN': 'high', 'CAD': 'high', 'CHF': 'high',
  'SP500': 'moderate', 'NASDAQ': 'moderate', 'russel': 'moderate',
  'BTC': 'low',
};
const COV_ORDER = { high: 0, moderate: 1, low: 2 };
const COV_STYLE = {
  high: { color: M.green, bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
  moderate: { color: M.amber, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  low: { color: M.red, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

// ── LOADING SCREEN ──────────────────────────────────────────────────────

const TERM_LINES = [
  { text: "# initialising COT overview", style: "comment", delay: 200 },
  { text: "from services.cot_service import compute_overview", style: "fn", delay: 500 },
  { text: "", delay: 600 },
  { text: "loading cot_clean.csv", style: "fn", delay: 800, stage: "loading processed data...", pct: 10 },
  { text: "  12 instruments, 4,200 rows", style: "ok", delay: 1200, pct: 25 },
  { text: "computing percentile ranks (104w lookback)", style: "fn", delay: 1600, stage: "computing percentiles...", pct: 40 },
  { text: "computing 1W and 1M changes", style: "fn", delay: 2200, stage: "computing changes...", pct: 55 },
  { text: "computing concentration metrics", style: "fn", delay: 2800, stage: "concentration...", pct: 70 },
  { text: "aligning price data", style: "fn", delay: 3200, stage: "aligning prices...", pct: 82 },
  { text: "generating report summary", style: "fn", delay: 3800, stage: "generating report...", pct: 92 },
  { text: "", delay: 4200 },
  { text: "Overview ready. Rendering...", style: "ok", delay: 4500, stage: "rendering...", pct: 100 },
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
    return G.text || "#ccc";
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: G.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1, transition: "opacity 0.4s",
    }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: M.serif, fontSize: 22, fontWeight: 900, color: G.text }}>Kurtopy</span>
        <span style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, letterSpacing: "2px", textTransform: "uppercase", marginLeft: 6 }}>Analytics</span>
      </div>
      <div style={{ width: "min(480px, 92vw)", background: G.s1, border: `1px solid ${G.border2}`, borderRadius: 4, overflow: "hidden", fontFamily: M.mono, fontSize: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: G.s2, borderBottom: `1px solid ${G.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
          <span style={{ fontSize: 10, color: G.text3, marginLeft: 8 }}>compute_overview.py</span>
        </div>
        <div style={{ padding: "14px 16px", height: 220, overflow: "hidden" }}>
          {TERM_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ color: lineColor(line.style), marginBottom: 3, lineHeight: 1.7, whiteSpace: "nowrap" }}>{line.text || "\u00A0"}</div>
          ))}
        </div>
      </div>
      <div style={{ width: "min(480px, 92vw)", marginTop: 16 }}>
        <div style={{ height: 2, background: G.border, borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: M.green, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 6 }}>
          <span>{stage}</span><span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ── NAV ─────────────────────────────────────────────────────────────────

function Nav({ navigate }) {
  const [q, setQ] = useState("");
  return (
    <nav className="cot-nav" style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", background: G.bgDark, borderBottom: `1px solid ${G.borderDk}`,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontFamily: M.serif, fontSize: 17, fontWeight: 900, color: G.textInv }}>Kurtopy</span>
          <span className="nav-analytics" style={{ fontFamily: M.mono, fontSize: 8, color: G.textInv3, letterSpacing: "2px", textTransform: "uppercase" }}>Analytics</span>
        </div>
        <span className="cot-breadcrumb" style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, marginLeft: 16 }}>
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
      <div className="cot-nav-links" style={{ display: "flex", gap: 2 }}>
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
        <div className="nav-search-box" style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.06)", border: `1px solid ${G.borderDk}`,
          borderRadius: 4, padding: "5px 12px",
        }}>
          <label htmlFor="nav-search-input" style={{ display: "flex", alignItems: "center", cursor: "pointer", color: G.textInv3 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </label>
          <input id="nav-search-input" className="nav-search-input" placeholder="Search ticker..." value={q}
            onChange={e => setQ(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter" && q.trim()) { navigate(`/markets/instrument/${q.trim()}`); setQ(""); } }}
            style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: G.textInv, width: 110, fontFamily: M.mono }}
          />
        </div>
        <div className="nav-avatar" style={{
          width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: G.textInv, cursor: "pointer",
        }}>H</div>
      </div>
    </nav>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────

function pctlToX(p) { return 3 + (Math.max(0, Math.min(100, p)) / 100) * 94; }
function pctlColor(p) { if (p >= 80) return M.green; if (p <= 20) return M.red; if (p >= 60) return "rgba(34,197,94,0.5)"; if (p <= 40) return "rgba(239,68,68,0.5)"; return G.text3; }
function fmtNet(n) { if (n == null) return "--"; const a = Math.abs(n); if (a >= 1e6) return `${n >= 0 ? "+" : ""}${(n / 1e6).toFixed(2)}M`; if (a >= 1e3) return `${n >= 0 ? "+" : ""}${(n / 1e3).toFixed(0)}k`; return `${n >= 0 ? "+" : ""}${n}`; }
function fmtPct(v) { if (v == null) return "--"; return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`; }
function fmtPctOI(v) { if (v == null) return "--"; return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}pp`; }

// ── POSITIONING STRIP ───────────────────────────────────────────────────

function PositioningStrip({ inst, tf, onClick, showDealer }) {
  const [hov, setHov] = useState(false);
  const dlr = inst.dealer_pctl, am = inst.am_pctl, hf = inst.hf_pctl;
  const oiChg = tf === "1W" ? inst.oi_chg_pct_1W : inst.oi_chg_pct_1M;
  const priceChg = tf === "1W" ? inst.price_chg_pct_1W : inst.price_chg_pct_1M;

  return (
    <div onClick={() => onClick(inst.instrument)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="cot-strip"
      style={{ display: "grid", gridTemplateColumns: "130px 1fr 160px", alignItems: "center", padding: "14px 20px", cursor: "pointer", background: hov ? G.s1 : "transparent", borderBottom: `1px solid ${G.border}`, transition: "background 0.15s" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="cot-strip-label" style={{ fontFamily: M.mono, fontSize: 12, fontWeight: 500, color: G.text }}>{inst.instrument}</span>
          {(() => {
            const cov = COVERAGE[inst.instrument] || 'low'; const s = COV_STYLE[cov]; return (
              <span className="cot-strip-coverage" style={{ fontFamily: M.mono, fontSize: 7, padding: "1px 5px", borderRadius: 2, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: 0.3 }}>{cov}</span>
            );
          })()}
        </div>
        <div className="cot-strip-ticker" style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, marginTop: 2 }}>{inst.ticker}</div>
      </div>
      <div style={{ position: "relative", height: 32, margin: "0 16px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: `linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 20%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.02) 60%, rgba(34,197,94,0.05) 80%, rgba(34,197,94,0.15) 100%)`, border: `1px solid ${G.border}` }} />
        <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 1, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", left: "18%", top: 2, bottom: 2, width: 1, borderLeft: "1px dashed rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", left: "82%", top: 2, bottom: 2, width: 1, borderLeft: "1px dashed rgba(255,255,255,0.06)" }} />
        {showDealer && <div style={{ position: "absolute", left: `${pctlToX(dlr)}%`, top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: M.blue, border: "2px solid rgba(0,0,0,0.4)", boxShadow: hov ? `0 0 6px ${M.blue}` : "none", transition: "box-shadow 0.2s", zIndex: 3 }} />}
        <div style={{ position: "absolute", left: `${pctlToX(am)}%`, top: "calc(50% - 6px)", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: M.green, border: "2px solid rgba(0,0,0,0.4)", boxShadow: hov ? `0 0 6px ${M.green}` : "none", transition: "box-shadow 0.2s", zIndex: 3 }} />
        <div style={{ position: "absolute", left: `${pctlToX(hf)}%`, top: "calc(50% + 6px)", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: M.amber, border: "2px solid rgba(0,0,0,0.4)", boxShadow: hov ? `0 0 6px ${M.amber}` : "none", transition: "box-shadow 0.2s", zIndex: 3 }} />
        {hov && (<>
          <span style={{ position: "absolute", left: 4, bottom: -14, fontFamily: M.mono, fontSize: 7, color: G.text3 }}>stretched short</span>
          <span style={{ position: "absolute", right: 4, bottom: -14, fontFamily: M.mono, fontSize: 7, color: G.text3 }}>stretched long</span>
          {showDealer && <span style={{ position: "absolute", left: `${pctlToX(dlr)}%`, top: -12, transform: "translateX(-50%)", fontFamily: M.mono, fontSize: 7, color: M.blue }}>p{dlr.toFixed(0)}</span>}
          <span style={{ position: "absolute", left: `${pctlToX(am)}%`, top: -12, transform: "translateX(-50%)", fontFamily: M.mono, fontSize: 7, color: M.green }}>p{am.toFixed(0)}</span>
          <span style={{ position: "absolute", left: `${pctlToX(hf)}%`, top: -12, transform: "translateX(-50%)", fontFamily: M.mono, fontSize: 7, color: M.amber }}>p{hf.toFixed(0)}</span>
        </>)}
      </div>
      <div className="cot-strip-stats" style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: M.mono, fontSize: 9 }}>
        <div style={{ textAlign: "right" }}><div style={{ color: G.text3, fontSize: 7, marginBottom: 2 }}>OI chg</div><div style={{ color: oiChg >= 0 ? M.green : M.red }}>{fmtPct(oiChg)}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: G.text3, fontSize: 7, marginBottom: 2 }}>Price chg</div><div style={{ color: priceChg != null ? (priceChg >= 0 ? M.green : M.red) : G.text3 }}>{priceChg != null ? `${priceChg >= 0 ? "+" : ""}${priceChg.toFixed(2)}%` : "--"}</div></div>
        <div className="cot-strip-expand" style={{ width: 20, height: 20, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", background: hov ? "rgba(255,255,255,0.06)" : "none", border: `1px solid ${hov ? G.border2 : G.border}`, color: G.text3, fontSize: 10, transition: "all 0.15s", flexShrink: 0 }}>+</div>
      </div>
    </div>
  );
}

// ── DETAIL PANEL ────────────────────────────────────────────────────────

function DetailPanel({ inst, tf }) {
  const dlrChg = tf === "1W" ? inst.dealer_chg_pct_oi_1W : inst.dealer_chg_pct_oi_1M;
  const amChg = tf === "1W" ? inst.am_chg_pct_oi_1W : inst.am_chg_pct_oi_1M;
  const hfChg = tf === "1W" ? inst.hf_chg_pct_oi_1W : inst.hf_chg_pct_oi_1M;
  const groups = [
    { label: "Dealer", color: M.blue, net: inst.dealer_net, pctOI: inst.dealer_net_pct_oi, pctl: inst.dealer_pctl, chg: dlrChg },
    { label: "Asset Mgr", color: M.green, net: inst.am_net, pctOI: inst.am_net_pct_oi, pctl: inst.am_pctl, chg: amChg },
    { label: "Hedge Fund", color: M.amber, net: inst.hf_net, pctOI: inst.hf_net_pct_oi, pctl: inst.hf_pctl, chg: hfChg },
  ];
  const conc4L = inst['Conc_Gross_LE_4_TDR_Long_All'], conc4S = inst['Conc_Gross_LE_4_TDR_Short_All'];
  const conc8L = inst['Conc_Gross_LE_8_TDR_Long_All'], conc8S = inst['Conc_Gross_LE_8_TDR_Short_All'];
  const conc4L_chg = tf === "1W" ? inst['Conc_Gross_LE_4_TDR_Long_All_chg_1W'] : inst['Conc_Gross_LE_4_TDR_Long_All_chg_1M'];
  const conc4S_chg = tf === "1W" ? inst['Conc_Gross_LE_4_TDR_Short_All_chg_1W'] : inst['Conc_Gross_LE_4_TDR_Short_All_chg_1M'];
  const conc8L_chg = tf === "1W" ? inst['Conc_Gross_LE_8_TDR_Long_All_chg_1W'] : inst['Conc_Gross_LE_8_TDR_Long_All_chg_1M'];
  const conc8S_chg = tf === "1W" ? inst['Conc_Gross_LE_8_TDR_Short_All_chg_1W'] : inst['Conc_Gross_LE_8_TDR_Short_All_chg_1M'];
  const ch = { fontFamily: M.mono, fontSize: 7, color: G.text3, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div className="cot-detail" style={{ background: G.s1, borderBottom: `1px solid ${G.border}`, padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Positioning detail -- {tf} change</div>
        <div className="cot-detail-grid" style={{ display: "grid", gridTemplateColumns: "90px 80px 70px 70px 70px", alignItems: "center", padding: "0 12px 6px", borderBottom: `1px solid ${G.border}`, marginBottom: 6 }}>
          <span style={{ ...ch, textAlign: "left" }}>Group</span><span style={ch}>Net</span><span style={ch}>% of OI</span><span style={ch}>Pctl</span><span style={ch}>{tf} chg</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {groups.map(g => (
            <div key={g.label} className="cot-detail-grid" style={{ display: "grid", gridTemplateColumns: "90px 80px 70px 70px 70px", alignItems: "center", padding: "8px 12px", background: G.bg, borderRadius: 3, border: `1px solid ${G.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: g.color }} /><span style={{ fontFamily: M.mono, fontSize: 10, color: G.text }}>{g.label}</span></div>
              <div style={{ fontFamily: M.mono, fontSize: 10, color: g.net >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtNet(g.net)}</div>
              <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text2, textAlign: "right" }}>{(g.pctOI * 100).toFixed(2)}%</div>
              <div style={{ fontFamily: M.mono, fontSize: 9, textAlign: "right", color: pctlColor(g.pctl) }}>p{g.pctl.toFixed(0)}</div>
              <div style={{ fontFamily: M.mono, fontSize: 9, color: g.chg >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtPctOI(g.chg)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, fontFamily: M.mono, fontSize: 7, color: G.text3, marginTop: 8 }}>
          <span>Net = long - short</span><span>% of OI = net / total OI</span><span>pp = percentage point change</span>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Concentration -- top traders' share of OI</div>
        <div className="cot-conc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[{ label: "Top 4 Long", val: conc4L, chg: conc4L_chg }, { label: "Top 4 Short", val: conc4S, chg: conc4S_chg }, { label: "Top 8 Long", val: conc8L, chg: conc8L_chg }, { label: "Top 8 Short", val: conc8S, chg: conc8S_chg }].map(c => (
            <div key={c.label} style={{ padding: "10px 12px", background: G.bg, borderRadius: 3, border: `1px solid ${G.border}` }}>
              <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, marginBottom: 6 }}>{c.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: M.mono, fontSize: 16, fontWeight: 500, color: c.val > 50 ? M.amber : G.text }}>{c.val != null ? `${c.val.toFixed(2)}%` : "--"}</span>
                {c.chg != null && <span style={{ fontFamily: M.mono, fontSize: 9, color: c.chg >= 0 ? M.green : M.red }}>{c.chg >= 0 ? "+" : ""}{c.chg.toFixed(2)}pp</span>}
              </div>
              {c.val != null && <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${c.val}%`, borderRadius: 2, background: c.val > 50 ? M.amber : M.blue, transition: "width 0.3s" }} /></div>}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: M.mono, fontSize: 7, color: G.text3, marginTop: 8 }}>Share of OI held by the largest traders. Above 50% is considered concentrated.</div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────

export default function COTOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tf, setTf] = useState("1M");
  const [expanded, setExpanded] = useState(null);
  const [showDealer, setShowDealer] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [lookback, setLookback] = useState(52);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/cot/overview?lookback=${lookback}`)
      .then(r => r.json())
      .then(d => { if (d.instruments) setData(d.instruments); setSummary(d.summary || null); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [lookback]);

  const handleClick = (instrument) => { setExpanded(expanded === instrument ? null : instrument); };
  const onLoaderDone = useCallback(() => setShowLoader(false), []);

  const priceKey = tf === "1W" ? "price_chg_pct_1W" : "price_chg_pct_1M";
  const sorted = [...data].sort((a, b) => {
    const covA = COV_ORDER[COVERAGE[a.instrument] || 'low'];
    const covB = COV_ORDER[COVERAGE[b.instrument] || 'low'];
    if (covA !== covB) return covA - covB;
    return (b[priceKey] || 0) - (a[priceKey] || 0);
  });

  if (showLoader) return <LoadingScreen onComplete={onLoaderDone} />;

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: M.sans, color: G.text }}>
      <style>{`${FONT} *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:${G.border2}; border-radius:2px; }
        @media (max-width: 768px) {
          .cot-page { padding: 16px 12px !important; }
          .cot-nav { padding: 0 16px !important; }
          .cot-nav-links { display: none !important; }
          .nav-analytics { display: none !important; }
          .nav-search-input { width: 0 !important; padding: 0 !important; transition: width 0.2s; }
          .nav-search-input::placeholder { opacity: 0; }
          .nav-search-box:focus-within .nav-search-input { width: 160px !important; }
          .nav-search-box:focus-within .nav-search-input::placeholder { opacity: 1; }
          .cot-nav:has(.nav-search-box:focus-within) .cot-breadcrumb { display: none !important; }
          .cot-title-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .cot-title h1 { font-size: 20px !important; }
          .cot-toggles { flex-wrap: wrap !important; gap: 8px !important; }
          .cot-legend { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .cot-legend-text { display: none !important; }
          .cot-strip { grid-template-columns: 60px 1fr 100px !important; padding: 10px 12px !important; }
          .cot-strip-label { font-size: 10px !important; }
          .cot-strip-ticker { display: none !important; }
          .cot-strip-coverage { display: none !important; }
          .cot-strip-stats { gap: 8px !important; font-size: 8px !important; }
          .cot-strip-expand { display: none !important; }
          .cot-axis { grid-template-columns: 60px 1fr 100px !important; padding: 4px 12px !important; }
          .cot-detail { grid-template-columns: 1fr !important; }
          .cot-detail-table { overflow-x: auto !important; }
          .cot-detail-grid { grid-template-columns: 80px 60px 55px 50px 55px !important; font-size: 8px !important; }
          .cot-conc-grid { grid-template-columns: 1fr !important; }
          .cot-df { overflow-x: auto !important; }
          .cot-df table { min-width: 700px !important; }
          .cot-footer { flex-direction: column !important; gap: 6px !important; padding: 16px !important; text-align: center !important; }
          .cot-ai-summary { font-size: 11px !important; }
        }
      `}</style>

      <Nav navigate={navigate} />

      <div className="cot-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px" }}>

        {/* Header: title + toggles */}
        <div className="cot-title-row" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
          <div className="cot-title">
            <h1 style={{ fontFamily: M.serif, fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>Positioning Overview</h1>
            <p style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, marginTop: 4 }}>CFTC TFF combined -- net/OI percentile rank vs {lookback}-week lookback -- sorted by futures coverage, then price change</p>
          </div>
          <div className="cot-toggles" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 1 }}>Lookback</span>
              <div style={{ display: "flex", gap: 1, background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4, padding: 2 }}>
                {[13, 26, 52].map(lb => (
                  <button key={lb} onClick={() => setLookback(lb)} style={{ padding: "4px 10px", borderRadius: 3, fontSize: 9, fontFamily: M.mono, fontWeight: 500, background: lookback === lb ? G.text : "none", color: lookback === lb ? G.bg : G.text3, border: "none", cursor: "pointer", transition: "all .15s" }}>{lb}w</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, textTransform: "uppercase", letterSpacing: 1 }}>Period</span>
              <div style={{ display: "flex", gap: 1, background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4, padding: 2 }}>
                {["1W", "1M"].map(t => (
                  <button key={t} onClick={() => setTf(t)} style={{ padding: "4px 12px", borderRadius: 3, fontSize: 10, fontFamily: M.mono, fontWeight: 500, background: tf === t ? G.text : "none", color: tf === t ? G.bg : G.text3, border: "none", cursor: "pointer", transition: "all .15s" }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend + dealer toggle */}
        <div className="cot-legend" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 12px", borderBottom: `1px solid ${G.border}`, marginBottom: 0 }}>
          <div style={{ display: "flex", gap: 14, fontFamily: M.mono, fontSize: 9, color: G.text3, alignItems: "center", flexWrap: "wrap" }}>
            {showDealer && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: M.blue }} /> dealer</span>}
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: M.green }} /> asset_mgr</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: M.amber }} /> lev_money</span>
            <span className="cot-legend-text" style={{ color: G.text3, margin: "0 4px" }}>|</span>
            <span className="cot-legend-text">left = stretched short / right = stretched long / hover for percentiles / click to expand</span>
          </div>
          <button onClick={() => setShowDealer(!showDealer)} style={{
            fontFamily: M.mono, fontSize: 9, padding: "4px 12px", borderRadius: 3,
            background: showDealer ? "rgba(96,165,250,0.12)" : "none",
            color: showDealer ? M.blue : G.text3,
            border: `1px solid ${showDealer ? "rgba(96,165,250,0.3)" : G.border}`,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { if (!showDealer) { e.currentTarget.style.borderColor = G.border2; e.currentTarget.style.color = G.text2; } }}
            onMouseLeave={e => { if (!showDealer) { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.text3; } }}
          >{showDealer ? "Dealer: ON" : "Dealer: OFF"}</button>
        </div>

        {error && <div style={{ padding: 40, color: M.red, fontSize: 12, textAlign: "center", fontFamily: M.mono }}>Failed to load: {error}</div>}
        {loading && !error && <div style={{ padding: 60, color: G.text3, fontSize: 11, textAlign: "center", fontFamily: M.mono }}>Loading overview...</div>}

        {!loading && !error && (<>
          {/* Context box — sits just above the diagram on both mobile and desktop */}
          <div style={{ background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4, padding: "16px 18px", fontFamily: M.mono, fontSize: 9, lineHeight: 1.8, color: G.text3, marginTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8, color: G.text2, marginBottom: 8 }}>About this data</div>
            <p style={{ marginBottom: 8 }}>Sourced from the CFTC Traders in Financial Futures (TFF) report. Covers regulated futures and options on futures. Published weekly -- positions reflect Tuesday close, released Friday 3:30 PM ET.</p>
            <p style={{ marginBottom: 8 }}>Each dot shows where a group's net positioning (as % of total open interest) sits vs its own history over the selected lookback window. Further right = more net long than usual. Further left = more net short than usual.</p>
            <p style={{ color: M.amber }}>Futures only. Does not capture OTC derivatives, spot holdings, ETF flows, or internal institutional allocations. Treat as a sentiment indicator, not a complete positioning census.</p>
          </div>

          {/* Axis labels */}
          <div className="cot-axis" style={{ display: "grid", gridTemplateColumns: "130px 1fr 160px", padding: "8px 20px 4px", fontFamily: M.mono, fontSize: 7, color: G.text3 }}>
            <div></div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0 16px" }}><span>0th pctl (Short)</span><span>50th</span><span>100th pctl (Long)</span></div>
            <div></div>
          </div>

          {/* Strips */}
          <div style={{ border: `1px solid ${G.border}`, borderRadius: 4, overflow: "hidden" }}>
            {sorted.map(inst => (
              <div key={inst.instrument}>
                <PositioningStrip inst={inst} tf={tf} onClick={handleClick} showDealer={showDealer} />
                {expanded === inst.instrument && <DetailPanel inst={inst} tf={tf} />}
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {summary && (
            <div style={{
              background: G.s1, border: `1px solid ${G.border}`, borderRadius: 4,
              padding: "14px 20px", marginTop: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: M.mono, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8, color: G.text2 }}>
                  AI Summary -- {lookback}w lookback
                </span>
                <span style={{
                  fontFamily: M.mono, fontSize: 7, padding: "1px 6px", borderRadius: 2,
                  background: "rgba(167,139,250,0.08)", color: M.purple,
                  border: "1px solid rgba(167,139,250,0.2)",
                }}>claude sonnet</span>
              </div>
              <div className="cot-ai-summary" style={{ fontFamily: M.sans, fontSize: 12, color: G.text2, lineHeight: 1.8, fontWeight: 300 }}>
                <ReactMarkdown components={{
                  strong: ({ children }) => <span style={{ color: G.text, fontWeight: 500 }}>{children}</span>,
                  p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                  h1: ({ children }) => <div style={{ fontFamily: M.mono, fontSize: 10, color: G.text, fontWeight: 600, marginTop: 12, marginBottom: 6 }}>{children}</div>,
                  h2: ({ children }) => <div style={{ fontFamily: M.mono, fontSize: 10, color: G.text, fontWeight: 600, marginTop: 12, marginBottom: 6 }}>{children}</div>,
                  h3: ({ children }) => <div style={{ fontFamily: M.mono, fontSize: 10, color: G.text, fontWeight: 600, marginTop: 10, marginBottom: 4 }}>{children}</div>,
                }}>{summary}</ReactMarkdown>
              </div>
              <div style={{ fontFamily: M.mono, fontSize: 8, color: G.text3, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${G.border}` }}>
                Generated by AI. May contain errors or misinterpretations. This is not investment advice. Positioning data reflects regulated futures only and may not represent total market exposure. Always verify with primary sources.
              </div>
            </div>
          )}

          {/* Dataframe excerpt */}
          <div className="cot-df" style={{ marginTop: 20 }}>
            <p style={{ fontFamily: M.mono, fontSize: 10, color: G.text3, marginBottom: 8 }}>
              <span style={{ color: M.green }}>{'>'}</span> cot_overview.head({sorted.length})
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: M.mono, fontSize: 9, minWidth: 700 }}>
                <thead>
                  <tr>
                    {["Instrument", "OI", "Dlr Net", "Dlr %OI", "Dlr pctl", "AM Net", "AM %OI", "AM pctl", "HF Net", "HF %OI", "HF pctl", "OI chg", "Price chg"].map(h => (
                      <th key={h} style={{ textAlign: h === "Instrument" ? "left" : "right", padding: "5px 8px", color: G.text3, fontWeight: 500, borderBottom: `1px solid ${G.border2}`, background: G.s1, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => {
                    const pc = tf === "1W" ? r.price_chg_pct_1W : r.price_chg_pct_1M;
                    const oc = tf === "1W" ? r.oi_chg_pct_1W : r.oi_chg_pct_1M;
                    return (
                      <tr key={i}>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: G.text, fontWeight: 500, textAlign: "left" }}>{r.instrument}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: G.text2, textAlign: "right" }}>{(r.oi / 1e6).toFixed(2)}M</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: r.dealer_net >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtNet(r.dealer_net)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: G.text2, textAlign: "right" }}>{(r.dealer_net_pct_oi * 100).toFixed(2)}%</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: pctlColor(r.dealer_pctl), textAlign: "right" }}>p{r.dealer_pctl.toFixed(0)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: r.am_net >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtNet(r.am_net)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: G.text2, textAlign: "right" }}>{(r.am_net_pct_oi * 100).toFixed(2)}%</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: pctlColor(r.am_pctl), textAlign: "right" }}>p{r.am_pctl.toFixed(0)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: r.hf_net >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtNet(r.hf_net)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: G.text2, textAlign: "right" }}>{(r.hf_net_pct_oi * 100).toFixed(2)}%</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: pctlColor(r.hf_pctl), textAlign: "right" }}>p{r.hf_pctl.toFixed(0)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: oc >= 0 ? M.green : M.red, textAlign: "right" }}>{fmtPct(oc)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: `1px solid ${G.border}`, color: pc != null ? (pc >= 0 ? M.green : M.red) : G.text3, textAlign: "right" }}>{pc != null ? `${pc >= 0 ? "+" : ""}${pc.toFixed(2)}%` : "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        <div style={{ fontFamily: M.mono, fontSize: 9, color: G.text3, padding: "16px 0 24px" }}>
          src: CFTC TFF combined -- percentile: (series {'<'} value).mean() -- lookback: 104 weeks
        </div>
      </div>

      <footer className="cot-footer" style={{ background: G.bgDarker, borderTop: `1px solid ${G.borderDk}`, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: M.serif, fontSize: 15, fontWeight: 700, color: G.textInv3 }}>Kurtopy</span>
        <span style={{ fontFamily: M.mono, fontSize: 10, color: G.textInv3, letterSpacing: "0.5px" }}>COT data via CFTC -- For informational purposes only</span>
      </footer>
    </div>
  );
}
