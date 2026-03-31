// pages/api/market-data.js
//
// Fuentes:
//   UVA           → BCRA API pública (variable 31)
//   Dólar oficial → BCRA API pública (variable 4 = tipo de cambio referencia BNA / Com. A3500)
//   Dólar MEP     → dolarapi.com (precio implícito bonos AL30/GD30 en mercado secundario)
//                   BCRA NO publica el MEP en su API — es un tipo de cambio de mercado,
//                   no una cotización oficial. dolarapi.com lo consolida en tiempo real.
//   Ratio         → UVA ÷ Dólar MEP  (criterio que usan los bancos hipotecarios)

export default async function handler(req, res) {
  // Cache 30 minutos en el edge de Vercel
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const weekAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Defaults fallback
  let uva = { valor: 1862, fecha: fmt(today), source: "fallback" };
  let dolarOficial = { valor: 1400, fecha: fmt(today), source: "fallback" };
  let dolarMEP = { valor: 1400, source: "fallback" };

  // ── 1. BCRA: UVA (var 31) + Dólar oficial (var 4) en paralelo ────────────
  await Promise.allSettled([

    fetch(
      `https://api.bcra.gob.ar/estadisticas/v2.0/datosVariable/31/${fmt(weekAgo)}/${fmt(today)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    ).then(async (r) => {
      if (!r.ok) throw new Error(`BCRA UVA ${r.status}`);
      const data = await r.json();
      const results = data?.results;
      if (results?.length) {
        const last = results[results.length - 1];
        uva = { valor: last.valor, fecha: last.fecha, source: "BCRA" };
      }
    }).catch((e) => console.warn("BCRA UVA:", e.message)),

    fetch(
      `https://api.bcra.gob.ar/estadisticas/v2.0/datosVariable/4/${fmt(weekAgo)}/${fmt(today)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    ).then(async (r) => {
      if (!r.ok) throw new Error(`BCRA oficial ${r.status}`);
      const data = await r.json();
      const results = data?.results;
      if (results?.length) {
        const last = results[results.length - 1];
        dolarOficial = { valor: last.valor, fecha: last.fecha, source: "BCRA" };
      }
    }).catch((e) => console.warn("BCRA oficial:", e.message)),

  ]);

  // ── 2. Dólar MEP desde dolarapi.com ──────────────────────────────────────
  // El MEP (dólar bolsa) es el tipo de cambio implícito que resulta de comprar
  // bonos soberanos en pesos (AL30/GD30) y venderlos en dólares en el mercado
  // secundario local. Los bancos lo usan como referencia para pesificar los
  // créditos hipotecarios porque refleja mejor el valor real de mercado.
  // BCRA no lo publica porque es un precio de mercado, no una cotización oficial.
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares/bolsa", {
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const d = await r.json();
      const valor = d.venta ?? d.compra;
      if (valor) dolarMEP = { valor, source: "dolarapi.com (mercado — AL30/GD30)" };
    }
  } catch (e) {
    console.warn("MEP fallback a oficial:", e.message);
    // Si el MEP no está disponible, usar el oficial como fallback
    dolarMEP = { ...dolarOficial, source: "fallback — MEP no disponible, usando oficial" };
  }

  // ── 3. Ratios ─────────────────────────────────────────────────────────────
  const ratioMEP      = +(uva.valor / dolarMEP.valor).toFixed(4);
  const ratioOficial  = +(uva.valor / dolarOficial.valor).toFixed(4);

  return res.status(200).json({
    uva,
    dolar: { oficial: dolarOficial, mep: dolarMEP },
    ratio: {
      mep:      ratioMEP,
      oficial:  ratioOficial,
      criterio: "UVA / Dólar MEP — criterio bancos hipotecarios argentinos",
    },
    timestamp: new Date().toISOString(),
    fuentes: {
      uva:          "BCRA — api.bcra.gob.ar/estadisticas variable 31",
      dolarOficial: "BCRA — api.bcra.gob.ar/estadisticas variable 4 (Com. A3500)",
      dolarMEP:     "dolarapi.com — precio implícito bonos AL30/GD30 (mercado secundario)",
    },
  });
}
