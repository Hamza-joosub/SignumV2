import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { G } from "../styles/tokens"
import NewsPanel from "../components/NewsPanel"
const API = import.meta.env.VITE_API_URL;


const STRIP_ITEMS = [
  { label: "S&P 500", value: "+1.2%", up: true },
  { label: "NASDAQ", value: "-0.4%", up: false },
  { label: "BTC", value: "+3.1%", up: true },
  { label: "VIX", value: "18.4", amber: true },
  { label: "10Y Treasury", value: "4.32%", amber: true },
];

export default function Landing() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame, t = 0;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const lines = [
      { color: "rgba(6,255,165,0.18)", speed: 0.003, amp: 0.13, freq: 1.8, yBase: 0.55 },
      { color: "rgba(245,158,11,0.12)", speed: 0.002, amp: 0.10, freq: 2.2, yBase: 0.65 },
      { color: "rgba(6,255,165,0.07)", speed: 0.0015, amp: 0.08, freq: 1.3, yBase: 0.45 },
    ];

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      lines.forEach(line => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= W; x += 2) {
          const p = x / W;
          const y = H * (line.yBase
            - Math.sin(p * line.freq * Math.PI + t * line.speed * 20) * line.amp
            - Math.sin(p * line.freq * 2.1 * Math.PI + t * line.speed * 12) * line.amp * 0.4
          );
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = line.color.replace(/[\d.]+\)$/, "0.04)");
        ctx.fill();
      });
      t++;
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "'Syne', sans-serif", color: G.text, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: ${G.text3}; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(6,13,26,0.95)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${G.border}`,
      }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px", cursor: "pointer" }}
          onClick={() => navigate("/")}>
          QuantLab
        </span>

        <div style={{ display: "flex", gap: 2 }}>
          {["Overview", "Models", "Markets"].map(label => {
            const active = label === "Overview";
            return (
              <button key={label}
                onClick={() => { if (label === "Markets") navigate("/markets"); if (label === "Models") navigate("/models"); }}
                style={{
                  padding: "5px 14px", borderRadius: 6, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "'Syne', sans-serif",
                  color: active ? G.bg : G.text2,
                  background: active ? G.teal : "none",
                  border: "none", cursor: "pointer", transition: "all .15s",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = G.text; e.currentTarget.style.background = "rgba(15,31,56,0.8)"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = G.text2; e.currentTarget.style.background = "none"; } }}
              >{label}</button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            placeholder="Search Ticker"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === "Enter" && searchQuery.trim()) {
                navigate(`/markets/${searchQuery.trim()}`);
                setSearchQuery("");
              }
            }}
            style={{
              background: "none", border: "none", outline: "none",
              fontSize: 13, color: G.text2, width: 120,
              fontFamily: "'Syne', sans-serif", cursor: "text",
            }}
          />
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #06ffa5, #0077ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: G.bg, cursor: "pointer",
          }}>H</div>
        </div>
      </nav>

      {/* TICKER STRIP — TODO: replace with something more useful */}
      {/* Removed live prices — intraday vs close-to-close logic too complex */}
      {/* Currently showing static placeholders */}
      <div style={{
        height: 34, background: G.s1,
        borderBottom: `1px solid ${G.border}`,
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 32,
      }}>
        {STRIP_ITEMS.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: G.text3, fontFamily: "'Space Mono', monospace" }}>{item.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace",
              color: item.amber ? G.amber : item.up ? G.green : G.red,
            }}>
              {!item.amber && (item.up ? "▲ " : "▼ ")}{item.value}
            </span>
          </div>
        ))}
      </div>

      {/* HERO */}
      <div style={{
        position: "relative",
        height: "100vh",
        marginTop: -86,
        paddingTop: 86,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(6,255,165,0.04) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 800,
            letterSpacing: "-2px",
            marginBottom: 12,
          }}>
            Financial analysis
          </h1>

          <p style={{ fontSize: 15, color: G.teal, marginBottom: 40, fontWeight: 500 }}>
            powered by statistical models
          </p>

          <button
            onClick={() => navigate("/markets")}
            style={{
              background: G.amber,
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 36px",
              borderRadius: 50,
              border: "none",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.3px",
              transition: "all .2s",
              boxShadow: "0 0 32px rgba(245,158,11,0.3)",
              display: "block",
              margin: "0 auto 20px",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 0 32px rgba(245,158,11,0.3)"; }}
          >
            Open Markets
          </button>

          <p style={{ fontSize: 11, color: G.text3, letterSpacing: "0.5px" }}>
            Live market data · Regression models · Price forecasting
          </p>
        </div>
        <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 24px" }}>
          <NewsPanel title="Market Headlines" numArticles={10} />
        </div>
      </div>
    </div>
  );
}
