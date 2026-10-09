"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play,
  TrendingUp,
  BarChart2,
  DollarSign,
  Activity,
  Percent,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Clock,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

interface StrategyItem {
  id: number;
  slug: string;
  name: string;
  family: string;
  engine: string;
  kind: string;
  is_active: boolean;
  live_version?: {
    instruments?: Array<{
      symbol: string;
      role: string;
    }>;
  };
}

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  pnl_pct: number;
  open?: boolean;
}

interface BacktestResponse {
  id: number;
  strategy_slug: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: string | number;
  status: string;
  metrics: {
    roi_pct: number;
    cagr_pct: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    win_rate_pct: number;
    profit_factor: number;
    total_trades: number;
    final_value: number;
    benchmark_final_value: number;
    benchmark_roi_pct: number;
    benchmark_cagr_pct: number;
    benchmark_max_drawdown_pct: number;
    alpha_vs_benchmark: number;
  };
  equity_curve: Array<{
    date: string;
    strategy_value: number;
    benchmark_value: number;
  }>;
  trades?: Trade[];
}

export default function BacktestLabPage() {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);
  const [capital, setCapital] = useState<number>(100000);
  const [leverage, setLeverage] = useState<number>(1.0);
  const [selectedPreset, setSelectedPreset] = useState<string>("2Y");

  // Date range
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    strategy_value: number;
    benchmark_value: number;
    x: number;
    y: number;
  } | null>(null);

  // Load available strategies from API
  useEffect(() => {
    fetchApi("/ops/strategies")
      .then((data) => {
        if (data && data.strategies && data.strategies.length > 0) {
          setStrategies(data.strategies);
          setSelectedStrategyId(data.strategies[0].id);
        }
      })
      .catch((err) => {
        console.error("Error loading strategies for backtest:", err);
      });
  }, []);

  // Update date range based on preset selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const end = new Date();
    const start = new Date();

    if (preset === "6M") {
      start.setMonth(start.getMonth() - 6);
    } else if (preset === "1Y") {
      start.setFullYear(start.getFullYear() - 1);
    } else if (preset === "2Y") {
      start.setFullYear(start.getFullYear() - 2);
    } else if (preset === "3Y") {
      start.setFullYear(start.getFullYear() - 3);
    } else if (preset === "5Y") {
      start.setFullYear(start.getFullYear() - 5);
    } else if (preset === "YTD") {
      start.setMonth(0, 1);
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const selectedStrategy = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId) || null;
  }, [strategies, selectedStrategyId]);

  const tradedSymbol = useMemo(() => {
    if (!selectedStrategy?.live_version?.instruments) return "QQQ";
    const traded = selectedStrategy.live_version.instruments.find(
      (i) => i.role === "traded"
    );
    return traded ? traded.symbol : selectedStrategy.live_version.instruments[0]?.symbol || "QQQ";
  }, [selectedStrategy]);

  const handleRunBacktest = async () => {
    if (!selectedStrategyId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi("/ops/backtests", {
        method: "POST",
        body: JSON.stringify({
          strategy_id: selectedStrategyId,
          start_date: startDate,
          end_date: endDate,
          initial_capital: capital,
          leverage: leverage,
        }),
      });

      if (res && res.metrics) {
        setResult(res);
      } else {
        setError(res?.error || "Error al procesar el backtest con el servidor.");
      }
    } catch (e: any) {
      setError(e.message || "Error al conectar con el motor de backtesting.");
    } finally {
      setLoading(false);
    }
  };

  // SVG Chart Dimensions & Calculations
  const chartData = result?.equity_curve || [];
  const svgWidth = 800;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 70 };

  const { minVal, maxVal, pathBot, pathBenchmark, points } = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return { minVal: 0, maxVal: 0, pathBot: "", pathBenchmark: "", points: [] };
    }

    const allValues = chartData.flatMap((d) => [d.strategy_value, d.benchmark_value]);
    const minRaw = Math.min(...allValues);
    const maxRaw = Math.max(...allValues);
    const margin = (maxRaw - minRaw) * 0.08 || 1000;
    const minVal = Math.floor(minRaw - margin);
    const maxVal = Math.ceil(maxRaw + margin);

    const innerW = svgWidth - padding.left - padding.right;
    const innerH = svgHeight - padding.top - padding.bottom;

    const getX = (idx: number) => padding.left + (idx / (chartData.length - 1)) * innerW;
    const getY = (val: number) => padding.top + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;

    let pBot = `M ${getX(0)} ${getY(chartData[0].strategy_value)}`;
    let pBench = `M ${getX(0)} ${getY(chartData[0].benchmark_value)}`;

    const pts = chartData.map((d, i) => {
      const x = getX(i);
      const yBot = getY(d.strategy_value);
      pBot += ` L ${x} ${yBot}`;
      pBench += ` L ${x} ${getY(d.benchmark_value)}`;
      return { ...d, x, yBot };
    });

    return { minVal, maxVal, pathBot: pBot, pathBenchmark: pBench, points: pts };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-navy">
              Laboratorio Cuantitativo de Backtesting
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-tech-blue-light text-tech-blue border border-tech-blue/20">
              PROD-PARITY ENGINE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              YAHOO FINANCE LIVE OHLCV
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Simula el rendimiento histórico de cualquier bot de la base de datos contra el benchmark{" "}
            <strong>Buy & Hold</strong> usando el <strong>mismo motor y catálogo de producción</strong>.
          </p>
        </div>
      </div>

      {/* Control Form */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bot Selector */}
          <div>
            <label className="text-xs text-navy font-bold block mb-1.5 flex items-center justify-between">
              <span>Bot / Estrategia Cuantitativa</span>
              {selectedStrategy && (
                <span className="text-[10px] text-tech-blue font-semibold uppercase">
                  {selectedStrategy.family}
                </span>
              )}
            </label>
            <select
              value={selectedStrategyId || ""}
              onChange={(e) => setSelectedStrategyId(Number(e.target.value))}
              className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
            >
              {strategies.map((strat) => {
                const sym =
                  strat.live_version?.instruments?.find((i) => i.role === "traded")?.symbol ||
                  "ASSET";
                return (
                  <option key={strat.id} value={strat.id}>
                    {strat.name} ({sym}) — {strat.kind}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Preset Timeframe */}
          <div>
            <label className="text-xs text-navy font-bold block mb-1.5">Horizonte Temporal</label>
            <div className="grid grid-cols-6 gap-1 bg-slate-canvas p-1 rounded-xl border border-slate-subtle">
              {["6M", "1Y", "2Y", "3Y", "5Y", "YTD"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetChange(p)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    selectedPreset === p
                      ? "bg-navy text-white shadow-sm"
                      : "text-slate-muted hover:text-navy hover:bg-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Capital & Leverage */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-navy font-bold block mb-1.5">Capital ($ USD)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-medium focus:outline-none focus:border-tech-blue"
              />
            </div>
            <div>
              <label className="text-xs text-navy font-bold block mb-1.5">Apalancamiento</label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseFloat(e.target.value))}
                className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-tech-blue"
              >
                <option value={1.0}>1.0x (Spot)</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x (Margin)</option>
                <option value={3.0}>3.0x (Leveraged)</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <button
              onClick={handleRunBacktest}
              disabled={loading || !selectedStrategyId}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-white ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Ejecutando Simulación..." : "Ejecutar Backtest"}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Inputs Collapsible / Sub-row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-subtle/50 text-xs text-slate-muted">
          <span className="font-semibold text-slate-muted flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Rango evaluado:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPreset("CUSTOM");
              }}
              className="bg-slate-canvas border border-slate-subtle rounded-lg px-2 py-1 text-xs font-mono text-navy"
            />
            <span>hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPreset("CUSTOM");
              }}
              className="bg-slate-canvas border border-slate-subtle rounded-lg px-2 py-1 text-xs font-mono text-navy"
            />
          </div>
          {selectedStrategy && (
            <span className="ml-auto text-[11px] font-mono text-slate-muted">
              Activo transado: <strong className="text-navy">{tradedSymbol}</strong> | Motor:{" "}
              <strong className="text-navy">{selectedStrategy.engine}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && result.metrics && (
        <div className="space-y-6">
          {/* Executive Summary Banner */}
          <div className="bg-gradient-to-r from-navy via-navy-light to-navy border border-navy text-white p-6 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-tech-blue-light font-bold">
                  Resultado de Simulación
                </span>
                <span className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {result.start_date} → {result.end_date}
                </span>
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Bot: {selectedStrategy?.name || result.strategy_slug} ({result.symbol})
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
                <span>
                  Capital Inicial:{" "}
                  <strong className="text-white font-mono">
                    ${Number(result.initial_capital).toLocaleString()}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Valor Final Bot:{" "}
                  <strong className="text-emerald-400 font-mono">
                    ${result.metrics.final_value?.toLocaleString()}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Benchmark Buy & Hold:{" "}
                  <strong className="text-amber-300 font-mono">
                    ${result.metrics.benchmark_final_value?.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center text-center ${
                  result.metrics.alpha_vs_benchmark >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">Alpha vs Buy & Hold</span>
                <span className="text-xl font-extrabold font-mono">
                  {result.metrics.alpha_vs_benchmark >= 0 ? "+" : ""}
                  {result.metrics.alpha_vs_benchmark}%
                </span>
              </div>

              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Protección Drawdown
                </span>
                <span className="text-xl font-extrabold font-mono text-white">
                  {Math.abs(result.metrics.max_drawdown_pct)}% vs{" "}
                  <span className="text-slate-400">
                    {Math.abs(result.metrics.benchmark_max_drawdown_pct)}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Comparative Metrics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* ROI */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                  Retorno (ROI)
                </span>
                <span className="text-[9px] text-slate-muted font-mono">
                  B&H: {result.metrics.benchmark_roi_pct}%
                </span>
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  result.metrics.roi_pct >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {result.metrics.roi_pct >= 0 ? "+" : ""}
                {result.metrics.roi_pct}%
              </div>
            </div>

            {/* CAGR */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                  CAGR Anual
                </span>
                <span className="text-[9px] text-slate-muted font-mono">
                  B&H: {result.metrics.benchmark_cagr_pct}%
                </span>
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  result.metrics.cagr_pct >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {result.metrics.cagr_pct >= 0 ? "+" : ""}
                {result.metrics.cagr_pct}%
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                  Max Drawdown
                </span>
                <span className="text-[9px] text-slate-muted font-mono">
                  B&H: {result.metrics.benchmark_max_drawdown_pct}%
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-red-600">
                {result.metrics.max_drawdown_pct}%
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                  Sharpe / Sortino
                </span>
                <span className="text-[9px] text-slate-muted font-mono">
                  Sort: {result.metrics.sortino_ratio}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-tech-blue">
                {result.metrics.sharpe_ratio}
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                Win Rate
              </span>
              <div className="text-xl font-bold font-mono text-navy">
                {result.metrics.win_rate_pct}%
              </div>
            </div>

            {/* Profit Factor & Trades */}
            <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                  Profit Factor
                </span>
                <span className="text-[9px] text-slate-muted font-mono">
                  {result.metrics.total_trades} trades
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-navy">
                {result.metrics.profit_factor}
              </div>
            </div>
          </div>

          {/* Equity Curve SVG Chart */}
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-subtle pb-3">
              <div>
                <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-tech-blue" />
                  Curva de Rendimiento Acumulado (Bot vs Buy & Hold)
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Evolución patrimonial de $
                  {Number(result.initial_capital).toLocaleString()} con reinversión de utilidades y comisiones
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-tech-blue"></span>
                  <span className="text-navy">Estrategia Bot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-slate-muted">Buy & Hold ({result.symbol})</span>
                </div>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="relative w-full overflow-hidden bg-slate-canvas rounded-xl p-4 border border-slate-subtle">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Y-Axis Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const y = padding.top + (svgHeight - padding.top - padding.bottom) * ratio;
                  const val = maxVal - (maxVal - minVal) * ratio;
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        ${Math.round(val).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Date Markers */}
                {points.length > 0 &&
                  [0, Math.floor(points.length / 2), points.length - 1].map((idx, i) => {
                    const pt = points[idx];
                    if (!pt) return null;
                    return (
                      <text
                        key={i}
                        x={pt.x}
                        y={svgHeight - 12}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                      >
                        {pt.date}
                      </text>
                    );
                  })}

                {/* Benchmark Line (Amber) */}
                <path
                  d={pathBenchmark}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  className="opacity-75"
                />

                {/* Bot Strategy Line (Tech Blue) */}
                <path
                  d={pathBot}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  className="drop-shadow-sm"
                />

                {/* Hover Interaction Vertical Line & Highlight Dots */}
                {hoveredPoint && (
                  <g>
                    <line
                      x1={hoveredPoint.x}
                      y1={padding.top}
                      x2={hoveredPoint.x}
                      y2={svgHeight - padding.bottom}
                      stroke="#0f172a"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={hoveredPoint.x}
                      cy={
                        padding.top +
                        (svgHeight - padding.top - padding.bottom) -
                        ((hoveredPoint.strategy_value - minVal) / (maxVal - minVal)) *
                          (svgHeight - padding.top - padding.bottom)
                      }
                      r="4"
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* Invisible hover overlay rects */}
                {points.map((pt, i) => (
                  <rect
                    key={i}
                    x={pt.x - 10}
                    y={padding.top}
                    width="20"
                    height={svgHeight - padding.top - padding.bottom}
                    fill="transparent"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        date: pt.date,
                        strategy_value: pt.strategy_value,
                        benchmark_value: pt.benchmark_value,
                        x: pt.x,
                        y: pt.yBot,
                      })
                    }
                  />
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div
                  className="absolute pointer-events-none bg-navy text-white text-[11px] p-2.5 rounded-xl shadow-navy-glow border border-white/10 z-10 font-mono space-y-1"
                  style={{
                    left: `${Math.min(
                      Math.max(hoveredPoint.x / (svgWidth / 100), 10),
                      85
                    )}%`,
                    top: "16px",
                  }}
                >
                  <div className="font-bold text-slate-300 border-b border-white/10 pb-1">
                    {hoveredPoint.date}
                  </div>
                  <div className="text-tech-blue-light font-bold flex justify-between gap-4">
                    <span>Bot:</span>
                    <span>${hoveredPoint.strategy_value.toLocaleString()}</span>
                  </div>
                  <div className="text-amber-300 font-bold flex justify-between gap-4">
                    <span>B&H:</span>
                    <span>${hoveredPoint.benchmark_value.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historical Trades Log Table */}
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-subtle pb-3">
              <div>
                <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-tech-blue" />
                  Registro Histórico de Operaciones (Trades)
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Auditoría completa de cada orden de compra y venta ejecutada por el modelo
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-canvas px-3 py-1 rounded-lg text-navy border border-slate-subtle">
                Total: {result.trades?.length || 0} operaciones
              </span>
            </div>

            {result.trades && result.trades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-subtle text-slate-muted uppercase font-bold text-[10px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Entrada (Fecha / Precio)</th>
                      <th className="py-2.5 px-3">Salida (Fecha / Precio)</th>
                      <th className="py-2.5 px-3">Títulos (Shares)</th>
                      <th className="py-2.5 px-3 text-right">PnL Neto ($)</th>
                      <th className="py-2.5 px-3 text-right">Retorno (%)</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-subtle font-mono">
                    {result.trades.map((trade, idx) => {
                      const isWin = trade.pnl > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-canvas/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-muted font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-navy">{trade.entry_date}</span>
                            <span className="text-slate-muted text-[11px] ml-1.5">
                              @ ${trade.entry_price}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-navy">{trade.exit_date}</span>
                            <span className="text-slate-muted text-[11px] ml-1.5">
                              @ ${trade.exit_price}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{trade.shares}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isWin ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {isWin ? "+" : ""}
                            ${trade.pnl.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isWin ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {isWin ? "+" : ""}
                            {trade.pnl_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {trade.open ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tech-blue-light text-tech-blue border border-tech-blue/20">
                                ABIERTO
                              </span>
                            ) : isWin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                GANANCIA
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                PÉRDIDA
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-muted">
                No se registraron operaciones de compra en el período seleccionado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
