// pages/index.js
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import banks from "../data/banks.json";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

// ─── Historical UVA/USD ratio (BCRA, 2003–2026) ───────────────────────────
const HIST = [
  { f: "2003", r: 0.40 }, { f: "2004", r: 0.46 }, { f: "2005", r: 0.50 },
  { f: "2006", r: 0.55 }, { f: "2007", r: 0.62 }, { f: "2008", r: 0.75 },
  { f: "2009", r: 0.70 }, { f: "2010", r: 0.77 }, { f: "2011 H1", r: 0.82 },
  { f: "2011 H2", r: 0.88 }, { f: "2012 H1", r: 0.95 }, { f: "2012 H2", r: 1.03 },
  { f: "2013 H1", r: 1.05 }, { f: "2013 H2", r: 1.02 }, { f: "2014 H1", r: 0.94 },
  { f: "2014 H2", r: 1.09 }, { f: "2015", r: 0.94 }, { f: "2016", r: 0.85 },
  { f: "2017 H1", r: 0.96 }, { f: "2017 H2", r: 1.08 }, { f: "2018 H1", r: 1.21 },
  { f: "2018 H2", r: 0.93 }, { f: "2019 H1", r: 0.50 }, { f: "2019 H2", r: 0.33 },
  { f: "2020 H1", r: 0.44 }, { f: "2020 H2", r: 0.47 }, { f: "2021", r: 0.44 },
  { f: "2022", r: 0.40 }, { f: "2023 H1", r: 0.38 }, { f: "2023 H2", r: 0.75 },
  { f: "2024 H1", r: 0.92 }, { f: "2024 H2", r: 1.09 }, { f: "2025 H1", r: 1.15 },
  { f: "2025 H2", r: 1.31 }, { f: "2026", r: 1.33, current: true },
];

const PROM_HIST = (HIST.reduce((s, d) => s + d.r, 0) / HIST.length).toFixed(2);

const getRatioStatus = (r) => {
  if (r >= 1.20) return { level: "excelente", label: "Momento excelente para tomar crédito", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "⭐" };
  if (r >= 0.95) return { level: "bueno", label: "Buen momento para tomar crédito", color: "#0891b2", bg: "#ecfeff", border: "#67e8f9", icon: "✅" };
  if (r >= 0.70) return { level: "neutro", label: "Momento neutro — analizar caso a caso", color: "#d97706", bg: "#fffbeb", border: "#fcd34d", icon: "⚠️" };
  return { level: "desfavorable", label: "Momento desfavorable — dólar caro en UVAs", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", icon: "🔴" };
};

const fmt = (n, dec = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec }).format(n);

const cuotaX100k = (tna, anios) => {
  if (tna === 0) return 100000 / (anios * 12);
  const i = tna / 100 / 12;
  const n = anios * 12;
  return (100000 * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
};

const SORT_OPTIONS = [
  { key: "tna", label: "📉 Menor tasa" },
  { key: "financiacion", label: "💰 Mayor financ." },
  { key: "plazo", label: "📅 Mayor plazo" },
];

// ─── Tooltip del gráfico ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const r = payload[0]?.value;
  const s = getRatioStatus(r);
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: s.color }}>
        {r?.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>UVA/USD</span>
      </p>
      <p style={{ margin: 0, fontSize: 11, color: s.color }}>{s.icon} {s.label}</p>
    </div>
  );
}

export default function Monitor() {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("creditos");
  const [sortBy, setSortBy] = useState("tna");
  const [chartPeriod, setChartPeriod] = useState("todo");
  const [lastFetch, setLastFetch] = useState(null);
  const [apiError, setApiError] = useState(false);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/market-data");
      const data = await res.json();
      setMarketData(data);
      setLastFetch(new Date());
      setApiError(false);
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  // Current ratio: usa MEP — criterio bancos hipotecarios
  const currentRatio = marketData?.ratio?.mep ?? 1.33;
  const currentUVA = marketData?.uva?.valor ?? 1862;
  const currentDolar = marketData?.dolar?.oficial?.valor ?? 1400;
  const currentMEP = marketData?.dolar?.mep?.valor ?? 1400;
  const status = getRatioStatus(currentRatio);

  // Chart data — inject live current value
  const allChartData = [
    ...HIST.filter((d) => !d.current),
    { f: "Hoy", r: currentRatio, current: true },
  ];
  const chartData =
    chartPeriod === "5a" ? allChartData.slice(-12)
    : chartPeriod === "10a" ? allChartData.slice(-22)
    : allChartData;

  // Sorted banks
  const sortedBanks = [...banks].sort((a, b) => {
    if (sortBy === "tna") return a.tna - b.tna;
    if (sortBy === "financiacion") return b.financiacion - a.financiacion;
    if (sortBy === "plazo") return b.plazo - a.plazo;
    return a.tna - b.tna;
  });

  return (
    <>
      <Head>
        <title>Monitor Hipotecario Argentina — Créditos UVA + Ratio UVA/USD</title>
        <meta name="description" content="Comparador de créditos hipotecarios UVA en Argentina. Tasas actualizadas, ratio UVA/dólar histórico y análisis de oportunidades." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#f3f4f8", fontFamily: "'Inter', -apple-system, system-ui, sans-serif", color: "#111827" }}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  🏠
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>Monitor Hipotecario Argentina</h1>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                    Créditos UVA en tiempo real · Fuentes: BCRA + DolarAPI
                    {lastFetch && ` · ${lastFetch.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchMarket}
                disabled={loading}
                style={{ padding: "8px 18px", background: loading ? "#e5e7eb" : "#1d4ed8", color: loading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer" }}
              >
                {loading ? "Actualizando…" : "⟳ Actualizar"}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginTop: 14, borderBottom: "2px solid #e5e7eb" }}>
              {[["creditos", "🏦 Top 10 Créditos"], ["ratio", "📈 Ratio UVA/USD (20 años)"]].map(([k, v]) => (
                <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: tab === k ? "#1d4ed8" : "#6b7280", borderBottom: `2px solid ${tab === k ? "#1d4ed8" : "transparent"}`, marginBottom: -2 }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── RATIO BANNER ─────────────────────────────────────────── */}
          <div style={{ background: status.bg, border: `1.5px solid ${status.border}`, borderRadius: 14, padding: "18px 24px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
            <div style={{ minWidth: 120 }}>
              <p style={{ margin: 0, fontSize: 11, color: status.color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Ratio UVA/USD · Hoy</p>
              <p style={{ margin: "2px 0 0", fontSize: 42, fontWeight: 900, color: status.color, lineHeight: 1 }}>
                {loading ? "—" : currentRatio.toFixed(2)}
              </p>
            </div>
            <div style={{ width: 1, height: 52, background: status.border, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: status.color }}>{status.icon} {status.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                UVA: <strong>${fmt(currentUVA)}</strong>
                <span style={{ color: "#9ca3af", fontSize: 10 }}> (BCRA)</span>
                {" · "}
                Dólar oficial: <strong>${fmt(currentDolar)}</strong>
                <span style={{ color: "#9ca3af", fontSize: 10 }}> (BCRA Com. A3500)</span>
                {" · "}
                Dólar MEP: <strong>${fmt(currentMEP)}</strong>
                <span style={{ color: "#9ca3af", fontSize: 10 }}> (mercado AL30/GD30)</span>
                {" · "}
                Promedio histórico 20 años: <strong>{PROM_HIST}</strong>
              </p>
            </div>
            <div style={{ textAlign: "center", background: "#fff", borderRadius: 10, padding: "10px 18px", border: `1px solid ${status.border}` }}>
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>vs promedio histórico</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: status.color }}>
                {loading ? "—" : `+${((currentRatio / parseFloat(PROM_HIST) - 1) * 100).toFixed(0)}%`}
              </p>
            </div>
          </div>

          {apiError && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
              ⚠ No se pudo conectar con las APIs externas. Mostrando datos de referencia. Los bancos recomiendan verificar condiciones directamente.
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB: CRÉDITOS                                             */}
          {/* ══════════════════════════════════════════════════════════ */}
          {tab === "creditos" && (
            <>
              {/* Sort bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Ordenar por:</span>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => setSortBy(key)} style={{ padding: "6px 14px", border: "1.5px solid", borderColor: sortBy === key ? "#1d4ed8" : "#d1d5db", background: sortBy === key ? "#eff6ff" : "#fff", color: sortBy === key ? "#1d4ed8" : "#6b7280", borderRadius: 20, fontSize: 12, fontWeight: sortBy === key ? 700 : 400, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Bank cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
                {sortedBanks.map((b, idx) => {
                  const cuota = cuotaX100k(b.tna, b.plazo);
                  const isTop = idx === 0;
                  const isTop3 = idx < 3;
                  return (
                    <div key={b.id} style={{ background: "#fff", borderRadius: 14, border: isTop3 ? `2px solid ${b.color}44` : "1px solid #e5e7eb", padding: 20, position: "relative", boxShadow: isTop ? `0 4px 20px ${b.color}22` : "none", transition: "box-shadow 0.2s" }}>

                      {/* Rank */}
                      <div style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: idx === 0 ? "#f59e0b" : idx === 1 ? "#9ca3af" : idx === 2 ? "#cd7c2f" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: idx < 3 ? "#fff" : "#6b7280" }}>
                        #{idx + 1}
                      </div>

                      {/* Bank */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 6, height: 40, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{b.banco}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{b.destino}</p>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {[
                          { label: b.tipo === "USD" ? "TNA USD" : "TNA + UVA", val: `${b.tna}%`, highlight: true },
                          { label: "Plazo", val: `${b.plazo} años` },
                          { label: "Financia", val: `${b.financiacion}%` },
                        ].map((s, i) => (
                          <div key={i} style={{ background: i === 0 ? `${b.color}0f` : "#f9fafb", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                            <p style={{ margin: 0, fontSize: i === 0 ? 20 : 17, fontWeight: 800, color: i === 0 ? b.color : "#111827" }}>{s.val}</p>
                            <p style={{ margin: 0, fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Cuota estimada */}
                      <div style={{ background: "#f0f7ff", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>Cuota inicial c/ $1M prestado</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#1d4ed8" }}>
                          {b.tipo === "USD" ? "USD" : "$"}{fmt(Math.round(cuota * 10))}
                        </span>
                      </div>

                      {/* Ventaja / Requisito */}
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#374151" }}>
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ </span>{b.ventaja}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                        ⚑ {b.requisito_clave}
                      </p>

                      {/* CTA */}
                      <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 14, textAlign: "center", padding: "8px", background: `${b.color}14`, color: b.color, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: `1px solid ${b.color}33` }}>
                        Ir al banco →
                      </a>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 24, textAlign: "center" }}>
                * Cuota inicial orientativa calculada a tasa fija. Los créditos UVA ajustan mensualmente por el índice CER (inflación).<br />
                Datos actualizados al {banks[0]?.ultima_actualizacion}. Verificar condiciones vigentes en cada entidad antes de operar.
              </p>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB: RATIO UVA/USD                                        */}
          {/* ══════════════════════════════════════════════════════════ */}
          {tab === "ratio" && (
            <>
              {/* Period selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Ver período:</span>
                {[["todo", "20 años"], ["10a", "10 años"], ["5a", "5 años"]].map(([k, v]) => (
                  <button key={k} onClick={() => setChartPeriod(k)} style={{ padding: "6px 14px", border: "1.5px solid", borderColor: chartPeriod === k ? "#1d4ed8" : "#d1d5db", background: chartPeriod === k ? "#eff6ff" : "#fff", color: chartPeriod === k ? "#1d4ed8" : "#6b7280", borderRadius: 20, fontSize: 12, fontWeight: chartPeriod === k ? 700 : 400, cursor: "pointer" }}>
                    {v}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px 8px 16px 0", border: "1px solid #e5e7eb", marginBottom: 24 }}>
                <div style={{ paddingLeft: 28, marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                    Ratio UVA / Dólar — {chartPeriod === "todo" ? "2003 a 2026" : chartPeriod === "10a" ? "2016 a 2026" : "2021 a 2026"}
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
                    Cuántos dólares compra una UVA. Mayor ratio = más conveniente tomar crédito UVA. Fuente: BCRA + DolarAPI.
                  </p>
                </div>

                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <ReferenceArea y1={0} y2={0.70} fill="#fee2e2" fillOpacity={0.35} />
                    <ReferenceArea y1={0.70} y2={0.95} fill="#fef9c3" fillOpacity={0.35} />
                    <ReferenceArea y1={0.95} y2={1.6} fill="#dcfce7" fillOpacity={0.35} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="f" tick={{ fontSize: 10, fill: "#9ca3af" }} interval="preserveStartEnd" />
                    <YAxis domain={[0.2, 1.55]} tickFormatter={(v) => v.toFixed(2)} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      y={parseFloat(PROM_HIST)}
                      stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5}
                      label={{ value: `Prom. hist. ${PROM_HIST}`, position: "insideTopRight", fontSize: 10, fill: "#b45309" }}
                    />
                    <Area
                      type="monotone" dataKey="r" stroke="#1d4ed8" strokeWidth={2.5}
                      fill="url(#g1)"
                      dot={(props) => {
                        const { payload, cx, cy } = props;
                        if (!payload.current) return <span key={`dot-${cx}`} />;
                        return <circle key="current-dot" cx={cx} cy={cy} r={7} fill="#1d4ed8" stroke="#fff" strokeWidth={2.5} />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Zone legend */}
                <div style={{ display: "flex", gap: 20, paddingLeft: 28, marginTop: 14, flexWrap: "wrap" }}>
                  {[
                    { bg: "#fecaca", label: "< 0.70 · Desfavorable para tomar crédito" },
                    { bg: "#fef08a", label: "0.70–0.95 · Momento neutro" },
                    { bg: "#bbf7d0", label: "> 0.95 · Favorable · Hoy: máximo histórico" },
                  ].map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 14, height: 14, background: l.bg, borderRadius: 3, border: "1px solid #d1d5db" }} />
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historic moments */}
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 14 }}>6 momentos clave de los últimos 20 años</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { periodo: "2003 — Pesificación", ratio: "0.40", icono: "🔴", texto: "Tipo de cambio fijo post-crisis. Ratio históricamente bajo.", status: "desfavorable" },
                  { periodo: "2014 — Cepo cambiario", ratio: "1.09", icono: "🟡", texto: "Cepo y dólar blue. Ratio alto pese a restricciones.", status: "bueno" },
                  { periodo: "Jun 2018 — Máximo previo", ratio: "1.21", icono: "🟢", texto: "Récord anterior. Boom hipotecario. 100.000 créditos/año.", status: "excelente" },
                  { periodo: "Sep 2019 — Mínimo histórico", ratio: "0.33", icono: "🔴", texto: "Devaluación tras PASO. Crédito hipotecario colapsó.", status: "desfavorable" },
                  { periodo: "Dic 2023 — Reinicio", ratio: "0.80", icono: "🟡", texto: "Devaluación Milei +100%. Regreso lento del crédito.", status: "neutro" },
                  { periodo: "Mar 2026 — Hoy", ratio: currentRatio.toFixed(2), icono: "⭐", texto: "Máximo histórico absoluto. Mejor momento en 20 años.", status: "excelente" },
                ].map((h, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 16, border: i === 5 ? "2px solid #1d4ed8" : "1px solid #e5e7eb", boxShadow: i === 5 ? "0 4px 20px #1d4ed822" : "none" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{h.icono} {h.periodo}</p>
                    <p style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900, color: i === 5 ? "#1d4ed8" : "#111827" }}>{h.ratio}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>{h.texto}</p>
                  </div>
                ))}
              </div>

              {/* Interpretation box */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>¿Cómo leer este ratio?</h3>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
                  El ratio UVA/dólar MEP mide cuántos dólares compra una UVA. Cuando es <strong>alto</strong>, los inmuebles (valuados en dólares) están <em>baratos en UVAs</em>: tu deuda en UVA compra más dólares de propiedad.
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
                  Hoy el ratio es <strong>{currentRatio.toFixed(2)}</strong> — el máximo de los últimos 20 años. Eso significa que cada UVA de deuda que tomás hoy te compra más dólares de propiedad que en cualquier momento anterior.
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  <strong>¿Por qué MEP y no dólar oficial?</strong> Los bancos hipotecarios usan el dólar MEP (bolsa) como referencia porque refleja mejor el valor real de mercado. El oficial está regulado por el BCRA y no capta el precio al que efectivamente se transan los activos inmobiliarios. El MEP surge del precio implícito de bonos soberanos (AL30/GD30) en el mercado secundario.
                </p>
              </div>
            </>
          )}
        </main>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff", marginTop: 40, padding: "20px 24px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              Monitor Hipotecario Argentina · Datos: BCRA, DolarAPI · Uso orientativo · No constituye asesoramiento financiero.
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              Se actualiza automáticamente cada 30 minutos ·{" "}
              <a href="https://api.bcra.gob.ar" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280" }}>BCRA</a>
              {" · "}
              <a href="https://dolarapi.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280" }}>DolarAPI</a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
