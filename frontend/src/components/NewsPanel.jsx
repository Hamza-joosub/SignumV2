// src/components/NewsPanel.jsx

import { useState, useEffect } from "react";
import { G } from "../styles/tokens";

const API = import.meta.env.VITE_API_URL;


export default function NewsPanel({
    ticker = null,        // if set, fetches /api/news/AAPL
    category = null,      // if set, shows only that category from /api/news
    numArticles = 5,
    title = "Headlines",
}) {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const url = ticker
            ? `${API}/api/news/${encodeURIComponent(ticker)}?num_articles=${numArticles}`
            : `${API}/api/news?num_articles=${numArticles}`;

        fetch(url)
            .then(r => {
                if (!r.ok) {
                    console.error("news fetch failed:", r.status, r.url);
                    setLoading(false);
                    return null;
                }
                return r.json();
            })
            .then(data => {
                if (!data) return;
                console.log("news data:", data);
                if (ticker) {
                    setNews(Array.isArray(data) ? data : []);
                } else if (category) {
                    setNews(data[category] || []);
                } else {
                    const all = Object.values(data)
                        .flat()
                        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
                        .slice(0, numArticles);
                    setNews(all);
                }
                setLoading(false);
            })
            .catch(e => {
                console.error("news error:", e);
                setLoading(false);
            });
    }, [ticker, category, numArticles]);

    return (
        <div style={{
            background: G.s1, border: `1px solid ${G.border}`,
            borderRadius: 10, overflow: "hidden",
        }}>
            <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${G.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>{title}</span>
            </div>

            {loading && (
                <div style={{ padding: 16, fontSize: 11, color: G.text3, textAlign: "center" }}>
                    Loading...
                </div>
            )}

            {!loading && news.length === 0 && (
                <div style={{ padding: 16, fontSize: 11, color: G.text3, textAlign: "center" }}>
                    No articles found
                </div>
            )}

            {!loading && news.map((article, i) => (
                <div key={i}
                    onClick={() => window.open(article.url, "_blank")}
                    style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid rgba(30,58,95,0.25)`,
                        cursor: "pointer", transition: "background .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(6,255,165,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace" }}>
                            {article.displayName}
                        </span>
                        <span style={{ fontSize: 10, color: G.text3, fontFamily: "'Space Mono',monospace" }}>
                            {article.pubDate}
                        </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: G.text2, lineHeight: 1.4, margin: 0 }}>
                        {article.title}
                    </p>
                </div>
            ))}
        </div>
    );
}