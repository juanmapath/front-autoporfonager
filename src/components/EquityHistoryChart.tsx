"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Point = {
  date: string;
  equity?: number;
  close?: number;
  net_flow?: number;
  contributed?: number;
  log_return?: number;
};
type HistoryResponse = {
  portfolio: Point[];
  benchmarks: Record<string, { name: string; series: Point[] }>;
  available_benchmarks: Record<string, string>;
};

const ALL_BENCHMARKS = ["SPY", "QQQ", "DIA", "IWM"];
const COLORS: Record<string, string> = {
  portfolio: "#0A192F",
  SPY: "#4274D9",
  QQQ: "#F59E0B",
  DIA: "#10B981",
  IWM: "#8B5CF6",
};
const RANGES = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1A" },
  { key: "ALL", label: "Todo" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function rangeStart(range: RangeKey): string | null {
  const d = new Date();
  if (range === "1M") d.setMonth(d.getMonth() - 1);
  else if (range === "3M") d.setMonth(d.getMonth() - 3);
  else if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
  else if (range === "YTD") return `${d.getFullYear()}-01-01`;
  else return null;
  return d.toISOString().slice(0, 10);
}

/** Último cierre con fecha <= date (las series vienen ordenadas por fecha). */
function closeOnOrBefore(series: Point[], date: string): number | null {
  let value: number | null = null;
  for (const p of series) {
    if (p.date > date) break;
    value = p.close ?? null;
  }
  return value;
}

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtUsd = (v: any) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EquityHistoryChart({ portfolioId }: { portfolioId: number }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("ALL");
  const [selected, setSelected] = useState<string[]>(["SPY", "QQQ"]);

  useEffect(() => {
    setLoading(true);
    fetchApi(`/portfolios/${portfolioId}/equity-history/?benchmarks=${ALL_BENCHMARKS.join(",")}`)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [portfolioId]);

  const points = useMemo(() => {
    if (!data) return [];
    const start = rangeStart(range);
    return data.portfolio.filter((p) => !start || p.date >= start);
  }, [data, range]);

  // Rendimiento acumulado (%) desde el primer día del rango. El del portafolio encadena los
  // retornos logarítmicos diarios (ya neutralizados de depósitos y retiros en el backend):
  // exp(Σ r_t) - 1. Los índices no tienen flujos, así que basta el cociente de cierres.
  const rows = useMemo(() => {
    if (!data || points.length === 0) return [];
    const benchBase: Record<string, number | null> = {};
    for (const sym of selected) {
      const series = data.benchmarks[sym]?.series || [];
      benchBase[sym] = closeOnOrBefore(series, points[0].date);
    }
    let cumLog = 0;
    return points.map((p, i) => {
      if (i > 0) cumLog += p.log_return || 0;
      const row: Record<string, number | string | null> = {
        date: p.date,
        portfolio: (Math.exp(cumLog) - 1) * 100,
      };
      for (const sym of selected) {
        const close = closeOnOrBefore(data.benchmarks[sym]?.series || [], p.date);
        const b = benchBase[sym];
        row[sym] = close !== null && b ? (close / b - 1) * 100 : null;
      }
      return row;
    });
  }, [data, points, selected]);

  const capitalRows = useMemo(
    () => points.map((p) => ({ date: p.date, equity: p.equity, contributed: p.contributed })),
    [points],
  );
  const flowsInRange = points.slice(1).reduce((acc, p) => acc + (p.net_flow || 0), 0);

  const last = rows[rows.length - 1];
  const names: Record<string, string> = { portfolio: "Portafolio", ...(data?.available_benchmarks || {}) };

  const toggle = (sym: string) =>
    setSelected((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));

  return (
    <div className="bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-subtle pb-3">
        <div>
          <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-tech-blue" />
            Historial del Portafolio
          </h2>
          <p className="text-xs text-slate-muted">Rendimiento frente a índices principales y evolución del capital</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ALL_BENCHMARKS.map((sym) => {
            const on = selected.includes(sym);
            return (
              <button
                key={sym}
                type="button"
                onClick={() => toggle(sym)}
                title={names[sym]}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border transition-all ${
                  on ? "bg-slate-canvas text-navy border-slate-300" : "bg-white text-slate-400 border-slate-subtle"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: on ? COLORS[sym] : "#CBD5E1" }} />
                {sym}
              </button>
            );
          })}
          <div className="flex items-center bg-slate-canvas rounded-lg border border-slate-subtle p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  range === r.key ? "bg-navy text-white" : "text-slate-muted hover:text-navy"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-muted">Cargando historial…</div>
      ) : rows.length < 2 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-muted bg-slate-canvas rounded-xl border border-dashed border-slate-subtle space-y-1 p-6">
          <p className="font-semibold text-navy">Aún no hay historial suficiente en este rango</p>
          <p>El valor del portafolio se registra cada día hábil tras el cierre (16:15 NY).</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            {["portfolio", ...selected].map((key) => {
              const v = last?.[key];
              if (typeof v !== "number") return null;
              return (
                <div key={key} className="flex items-center gap-1.5 bg-slate-canvas border border-slate-subtle rounded-lg px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[key] }} />
                  <span className="text-slate-muted">{key === "portfolio" ? "Portafolio" : key}</span>
                  <span className={`font-mono font-bold ${v >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtPct(v)}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-navy">Rendimiento acumulado (TWR)</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    />
                    <Tooltip
                      formatter={(v: any, key: any) => [typeof v === "number" ? fmtPct(v) : "—", names[key] || key]}
                      labelStyle={{ fontSize: 11, color: "#0A192F", fontWeight: 700 }}
                      contentStyle={{ fontSize: 11, borderRadius: 12, borderColor: "#EAECF0" }}
                    />
                    {selected.map((sym) => (
                      <Line key={sym} type="monotone" dataKey={sym} stroke={COLORS[sym]} strokeWidth={1.5} dot={false} connectNulls />
                    ))}
                    <Line type="monotone" dataKey="portfolio" stroke={COLORS.portfolio} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-bold text-navy">Capital</h3>
                {flowsInRange !== 0 && (
                  <span className="text-[11px] text-slate-muted">
                    Aportes netos en el rango:{" "}
                    <span className={`font-mono font-bold ${flowsInRange > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      {fmtUsd(flowsInRange)}
                    </span>
                  </span>
                )}
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={capitalRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `$${Math.round(v).toLocaleString("en-US")}`}
                    />
                    <Tooltip
                      formatter={(v: any, key: any) => [fmtUsd(v), key === "equity" ? "Capital" : "Capital aportado"]}
                      labelStyle={{ fontSize: 11, color: "#0A192F", fontWeight: 700 }}
                      contentStyle={{ fontSize: 11, borderRadius: 12, borderColor: "#EAECF0" }}
                    />
                    <Line type="stepAfter" dataKey="contributed" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                    <Line type="monotone" dataKey="equity" stroke={COLORS.portfolio} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[11px] text-slate-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-navy inline-block" /> Capital
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 border-t border-dashed border-slate-400 inline-block" /> Capital aportado (inicial + depósitos − retiros)
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-muted">
            El rendimiento encadena retornos logarítmicos diarios descontando depósitos y retiros, así que es comparable con los
            índices (representados por sus ETFs con dividendos reinvertidos).
          </p>
        </>
      )}
    </div>
  );
}
