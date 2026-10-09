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
  Plus,
  Trash2,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  Bot,
  Zap,
  Gauge,
  HelpCircle,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

interface StrategySlot {
  strategy_name: string;
  params: Record<string, number>;
}

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  pnl_pct: number;
  leverage?: number;
  entry_strategy?: string;
  exit_strategy?: string;
  open?: boolean;
}

interface TradeMarker {
  date: string;
  type: "BUY" | "SELL";
  price: number;
  strategy: string;
  leverage?: number;
  pnl?: number;
  pnl_pct?: number;
  is_win?: boolean;
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
  trade_markers?: TradeMarker[];
  applied_leverage?: {
    base_leverage: number;
    max_leverage: number;
    use_dynamic_leverage: boolean;
  };
}

export default function BacktestLabPage() {
  // Catalog & DB data
  const [dbStrategies, setDbStrategies] = useState<any[]>([]);
  const [botTypesCatalog, setBotTypesCatalog] = useState<Record<string, any>>({});
  const [strategiesCatalog, setStrategiesCatalog] = useState<Record<string, any>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // Configuration Mode: "db_bot" (Cargar de la BD) | "custom" (Diseñar Ad-Hoc)
  const [mode, setMode] = useState<"db_bot" | "custom">("db_bot");
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);

  // Engine & Strategy Parameters
  const [botType, setBotType] = useState<string>("one_strategy");
  const [tradedSymbol, setTradedSymbol] = useState<string>("QQQ");
  const [signalSymbol, setSignalSymbol] = useState<string>("TLT");
  const [selectedStrats, setSelectedStrats] = useState<StrategySlot[]>([]);
  const [capital, setCapital] = useState<number>(100000);

  // Leverage Parameters
  const [leverage, setLeverage] = useState<number>(1.0); // Base leverage
  const [maxLeverage, setMaxLeverage] = useState<number>(2.0); // Max leverage
  const [useDynamicLeverage, setUseDynamicLeverage] = useState<boolean>(true); // Dynamic Walk-Forward toggle

  // Date Range State
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedPreset, setSelectedPreset] = useState<string>("2Y");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Simulation execution state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResponse | null>(null);

  // Chart UI state
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    strategy_value: number;
    benchmark_value: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<any | null>(null);

  // 1. Load system catalog and DB strategies
  useEffect(() => {
    fetchApi("/ops/strategies/")
      .then((data) => {
        if (data) {
          const strats = data.strategies || [];
          const bTypes = data.bot_types || {};
          const cat = data.strategies_catalog || {};

          setDbStrategies(strats);
          setBotTypesCatalog(bTypes);
          setStrategiesCatalog(cat);
          setDataLoaded(true);

          if (strats.length > 0) {
            setSelectedBotId(strats[0].id);
            populateFormFromBot(strats[0], cat);
          } else {
            initDefaultCustomStrategy(cat);
          }
        }
      })
      .catch((err) => {
        console.error("Error cargando estrategias:", err);
      });
  }, []);

  // Helper: Init default single strategy slot
  const initDefaultCustomStrategy = (cat: Record<string, any>) => {
    const keys = Object.keys(cat);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const def = cat[firstKey];
      const defaultParams: Record<string, number> = {};
      def?.parameters?.forEach((p: any) => {
        defaultParams[p.name] = p.default;
      });
      setSelectedStrats([{ strategy_name: firstKey, params: defaultParams }]);
    }
  };

  // Helper: Populate form when user selects an existing bot
  const populateFormFromBot = (bot: any, cat: Record<string, any>) => {
    if (!bot) return;
    setBotType(bot.kind || "one_strategy");

    const liveVer = bot.live_version;
    const instruments = liveVer?.instruments || [];
    const traded = instruments.find((i: any) => i.role === "traded");
    const signal = instruments.find((i: any) => i.role === "signal_source");

    setTradedSymbol(traded?.symbol || instruments[0]?.symbol || "QQQ");
    setSignalSymbol(signal?.symbol || "TLT");

    const params = liveVer?.params || {};
    setLeverage(params.leverage || 1.0);
    setMaxLeverage(params.max_leverage || params.leverage || 2.0);
    setUseDynamicLeverage(params.use_regimes !== undefined ? params.use_regimes : true);

    const configStrats = params.strategies || [];
    if (configStrats.length > 0) {
      const slots: StrategySlot[] = configStrats.map((cs: any) => {
        const stratName = cs.strategy_name;
        const def = cat[stratName];
        const paramMap: Record<string, number> = {};
        const paramArray = Array.isArray(cs.params) ? cs.params : [];

        def?.parameters?.forEach((p: any, idx: number) => {
          if (paramArray[idx] !== undefined) {
            paramMap[p.name] = paramArray[idx];
          } else {
            paramMap[p.name] = p.default;
          }
        });
        return {
          strategy_name: stratName,
          params: paramMap,
        };
      });
      setSelectedStrats(slots);
    } else {
      initDefaultCustomStrategy(cat);
    }
  };

  const handleSelectBot = (botId: number) => {
    setSelectedBotId(botId);
    const bot = dbStrategies.find((b) => b.id === botId);
    if (bot) {
      populateFormFromBot(bot, strategiesCatalog);
    }
  };

  // Preset Date Selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const end = new Date();
    const start = new Date();

    if (preset === "3M") {
      start.setMonth(start.getMonth() - 3);
    } else if (preset === "6M") {
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

  // Manage Strategy Slots (Add, Remove, Change, Params)
  const handleAddStrategySlot = () => {
    const keys = Object.keys(strategiesCatalog);
    if (keys.length === 0) return;
    const key = keys[0];
    const def = strategiesCatalog[key];
    const defaultParams: Record<string, number> = {};
    def?.parameters?.forEach((p: any) => {
      defaultParams[p.name] = p.default;
    });
    setSelectedStrats((prev) => [...prev, { strategy_name: key, params: defaultParams }]);
  };

  const handleRemoveStrategySlot = (idx: number) => {
    setSelectedStrats((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStrategyChange = (idx: number, newKey: string) => {
    const def = strategiesCatalog[newKey];
    const defaultParams: Record<string, number> = {};
    def?.parameters?.forEach((p: any) => {
      defaultParams[p.name] = p.default;
    });
    setSelectedStrats((prev) =>
      prev.map((item, i) => (i === idx ? { strategy_name: newKey, params: defaultParams } : item))
    );
  };

  const handleParamChange = (idx: number, paramName: string, value: number) => {
    setSelectedStrats((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, params: { ...item.params, [paramName]: value } }
          : item
      )
    );
  };

  // Run Quantitative Simulation
  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);

    const formattedStrategies = selectedStrats.map((s) => {
      const def = strategiesCatalog[s.strategy_name];
      const paramList = (def?.parameters || []).map((p: any) => {
        const val = s.params[p.name];
        return val !== undefined ? Number(val) : Number(p.default);
      });
      return {
        strategy_name: s.strategy_name,
        params: paramList,
      };
    });

    const payload: any = {
      start_date: startDate,
      end_date: endDate,
      initial_capital: capital,
      leverage: leverage,
      max_leverage: maxLeverage,
      use_dynamic_leverage: useDynamicLeverage,
      bot_type: botType,
      traded_symbol: tradedSymbol.trim().toUpperCase(),
      signal_symbol: botType === "cross_asset" ? signalSymbol.trim().toUpperCase() : undefined,
      strategies: formattedStrategies,
    };

    if (mode === "db_bot" && selectedBotId) {
      payload.strategy_id = selectedBotId;
    }

    try {
      const res = await fetchApi("/ops/backtests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.metrics && res.equity_curve) {
        setResult(res);
      } else {
        const errMsg = res?.error || res?.detail || "No se pudo procesar la simulación de backtest.";
        setError(errMsg);
      }
    } catch (e: any) {
      setError(e.message || "Error al conectar con el servidor de backtesting.");
    } finally {
      setLoading(false);
    }
  };

  // SVG Chart Geometry Calculations
  const chartData = result?.equity_curve || [];
  const svgWidth = 840;
  const svgHeight = 310;
  const padding = { top: 25, right: 35, bottom: 45, left: 75 };

  const { minVal, maxVal, pathBot, pathBenchmark, points } = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return { minVal: 0, maxVal: 0, pathBot: "", pathBenchmark: "", points: [] };
    }

    const allValues = chartData.flatMap((d) => [d.strategy_value, d.benchmark_value]);
    const minRaw = Math.min(...allValues);
    const maxRaw = Math.max(...allValues);
    const span = maxRaw - minRaw || 1000;
    const margin = span * 0.08;
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

  // Interpolate precise (X, Y) coordinates for Trade Markers on the Strategy curve
  const renderedMarkers = useMemo(() => {
    if (!result?.trade_markers || !chartData || chartData.length < 2 || maxVal === minVal) {
      return [];
    }
    const innerW = svgWidth - padding.left - padding.right;
    const innerH = svgHeight - padding.top - padding.bottom;

    const startTs = new Date(chartData[0].date).getTime();
    const endTs = new Date(chartData[chartData.length - 1].date).getTime();
    const totalDuration = endTs - startTs || 1;

    return result.trade_markers.map((m, idx) => {
      const mTs = new Date(m.date).getTime();
      const clampedTs = Math.max(startTs, Math.min(endTs, mTs));
      const ratio = (clampedTs - startTs) / totalDuration;
      const x = padding.left + ratio * innerW;

      // Find closest point in equity curve to align with bot value
      let closestPt = chartData[0];
      let minDiff = Infinity;
      for (const pt of chartData) {
        const diff = Math.abs(new Date(pt.date).getTime() - clampedTs);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = pt;
        }
      }

      const y = padding.top + innerH - ((closestPt.strategy_value - minVal) / (maxVal - minVal)) * innerH;

      return {
        ...m,
        id: idx,
        x,
        y,
        strategy_value: closestPt.strategy_value,
      };
    });
  }, [result?.trade_markers, chartData, minVal, maxVal]);

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
              PROD-PARITY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              YAHOO FINANCE LIVE OHLCV
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Simula cualquier bot o diseña estrategias ad-hoc con datos históricos reales contra el benchmark{" "}
            <strong>Buy & Hold</strong> con apalancamiento dinámico y atribución multi-estrategia.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-canvas p-1 rounded-xl border border-slate-subtle self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("db_bot")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              mode === "db_bot"
                ? "bg-navy text-white shadow-sm"
                : "text-slate-muted hover:text-navy hover:bg-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Cargar Bot Guardado</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              mode === "custom"
                ? "bg-navy text-white shadow-sm"
                : "text-slate-muted hover:text-navy hover:bg-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Diseñar Estrategia Ad-Hoc</span>
          </button>
        </div>
      </div>

      {/* Control Configuration Panel */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-5">
        {/* Row 1: Bot Selection (if mode === db_bot) or Type (if custom) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mode === "db_bot" ? (
            <div className="md:col-span-2">
              <label className="text-xs text-navy font-bold block mb-1.5 flex items-center justify-between">
                <span>Seleccionar Bot de la Base de Datos ({dbStrategies.length} disponibles)</span>
                {selectedBotId && (
                  <span className="text-[10px] text-tech-blue font-semibold">
                    {dbStrategies.find((b) => b.id === selectedBotId)?.family}
                  </span>
                )}
              </label>
              <select
                value={selectedBotId || ""}
                onChange={(e) => handleSelectBot(Number(e.target.value))}
                className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
              >
                {dbStrategies.map((strat) => {
                  const sym =
                    strat.live_version?.instruments?.find((i: any) => i.role === "traded")?.symbol ||
                    "ASSET";
                  return (
                    <option key={strat.id} value={strat.id}>
                      {strat.name} ({sym}) — {strat.kind} [{strat.is_active ? "ACTIVO" : "PAUSADO"}]
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="text-xs text-navy font-bold block mb-1.5">
                Tipo de Arquitectura de Bot
              </label>
              <select
                value={botType}
                onChange={(e) => setBotType(e.target.value)}
                className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
              >
                {Object.keys(botTypesCatalog).map((key) => {
                  const item = botTypesCatalog[key];
                  return (
                    <option key={key} value={key}>
                      {item.name} — {item.description}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Capital */}
          <div>
            <label className="text-xs text-navy font-bold block mb-1.5">Capital Inicial ($ USD)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
            />
          </div>
        </div>

        {/* Row 2: Leverage Configuration (Base, Max, Dynamic Walk-Forward Toggle) */}
        <div className="bg-slate-canvas/80 p-4 rounded-xl border border-slate-subtle space-y-3">
          <div className="flex items-center justify-between border-b border-slate-subtle pb-2">
            <span className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-tech-blue" />
              <span>Gestión de Apalancamiento y Regímenes de Riesgo</span>
            </span>
            <span className="text-[10px] text-slate-muted">Walk-Forward Kelly / Profit Factor</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Base Leverage */}
            <div>
              <label className="text-[11px] font-bold text-navy block mb-1">
                Apalancamiento Base
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseFloat(e.target.value))}
                className="w-full bg-white border border-slate-subtle text-navy font-bold text-xs rounded-xl p-2.5 focus:outline-none focus:border-tech-blue"
              >
                <option value={1.0}>1.0x (Spot sin deuda)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x (Margen moderado)</option>
                <option value={2.0}>2.0x (Margen 2x)</option>
                <option value={3.0}>3.0x (Apalancamiento alto)</option>
              </select>
            </div>

            {/* Max Leverage */}
            <div>
              <label className="text-[11px] font-bold text-navy block mb-1">
                Apalancamiento Máximo (Techo)
              </label>
              <select
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(parseFloat(e.target.value))}
                className="w-full bg-white border border-slate-subtle text-navy font-bold text-xs rounded-xl p-2.5 focus:outline-none focus:border-tech-blue"
              >
                <option value={1.0}>1.0x (Sin techo extra)</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x</option>
                <option value={2.5}>2.5x</option>
                <option value={3.0}>3.0x</option>
                <option value={4.0}>4.0x</option>
              </select>
            </div>

            {/* Dynamic Leverage Toggle */}
            <div className="bg-white p-3 rounded-xl border border-slate-subtle/90 flex items-center justify-between gap-3">
              <div>
                <label className="text-[11px] font-bold text-navy block">
                  Apalancamiento Dinámico
                </label>
                <p className="text-[10px] text-slate-muted leading-tight mt-0.5">
                  Escala hacia el techo si Profit Factor ≥ 1.5, y reduce a 1.0x en drawdowns.
                </p>
              </div>
              <input
                type="checkbox"
                checked={useDynamicLeverage}
                onChange={(e) => setUseDynamicLeverage(e.target.checked)}
                className="w-5 h-5 accent-tech-blue rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Free Ticker Input & Popular Tickers Chips */}
        <div className="bg-slate-canvas/60 p-4 rounded-xl border border-slate-subtle space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-navy font-bold block mb-1">
                Activo Negociado (Cualquier Ticker de Yahoo Finance)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tradedSymbol}
                  onChange={(e) => setTradedSymbol(e.target.value.toUpperCase())}
                  placeholder="Ej. QQQ, SPY, NVDA, AAPL, TQQQ, BTC-USD"
                  className="flex-1 bg-white border border-slate-subtle text-navy font-mono font-bold text-xs rounded-xl px-3 py-2.5 uppercase focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-slate-muted font-bold mr-1 self-center">Populares:</span>
                {["QQQ", "SPY", "TQQQ", "NVDA", "AAPL", "MSFT", "TLT", "SOXL", "BTC-USD"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setTradedSymbol(chip)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                      tradedSymbol === chip
                        ? "bg-navy text-white"
                        : "bg-white border border-slate-subtle text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {botType === "cross_asset" && (
              <div>
                <label className="text-xs text-navy font-bold block mb-1">
                  Activo Fuente de Señal (Signal Asset)
                </label>
                <input
                  type="text"
                  value={signalSymbol}
                  onChange={(e) => setSignalSymbol(e.target.value.toUpperCase())}
                  placeholder="Ej. TLT, ^VIX, QQQ"
                  className="w-full bg-white border border-slate-subtle text-navy font-mono font-bold text-xs rounded-xl px-3 py-2.5 uppercase focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
                />
                <p className="text-[10px] text-slate-muted mt-1">
                  El bot evaluará los indicadores sobre este activo y comprará/venderá <strong>{tradedSymbol}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Quantitative Strategies & Parameters Configurator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-subtle pb-2">
            <div>
              <h3 className="text-xs font-bold text-navy flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-tech-blue" />
                <span>Configuración de Estrategia(s) e Indicadores</span>
              </h3>
              <p className="text-[11px] text-slate-muted">
                {botType === "multi_strategy"
                  ? "Las señales de las estrategias seleccionadas se combinan mediante unión lógica OR con gestión de estados y atribución granular."
                  : "Parámetros cuantitativos del modelo matemático."}
              </p>
            </div>

            {botType === "multi_strategy" && (
              <button
                type="button"
                onClick={handleAddStrategySlot}
                className="flex items-center gap-1 text-[11px] font-bold text-tech-blue bg-tech-blue-light hover:bg-tech-blue hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-tech-blue/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Estrategia</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {selectedStrats.map((slot, idx) => {
              const def = strategiesCatalog[slot.strategy_name];
              return (
                <div
                  key={idx}
                  className="bg-slate-canvas border border-slate-subtle p-4 rounded-xl space-y-3 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <select
                        value={slot.strategy_name}
                        onChange={(e) => handleStrategyChange(idx, e.target.value)}
                        className="bg-white border border-slate-subtle text-navy font-bold text-xs rounded-lg px-3 py-2 flex-1 max-w-md focus:outline-none focus:border-tech-blue"
                      >
                        {Object.keys(strategiesCatalog).map((catKey) => {
                          const catItem = strategiesCatalog[catKey];
                          return (
                            <option key={catKey} value={catKey}>
                              {catItem.name} ({catItem.category})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {botType === "multi_strategy" && selectedStrats.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStrategySlot(idx)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar estrategia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {def?.description && (
                    <p className="text-[11px] text-slate-muted italic">{def.description}</p>
                  )}

                  {/* Render Parameters dynamically according to schema */}
                  {def?.parameters && def.parameters.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                      {def.parameters.map((param: any) => (
                        <div key={param.name} className="bg-white p-2 rounded-lg border border-slate-subtle/80">
                          <label className="text-[10px] font-bold text-navy block truncate mb-1" title={param.label}>
                            {param.label}
                          </label>
                          <input
                            type="number"
                            step={param.type === "float" ? "0.1" : "1"}
                            min={param.min}
                            max={param.max}
                            value={slot.params[param.name] ?? param.default}
                            onChange={(e) =>
                              handleParamChange(
                                idx,
                                param.name,
                                param.type === "float"
                                  ? parseFloat(e.target.value) || 0
                                  : parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-full bg-slate-canvas border border-slate-subtle text-navy font-mono font-bold text-xs rounded p-1.5 focus:outline-none focus:border-tech-blue"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 5: Date Range Presets & Action Button */}
        <div className="pt-2 border-t border-slate-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Presets */}
            <div className="flex bg-slate-canvas p-1 rounded-xl border border-slate-subtle">
              {["3M", "6M", "1Y", "2Y", "3Y", "5Y", "YTD"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetChange(p)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    selectedPreset === p
                      ? "bg-navy text-white shadow-sm"
                      : "text-slate-muted hover:text-navy hover:bg-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom Dates */}
            <div className="flex items-center gap-2 text-xs text-slate-muted">
              <Calendar className="w-3.5 h-3.5 text-tech-blue" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset("CUSTOM");
                }}
                className="bg-slate-canvas border border-slate-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-navy"
              />
              <span>hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPreset("CUSTOM");
                }}
                className="bg-slate-canvas border border-slate-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-navy"
              />
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunBacktest}
            disabled={loading || !tradedSymbol}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all disabled:opacity-50 min-w-[220px]"
          >
            <Play className={`w-4 h-4 fill-white ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Calculando Simulación..." : "Ejecutar Backtest"}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold block">Error en la simulación:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && result.metrics && (
        <div className="space-y-6">
          {/* Executive Summary Banner */}
          <div className="bg-gradient-to-r from-navy via-navy-light to-navy border border-navy text-white p-6 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-tech-blue-light font-bold">
                  Simulación Cuantitativa Completada
                </span>
                <span className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {result.start_date} → {result.end_date}
                </span>
                {result.applied_leverage?.use_dynamic_leverage && (
                  <span className="bg-tech-blue/30 text-tech-blue-light text-[10px] px-2 py-0.5 rounded-full font-bold border border-tech-blue/40">
                    DYNAMIC LEVERAGE {result.applied_leverage.base_leverage}x → {result.applied_leverage.max_leverage}x
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Activo: {result.symbol} | Estrategia: {result.strategy_slug}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
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

          {/* Equity Curve SVG Chart with Trade Entry & Exit Markers */}
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-subtle pb-3">
              <div>
                <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-tech-blue" />
                  Curva de Rendimiento Acumulado con Momentos de Trade
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Los marcadores <strong>▲ verdes</strong> indican inicio de trade y <strong>▼ rojos/verdes</strong> cierre de posición con su respectiva estrategia.
                </p>
              </div>

              {/* Chart Legend & Marker Toggle */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-navy bg-slate-canvas px-2.5 py-1 rounded-lg border border-slate-subtle">
                  <input
                    type="checkbox"
                    checked={showMarkers}
                    onChange={(e) => setShowMarkers(e.target.checked)}
                    className="accent-tech-blue rounded"
                  />
                  <span>Mostrar Trades (▲ Entradas / ▼ Salidas)</span>
                </label>

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
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setHoveredMarker(null);
                }}
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

                {/* Trade Start (BUY ▲) and Trade End (SELL ▼) Markers */}
                {showMarkers &&
                  renderedMarkers.map((m) => {
                    const isBuy = m.type === "BUY";
                    return (
                      <g
                        key={m.id}
                        className="cursor-pointer transition-transform hover:scale-125"
                        onMouseEnter={() => setHoveredMarker(m)}
                        onMouseLeave={() => setHoveredMarker(null)}
                      >
                        {isBuy ? (
                          // Upward Triangle (BUY Entry)
                          <polygon
                            points={`${m.x},${m.y - 12} ${m.x - 5},${m.y - 3} ${m.x + 5},${m.y - 3}`}
                            fill="#10b981"
                            stroke="#065f46"
                            strokeWidth="1.2"
                            className="drop-shadow-sm"
                          />
                        ) : (
                          // Downward Triangle (SELL Exit)
                          <polygon
                            points={`${m.x},${m.y + 12} ${m.x - 5},${m.y + 3} ${m.x + 5},${m.y + 3}`}
                            fill={m.is_win ? "#10b981" : "#ef4444"}
                            stroke={m.is_win ? "#065f46" : "#991b1b"}
                            strokeWidth="1.2"
                            className="drop-shadow-sm"
                          />
                        )}
                      </g>
                    );
                  })}

                {/* Hover Interaction Vertical Line */}
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
                    x={pt.x - 8}
                    y={padding.top}
                    width="16"
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

              {/* Marker Tooltip (shows exact Trade details and sub-strategy attribution) */}
              {hoveredMarker && (
                <div
                  className="absolute pointer-events-none bg-navy-dark text-white text-xs p-3 rounded-xl shadow-navy-glow border border-tech-blue/40 z-20 font-mono space-y-1.5 max-w-xs"
                  style={{
                    left: `${Math.min(
                      Math.max(hoveredMarker.x / (svgWidth / 100), 8),
                      72
                    )}%`,
                    top: hoveredMarker.type === "BUY" ? "20px" : "70px",
                  }}
                >
                  <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 font-bold">
                    {hoveredMarker.type === "BUY" ? (
                      <span className="text-emerald-400">🟢 INICIO DE TRADE (ENTRADA)</span>
                    ) : (
                      <span className={hoveredMarker.is_win ? "text-emerald-400" : "text-red-400"}>
                        🔴 CIERRE DE TRADE (SALIDA)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Fecha: <strong className="text-white">{hoveredMarker.date}</strong> @ $
                    <strong className="text-white">{hoveredMarker.price}</strong>
                  </div>
                  <div className="text-[11px] text-tech-blue-light font-bold">
                    Disparado por:{" "}
                    <span className="text-amber-300">{hoveredMarker.strategy}</span>
                  </div>
                  {hoveredMarker.type === "BUY" && hoveredMarker.leverage && (
                    <div className="text-[10px] text-slate-300">
                      Apalancamiento aplicado:{" "}
                      <strong className="text-emerald-300">{hoveredMarker.leverage}x</strong>
                    </div>
                  )}
                  {hoveredMarker.type === "SELL" && (
                    <div className="text-[11px] font-bold">
                      Resultado:{" "}
                      <span className={hoveredMarker.is_win ? "text-emerald-400" : "text-red-400"}>
                        {hoveredMarker.pnl_pct >= 0 ? "+" : ""}
                        {hoveredMarker.pnl_pct}% (${hoveredMarker.pnl})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* General Equity Curve Tooltip Overlay */}
              {!hoveredMarker && hoveredPoint && (
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

          {/* Historical Trades Log Table with Sub-Strategy Attribution */}
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-subtle pb-3">
              <div>
                <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-tech-blue" />
                  Registro Histórico de Operaciones (Trades) y Atribución
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Auditoría completa de qué sub-estrategia inició y cerró cada posición, junto con su apalancamiento aplicado
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
                      <th className="py-2.5 px-3">Estrategia Entrada</th>
                      <th className="py-2.5 px-3">Salida (Fecha / Precio)</th>
                      <th className="py-2.5 px-3">Estrategia Salida</th>
                      <th className="py-2.5 px-3 text-center">Apalancamiento</th>
                      <th className="py-2.5 px-3">Títulos</th>
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
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-tech-blue/10 text-tech-blue border border-tech-blue/20">
                              {trade.entry_strategy || "Estrategia"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-navy">{trade.exit_date}</span>
                            <span className="text-slate-muted text-[11px] ml-1.5">
                              @ ${trade.exit_price}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {trade.exit_strategy || "Regla de Salida"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {trade.leverage || 1.0}x
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
