"use client";

import { useState, useEffect } from "react";
import {
  Sliders,
  Power,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  PlusCircle,
  Bot,
  Layers,
  ArrowRightLeft,
  Activity,
  AlertCircle,
  Sparkles,
  Info,
  Trash2,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function AdminStrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [botTypes, setBotTypes] = useState<Record<string, any>>({});
  const [strategiesCatalog, setStrategiesCatalog] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [botType, setBotType] = useState<string>("one_strategy");
  const [botName, setBotName] = useState<string>("");
  const [botFamily, setBotFamily] = useState<string>("Tech");
  const [tradedSymbol, setTradedSymbol] = useState<string>("TQQQ");
  const [signalSymbol, setSignalSymbol] = useState<string>("TLT");
  const [leverage, setLeverage] = useState<number>(1.0);
  const [maxLeverage, setMaxLeverage] = useState<number>(1.0);
  const [useRegimes, setUseRegimes] = useState<boolean>(false);
  const [selectedStrats, setSelectedStrats] = useState<
    Array<{ strategy_name: string; params: Record<string, number> }>
  >([]);

  // Ranked Allocation state
  const [metricsCatalog, setMetricsCatalog] = useState<Array<any>>([]);
  const [rankedSymbols, setRankedSymbols] = useState<string[]>(["AAPL", "MSFT", "GOOGL", "NVDA"]);
  const [selectedMetrics, setSelectedMetrics] = useState<Array<{ key: string; weight: number }>>([
    { key: "roic", weight: 0.6 },
    { key: "per", weight: 0.4 },
  ]);
  const [rankWeights, setRankWeights] = useState<number[]>([40, 30, 20, 10]); // percentages (sum=100)
  const [rankedExecMode, setRankedExecMode] = useState<"hold" | "strategy">("hold");
  const [rankedSubStrategy, setRankedSubStrategy] = useState<string>("");
  const [rankedSubParams, setRankedSubParams] = useState<Record<string, number>>({});
  const [rebalanceFreq, setRebalanceFreq] = useState<string>("monthly");

  // Hold & Smart Accumulator state
  const [isCashReserve, setIsCashReserve] = useState<boolean>(false);
  const [participatesInRebalance, setParticipatesInRebalance] = useState<boolean>(true);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(0);

  useEffect(() => {
    loadStrategiesData();
  }, []);

  const loadStrategiesData = () => {
    fetchApi("/ops/strategies/").then((data) => {
      if (data) {
        const cat = data.strategies_catalog || {};
        setStrategies(data.strategies || []);
        setBotTypes(data.bot_types || {});
        setStrategiesCatalog(cat);
        setMetricsCatalog(data.metrics_catalog || []);

        const keys = Object.keys(cat);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const def = cat[firstKey];
          const defParams: Record<string, number> = {};
          def?.parameters?.forEach((p: any) => {
            defParams[p.name] = p.default;
          });
          setRankedSubStrategy((prev) => prev || firstKey);
          setRankedSubParams((prev) => (Object.keys(prev).length > 0 ? prev : defParams));
        }
      }
    });
  };

  const resetFormToCreate = () => {
    setEditingBot(null);
    setBotType("one_strategy");
    setBotName("");
    setBotFamily("Tech");
    setTradedSymbol("TQQQ");
    setSignalSymbol("TLT");
    setLeverage(1.0);
    setMaxLeverage(1.0);
    setUseRegimes(false);

    const stratKeys = Object.keys(strategiesCatalog);
    if (stratKeys.length > 0) {
      const firstKey = stratKeys[0];
      const def = strategiesCatalog[firstKey];
      const defaultParams: Record<string, number> = {};
      def?.parameters?.forEach((p: any) => {
        defaultParams[p.name] = p.default;
      });
      setSelectedStrats([{ strategy_name: firstKey, params: defaultParams }]);
      setRankedSubStrategy(firstKey);
      setRankedSubParams(defaultParams);
    } else {
      setSelectedStrats([]);
    }
    setError(null);
    setIsModalOpen(true);
  };

  const openReconfigureModal = (strat: any) => {
    setEditingBot(strat);
    setBotType(strat.kind || "one_strategy");
    setBotName(strat.name);
    setBotFamily(strat.family || "General");

    const liveVer = strat.live_version;
    const instruments = liveVer?.instruments || [];
    const traded = instruments.find((i: any) => i.role === "traded");
    const signal = instruments.find((i: any) => i.role === "signal_source");

    setTradedSymbol(traded?.symbol || "");
    setSignalSymbol(signal?.symbol || "");

    const params = liveVer?.params || {};
    setLeverage(params.leverage || 1.0);
    setMaxLeverage(params.max_leverage || 1.0);
    setUseRegimes(params.use_regimes || false);

    // Populate Ranked Allocation state if applicable
    if (strat.kind === "ranked_allocation") {
      const rSyms = instruments.filter((i: any) => i.role === "traded").map((i: any) => i.symbol);
      if (rSyms.length > 0) setRankedSymbols(rSyms);
      if (params.metrics && params.metrics.length > 0) setSelectedMetrics(params.metrics);
      if (params.rank_weights && params.rank_weights.length > 0) {
        setRankWeights(params.rank_weights.map((w: number) => Math.round(w * 100)));
      }
      if (params.rebalance_frequency) setRebalanceFreq(params.rebalance_frequency);

      const exec = params.execution || {};
      setRankedExecMode(exec.mode || "hold");
      const subSName = exec.strategy_name || Object.keys(strategiesCatalog)[0] || "";
      setRankedSubStrategy(subSName);
      const subDef = strategiesCatalog[subSName];
      const subParamMap: Record<string, number> = {};
      const subParamArray = Array.isArray(exec.params) ? exec.params : [];
      subDef?.parameters?.forEach((p: any, idx: number) => {
        subParamMap[p.name] = subParamArray[idx] !== undefined ? subParamArray[idx] : p.default;
      });
      setRankedSubParams(subParamMap);
    }

    if (strat.kind === "hold") {
      setIsCashReserve(Boolean(params.is_cash));
      setParticipatesInRebalance(params.participates_in_rebalance !== false);
    }

    if (strat.kind === "smart_accumulator") {
      setTakeProfitPct(params.take_profit_pct ? Math.round(params.take_profit_pct * 100) : 0);
    }

    // Populate strategies slots
    const configStrats = params.strategies || [];
    if (configStrats.length > 0) {
      const slots = configStrats.map((cs: any) => {
        const stratName = cs.strategy_name;
        const def = strategiesCatalog[stratName];
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
      const stratKeys = Object.keys(strategiesCatalog);
      if (stratKeys.length > 0) {
        const firstKey = stratKeys[0];
        const def = strategiesCatalog[firstKey];
        const defaultParams: Record<string, number> = {};
        def?.parameters?.forEach((p: any) => {
          defaultParams[p.name] = p.default;
        });
        setSelectedStrats([{ strategy_name: firstKey, params: defaultParams }]);
      }
    }

    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: number) => {
    const strat = strategies.find((s) => s.id === id);
    if (!strat) return;
    const nextActive = !strat.is_active;

    try {
      await fetchApi("/ops/strategies/", {
        method: "PATCH",
        body: JSON.stringify({ id, is_active: nextActive }),
      });
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: nextActive } : s))
      );
      setMessage(`Bot ${strat.name} ${nextActive ? "Activado" : "Pausado"}`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar estado");
    }
  };

  const handleDeleteBot = async (strat: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el bot "${strat.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await fetchApi(`/ops/strategies/?id=${strat.id}`, {
        method: "DELETE",
      });
      setMessage(`Bot "${strat.name}" eliminado exitosamente.`);
      loadStrategiesData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "No se pudo eliminar el bot.");
    }
  };

  const handleAddStrategySlot = () => {
    const stratKeys = Object.keys(strategiesCatalog);
    if (stratKeys.length === 0) return;
    const key = stratKeys[0];
    const def = strategiesCatalog[key];
    const defaultParams: Record<string, number> = {};
    def?.parameters?.forEach((p: any) => {
      defaultParams[p.name] = p.default;
    });
    setSelectedStrats((prev) => [...prev, { strategy_name: key, params: defaultParams }]);
  };

  const handleRemoveStrategySlot = (index: number) => {
    setSelectedStrats((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStrategyChange = (index: number, newKey: string) => {
    const def = strategiesCatalog[newKey];
    const defaultParams: Record<string, number> = {};
    def?.parameters?.forEach((p: any) => {
      defaultParams[p.name] = p.default;
    });
    setSelectedStrats((prev) =>
      prev.map((item, i) => (i === index ? { strategy_name: newKey, params: defaultParams } : item))
    );
  };

  const handleParamChange = (index: number, paramName: string, value: number) => {
    setSelectedStrats((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, params: { ...item.params, [paramName]: value } }
          : item
      )
    );
  };

  const handleSubmitBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Format strategies parameters as ordered list according to schema
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
      name: botName,
      family: botFamily,
      bot_type: botType,
      decision_offset_minutes: 25,
      leverage: leverage,
      max_leverage: maxLeverage,
      use_regimes: useRegimes,
    };

    if (botType === "ranked_allocation") {
      const symbolsClean = rankedSymbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (symbolsClean.length < 2) {
        setError("Debes ingresar al menos 2 activos para el ranking.");
        return;
      }
      if (selectedMetrics.length === 0) {
        setError("Debes seleccionar al menos 1 métrica.");
        return;
      }
      const sumW = rankWeights.reduce((a, b) => a + b, 0);
      if (Math.abs(sumW - 100) > 0.5) {
        setError(`La suma de las ponderaciones de ranking debe ser 100% (suma actual: ${sumW}%).`);
        return;
      }

      const subDef = strategiesCatalog[rankedSubStrategy];
      const subParamList = (subDef?.parameters || []).map((p: any) => {
        const val = rankedSubParams[p.name];
        return val !== undefined ? Number(val) : Number(p.default);
      });

      payload.traded_symbols = symbolsClean;
      payload.metrics = selectedMetrics;
      payload.rank_weights = rankWeights.map((w) => Number((w / 100).toFixed(4)));
      payload.rebalance_frequency = rebalanceFreq;
      payload.execution = {
        mode: rankedExecMode,
        strategy_name: rankedExecMode === "strategy" ? rankedSubStrategy : null,
        params: rankedExecMode === "strategy" ? subParamList : [],
      };
    } else if (botType === "hold") {
      payload.traded_symbol = isCashReserve ? "CASH" : tradedSymbol.toUpperCase();
      payload.is_cash = isCashReserve;
      payload.participates_in_rebalance = participatesInRebalance;
      payload.strategies = [];
    } else if (botType === "smart_accumulator") {
      payload.traded_symbol = tradedSymbol.toUpperCase();
      payload.strategies = formattedStrategies;
      payload.take_profit_pct = takeProfitPct > 0 ? takeProfitPct / 100 : null;
    } else {
      payload.traded_symbol = tradedSymbol.toUpperCase();
      payload.signal_symbol = botType === "cross_asset" ? signalSymbol.toUpperCase() : undefined;
      payload.strategies = formattedStrategies;
    }

    try {
      if (editingBot) {
        // Reconfigure existing bot (bumping version)
        payload.id = editingBot.id;
        const res = await fetchApi("/ops/strategies/", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const newVer = res.live_version?.version || (editingBot.live_version?.version ? editingBot.live_version.version + 1 : 2);
        setMessage(`¡Bot "${botName}" actualizado a la versión v${newVer} exitosamente!`);
      } else {
        // Create brand new bot
        await fetchApi("/ops/strategies/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage(`¡Bot "${botName}" creado exitosamente (v1)!`);
      }

      setIsModalOpen(false);
      setEditingBot(null);
      loadStrategiesData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Error al procesar la configuración del Bot");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-navy">
            Instancias de Bots y Catálogo Cuantitativo
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Crea, reconfigura o gestiona instancias operativas conectando tipos de bots con estrategias del catálogo.
          </p>
        </div>
        <button
          onClick={resetFormToCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-xs font-bold shadow-navy-glow transition-all"
        >
          <PlusCircle className="w-4 h-4 text-tech-blue-light" />
          Crear Nueva Instancia de Bot
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-success flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Instances Table (Bots Configurados en el Sistema) */}
      <div className="bg-white border border-slate-subtle rounded-2xl shadow-card-subtle overflow-hidden">
        <div className="p-4 bg-slate-canvas border-b border-slate-subtle flex justify-between items-center">
          <div>
            <h2 className="font-heading font-bold text-sm text-navy">Bots Configurados en el Sistema</h2>
            <p className="text-[11px] text-slate-muted">Instancias activas con versionado inmutable y cálculo de señales</p>
          </div>
          <span className="text-xs text-slate-muted font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-subtle">
            Total: <strong className="text-navy">{strategies.length}</strong>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-navy">
            <thead className="bg-slate-canvas text-slate-muted uppercase font-bold text-[10px] tracking-wider border-b border-slate-subtle">
              <tr>
                <th className="p-4">Nombre / Versión</th>
                <th className="p-4">Tipo de Bot</th>
                <th className="p-4">Familia</th>
                <th className="p-4">Activo(s)</th>
                <th className="p-4">Estrategias Asignadas</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Señal Actual</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-subtle">
              {strategies.map((strat) => {
                const liveVer = strat.live_version;
                const instruments = liveVer?.instruments || [];
                const traded = instruments.find((i: any) => i.role === "traded");
                const signal = instruments.find((i: any) => i.role === "signal_source");
                const stratParams = liveVer?.params || {};
                const configStrats = stratParams.strategies || [];
                const verNum = liveVer?.version || 1;
                const currentSignals = strat.current_signals || [];

                return (
                  <tr key={strat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-heading font-bold text-navy text-sm flex items-center gap-2">
                        <span>{strat.name}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-tech-blue/10 text-tech-blue border border-tech-blue/20">
                          v{verNum}
                        </span>
                      </div>
                      <div className="text-xs text-slate-muted font-mono">{strat.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-canvas border border-slate-subtle text-navy font-bold">
                        {strat.kind}
                      </span>
                    </td>
                    <td className="p-4 text-slate-muted font-medium">{strat.family}</td>
                    <td className="p-4 font-mono font-bold">
                      {strat.kind === "ranked_allocation" ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {instruments.map((inst: any, idx: number) => (
                            <span
                              key={idx}
                              className="bg-tech-blue/10 text-tech-blue px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-tech-blue/20"
                            >
                              {inst.symbol}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <>
                          {traded && (
                            <span className="bg-tech-blue/10 text-tech-blue px-2 py-0.5 rounded border border-tech-blue/20">
                              {traded.symbol}
                            </span>
                          )}
                          {signal && (
                            <span className="ml-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                              (Sig: {signal.symbol})
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-4 text-slate-muted">
                      {strat.kind === "ranked_allocation" ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-navy">
                            Modo: {stratParams.execution?.mode === "strategy" ? `Estrategia (${stratParams.execution.strategy_name})` : "Hold Directo"}
                          </div>
                          {stratParams.metrics && stratParams.metrics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {stratParams.metrics.map((m: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-700"
                                >
                                  {m.key.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : configStrats.length > 0 ? (
                        <div className="space-y-1">
                          {configStrats.map((cs: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block mr-1 text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700"
                            >
                              {cs.strategy_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Sin estrategias individuales</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold border ${
                          strat.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            strat.is_active ? "bg-emerald-success" : "bg-red-500"
                          }`}
                        />
                        <span>{strat.is_active ? "ACTIVA" : "PAUSADA"}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      {currentSignals.length > 0 ? (
                        <div className="space-y-1">
                          {currentSignals.map((sig: any, sIdx: number) => {
                            const isLong = sig.direction === "LONG";
                            const isShort = sig.direction === "SHORT";
                            const expPct = Math.round((sig.target_exposure || 0) * 100);

                            return (
                              <div key={sIdx} className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                                    isLong
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                      : isShort
                                      ? "bg-red-50 text-red-700 border-red-300"
                                      : "bg-slate-100 text-slate-600 border-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isLong
                                        ? "bg-emerald-500 animate-pulse"
                                        : isShort
                                        ? "bg-red-500 animate-pulse"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  <span>
                                    {sig.direction} {expPct}% ({sig.symbol})
                                  </span>
                                </span>
                                {sig.as_of && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(sig.as_of).toLocaleDateString("es-CO", {
                                      month: "short",
                                      day: "numeric",
                                    })}{" "}
                                    {new Date(sig.as_of).toLocaleTimeString("es-CO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin cálculo</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleActive(strat.id)}
                          title={strat.is_active ? "Pausar bot" : "Activar bot"}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            strat.is_active
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5 inline mr-1" />
                          {strat.is_active ? "Pausar" : "Activar"}
                        </button>

                        <button
                          onClick={() => openReconfigureModal(strat)}
                          title="Reconfigurar hiperparámetros (Crea nueva versión)"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs rounded-lg border border-slate-subtle transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-tech-blue" />
                          <span>Reconfigurar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteBot(strat)}
                          title="Eliminar bot (No permitido si está asignado a un portafolio)"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bot Templates Preview (Horizontal Scroll / Carousel) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-sm text-navy">Tipos de Estrategias y Plantillas de Bot</h2>
            <p className="text-xs text-slate-muted">Desliza horizontalmente para explorar las tipologías disponibles en el motor</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {Object.keys(botTypes).length} Plantillas
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory">
          {Object.entries(botTypes).map(([key, bot]: [string, any]) => (
            <div
              key={key}
              className="min-w-[280px] sm:min-w-[320px] max-w-[340px] flex-shrink-0 snap-start bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle flex flex-col justify-between hover:border-tech-blue/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-canvas text-navy border border-slate-subtle">
                    {bot.category}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-tech-blue-light flex items-center justify-center text-tech-blue">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-heading font-bold text-navy text-sm">{bot.name}</h3>
                <p className="text-xs text-slate-muted mt-2 leading-relaxed line-clamp-3">{bot.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-subtle/80 flex items-center justify-between text-[11px] text-slate-muted">
                <span className="font-medium text-slate-600">
                  {bot.requires_signal_asset ? "Cross-Asset (2 Activos)" : "Single Asset"}
                </span>
                <span className="font-mono font-bold text-navy bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                  {bot.default_timeframe}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Reconfigure Bot Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-subtle rounded-2xl max-w-2xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-5 sm:p-6 border-b border-slate-subtle flex justify-between items-start flex-shrink-0 bg-white">
              <div>
                <h2 className="font-heading font-extrabold text-xl text-navy flex items-center gap-2">
                  <Bot className="w-5 h-5 text-tech-blue" />
                  <span>{editingBot ? `Reconfigurar Bot: ${editingBot.name}` : "Crear Nueva Instancia de Bot"}</span>
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  {editingBot ? (
                    <span className="text-tech-blue font-semibold">
                      Al guardar se creará la versión v{(editingBot.live_version?.version || 1) + 1} manteniendo el histórico intacto.
                    </span>
                  ) : (
                    "Selecciona la plantilla de bot, el activo y conecta las estrategias cuantitativas con sus hiperparámetros."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-muted hover:text-navy text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitBot} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {/* Bot Template Selection */}
                <div>
                  <label className="text-xs text-navy font-bold block mb-1">
                    1. Tipo de Bot (Plantilla del Catálogo)
                  </label>
                  <select
                    value={botType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setBotType(nextType);
                      // Adjust strategy slots if multi vs single
                      if (nextType === "multi_strategy" && selectedStrats.length < 2) {
                        handleAddStrategySlot();
                      } else if (nextType === "one_strategy" && selectedStrats.length > 1) {
                        setSelectedStrats((prev) => [prev[0]]);
                      }
                    }}
                    className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-tech-blue"
                  >
                    {Object.entries(botTypes).map(([k, b]: [string, any]) => (
                      <option key={k} value={k}>
                        {b.name} ({b.category})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-muted mt-1">
                    {botTypes[botType]?.description}
                  </p>
                </div>

                {/* Bot Name & Family */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-navy font-bold block mb-1">Nombre del Bot</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. TQQQ Alpha Bollinger"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-tech-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-navy font-bold block mb-1">Familia / Categoría</label>
                    <input
                      type="text"
                      value={botFamily}
                      onChange={(e) => setBotFamily(e.target.value)}
                      placeholder="Ej. Tech, Macro, Crypto"
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-tech-blue"
                    />
                  </div>
                </div>

                {/* Instruments & Logic Selection based on botType */}
                {botType === "ranked_allocation" ? (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-subtle">
                    {/* 1. Multi-Assets Input */}
                    {/* 1. Multi-Assets Input (Individual inputs with '+' and trash buttons) */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-navy font-bold">
                          1. Universo de Activos ({rankedSymbols.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setRankedSymbols((prev) => {
                              const updated = [...prev, ""];
                              const eq = Math.floor(100 / updated.length);
                              const rem = 100 - eq * updated.length;
                              const newW = new Array(updated.length).fill(eq);
                              newW[0] += rem;
                              setRankWeights(newW);
                              return updated;
                            });
                          }}
                          className="text-tech-blue hover:text-navy text-xs font-bold flex items-center gap-1 bg-tech-blue/10 px-2 py-1 rounded-lg"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Agregar Activo
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {rankedSymbols.map((sym, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-subtle">
                            <input
                              type="text"
                              placeholder="Ej. AAPL"
                              value={sym}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                setRankedSymbols((prev) => prev.map((item, i) => (i === sIdx ? val : item)));
                              }}
                              className="w-full bg-transparent text-navy font-mono font-bold text-xs px-1.5 py-1 uppercase focus:outline-none"
                            />
                            {rankedSymbols.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRankedSymbols((prev) => {
                                    const updated = prev.filter((_, i) => i !== sIdx);
                                    if (updated.length > 0) {
                                      const eq = Math.floor(100 / updated.length);
                                      const rem = 100 - eq * updated.length;
                                      const newW = new Array(updated.length).fill(eq);
                                      newW[0] += rem;
                                      setRankWeights(newW);
                                    }
                                    return updated;
                                  });
                                }}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Metrics & Weights Selection */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-navy font-bold">
                          2. Métricas Cuantitativas / Fundamentales ({selectedMetrics.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const avail = metricsCatalog.find((m) => !selectedMetrics.some((sm) => sm.key === m.key));
                            if (avail) {
                              setSelectedMetrics((prev) => [...prev, { key: avail.key, weight: 1.0 }]);
                            }
                          }}
                          className="text-tech-blue hover:text-navy text-xs font-bold flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Agregar Métrica
                        </button>
                      </div>

                      {selectedMetrics.map((sm, mIdx) => {
                        const mDef = metricsCatalog.find((m) => m.key === sm.key);
                        return (
                          <div key={mIdx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                            <select
                              value={sm.key}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                setSelectedMetrics((prev) =>
                                  prev.map((item, i) => (i === mIdx ? { ...item, key: newKey } : item))
                                );
                              }}
                              className="flex-1 bg-transparent text-navy text-xs font-bold focus:outline-none"
                            >
                              {metricsCatalog.map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label} ({m.direction === "asc" ? "Menor es mejor" : "Mayor es mejor"})
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-muted font-bold">Peso:</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="10.0"
                                value={sm.weight}
                                onChange={(e) => {
                                  const w = parseFloat(e.target.value) || 1.0;
                                  setSelectedMetrics((prev) =>
                                    prev.map((item, i) => (i === mIdx ? { ...item, weight: w } : item))
                                  );
                                }}
                                className="w-16 bg-slate-50 border border-slate-subtle text-navy text-xs font-mono font-bold rounded-lg p-1 text-center"
                              />
                            </div>

                            {selectedMetrics.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSelectedMetrics((prev) => prev.filter((_, i) => i !== mIdx))}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 3. Rank Capital Weights Allocation */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-navy font-bold">
                          3. Ponderación Libre por Puesto de Ranking
                        </label>
                        <span
                          className={`text-xs font-mono font-bold ${
                            rankWeights.reduce((a, b) => a + b, 0) === 100 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          Total: {rankWeights.reduce((a, b) => a + b, 0)}% / 100%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {rankWeights.map((w, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200">
                            <label className="text-[10px] font-bold text-slate-muted block mb-1">
                              Puesto #{idx + 1}
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={w}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  setRankWeights((prev) => prev.map((item, i) => (i === idx ? val : item)));
                                }}
                                className="w-full bg-slate-50 border border-slate-subtle text-navy text-xs font-mono font-bold rounded p-1 text-center"
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. Execution Mode: Direct Hold vs Underlying Strategy */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <label className="text-xs text-navy font-bold block">
                        4. Modo de Ejecución del Capital
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRankedExecMode("hold")}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            rankedExecMode === "hold"
                              ? "bg-tech-blue/10 border-tech-blue text-navy font-bold"
                              : "bg-white border-slate-subtle text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-xs font-bold">Inversión Directa (Hold)</div>
                          <div className="text-[10px] text-slate-muted mt-0.5">
                            Compra y mantiene el activo con el peso asignado según el ranking.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRankedExecMode("strategy");
                            const keys = Object.keys(strategiesCatalog);
                            if (keys.length > 0 && (!rankedSubStrategy || !strategiesCatalog[rankedSubStrategy])) {
                              const firstKey = keys[0];
                              setRankedSubStrategy(firstKey);
                              const def = strategiesCatalog[firstKey];
                              const defParams: Record<string, number> = {};
                              def?.parameters?.forEach((p: any) => {
                                defParams[p.name] = p.default;
                              });
                              setRankedSubParams(defParams);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            rankedExecMode === "strategy"
                              ? "bg-tech-blue/10 border-tech-blue text-navy font-bold"
                              : "bg-white border-slate-subtle text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-xs font-bold">Estrategia Cuantitativa en Activo</div>
                          <div className="text-[10px] text-slate-muted mt-0.5">
                            Opera una estrategia en cada activo. Si da FLAT, la porción queda en Cash.
                          </div>
                        </button>
                      </div>

                      {rankedExecMode === "strategy" && (
                        <div className="bg-white p-3.5 rounded-xl border border-tech-blue/30 mt-2 space-y-3">
                          <div>
                            <label className="text-[11px] font-bold text-navy block mb-1">
                              Estrategia a ejecutar en cada activo del ranking:
                            </label>
                            <select
                              value={rankedSubStrategy}
                              onChange={(e) => {
                                const nextStrat = e.target.value;
                                setRankedSubStrategy(nextStrat);
                                const def = strategiesCatalog[nextStrat];
                                const defParams: Record<string, number> = {};
                                def?.parameters?.forEach((p: any) => {
                                  defParams[p.name] = p.default;
                                });
                                setRankedSubParams(defParams);
                              }}
                              className="w-full bg-slate-50 border border-slate-subtle text-navy text-xs font-bold rounded-lg p-2"
                            >
                              {Object.entries(strategiesCatalog).map(([k, item]: [string, any]) => (
                                <option key={k} value={k}>
                                  {item.name} [{item.category}]
                                </option>
                              ))}
                            </select>
                            {strategiesCatalog[rankedSubStrategy]?.description && (
                              <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">
                                {strategiesCatalog[rankedSubStrategy].description}
                              </p>
                            )}
                          </div>

                          {/* Parámetros de la Estrategia Subyacente */}
                          {(strategiesCatalog[rankedSubStrategy]?.parameters || []).length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                Hiperparámetros de Operación ({strategiesCatalog[rankedSubStrategy]?.name}):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {strategiesCatalog[rankedSubStrategy].parameters.map((param: any) => (
                                  <div
                                    key={param.name}
                                    className="bg-slate-50 p-2 rounded-lg border border-slate-200"
                                  >
                                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                                      {param.label}
                                    </label>
                                    <input
                                      type="number"
                                      step={param.type === "float" ? "0.1" : "1"}
                                      min={param.min}
                                      max={param.max}
                                      value={
                                        rankedSubParams[param.name] !== undefined
                                          ? rankedSubParams[param.name]
                                          : param.default
                                      }
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setRankedSubParams((prev) => ({
                                          ...prev,
                                          [param.name]: isNaN(val) ? 0 : val,
                                        }));
                                      }}
                                      className="w-full bg-white border border-slate-subtle text-navy text-xs font-mono font-bold rounded p-1.5 focus:outline-none focus:border-tech-blue"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Hold Bot Specific Configuration */}
                    {botType === "hold" ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-subtle space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-navy font-bold">Tipo de Reserva / Posición</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCashReserve(false)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                !isCashReserve ? "bg-tech-blue text-white" : "bg-white border text-slate-600"
                              }`}
                            >
                              Activo / Ticker
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCashReserve(true)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isCashReserve ? "bg-emerald-600 text-white" : "bg-white border text-slate-600"
                              }`}
                            >
                              Reserva de Cash
                            </button>
                          </div>
                        </div>

                        {!isCashReserve ? (
                          <div>
                            <label className="text-xs text-navy font-bold block mb-1">
                              Activo a Mantener (Buy & Hold)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. SPY, BTC, GLD, BIL"
                              value={tradedSymbol}
                              onChange={(e) => setTradedSymbol(e.target.value.toUpperCase())}
                              className="w-full bg-white border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                            💰 <strong>Reserva de Cash Líquido:</strong> Esta porción del portafolio se mantiene en dólares no invertidos en la cuenta del broker.
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={participatesInRebalance}
                              onChange={(e) => setParticipatesInRebalance(e.target.checked)}
                              className="w-4 h-4 rounded text-tech-blue focus:ring-tech-blue"
                            />
                            <div>
                              <span className="text-xs font-bold text-navy block">Participar en rebalanceos periódicos</span>
                              <span className="text-[10px] text-slate-muted block">
                                Si está desactivado, la posición queda congelada y nunca se vende ni compra por drift de mercado.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Standard Traded / Cross-Asset Instruments Selection */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-subtle">
                        <div>
                          <label className="text-xs text-navy font-bold block mb-1">
                            Activo Principal a Operar (Traded Asset)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. TQQQ, SPY, AAPL"
                            value={tradedSymbol}
                            onChange={(e) => setTradedSymbol(e.target.value.toUpperCase())}
                            className="w-full bg-white border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                          />
                        </div>

                        {botType === "cross_asset" && (
                          <div>
                            <label className="text-xs text-navy font-bold block mb-1">
                              Activo de Señales (Signal Source Asset)
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. TLT, QQQ, ^VIX"
                              value={signalSymbol}
                              onChange={(e) => setSignalSymbol(e.target.value.toUpperCase())}
                              className="w-full bg-white border border-amber-300 text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[10px] text-amber-700">
                              Calcula las señales con este activo y opera en el de arriba.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quantitative Strategies Selection from Catalog (Not applicable for Hold Bot) */}
                    {botType !== "hold" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-navy font-bold">
                            2. {botType === "smart_accumulator" ? "Estrategia Disparadora de Compras" : "Estrategias Cuantitativas"} ({selectedStrats.length})
                          </label>
                          {botType === "multi_strategy" && (
                            <button
                              type="button"
                              onClick={handleAddStrategySlot}
                              className="text-tech-blue hover:text-navy text-xs font-bold flex items-center gap-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Agregar Estrategia
                            </button>
                          )}
                        </div>

                      {selectedStrats.map((slot, idx) => {
                        const def = strategiesCatalog[slot.strategy_name];
                        return (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 border border-slate-subtle rounded-xl space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-muted">
                                Estrategia #{idx + 1}
                              </span>
                              {selectedStrats.length > 1 && botType === "multi_strategy" && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStrategySlot(idx)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <select
                                value={slot.strategy_name}
                                onChange={(e) => handleStrategyChange(idx, e.target.value)}
                                className="w-full bg-white border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-tech-blue"
                              >
                                {Object.entries(strategiesCatalog).map(([k, item]: [string, any]) => (
                                  <option key={k} value={k}>
                                    {item.name} [{item.category}]
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-slate-muted mt-1">{def?.description}</p>
                            </div>

                            {/* Dynamic Parameters based on schema */}
                            {def?.parameters && def.parameters.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                                {def.parameters.map((p: any) => (
                                  <div key={p.name}>
                                    <label className="text-[10px] font-bold text-navy block mb-0.5 truncate">
                                      {p.label}
                                    </label>
                                    <input
                                      type="number"
                                      step={p.type === "float" ? "0.1" : "1"}
                                      min={p.min}
                                      max={p.max}
                                      value={
                                        slot.params[p.name] !== undefined
                                          ? slot.params[p.name]
                                          : p.default
                                      }
                                      onChange={(e) =>
                                        handleParamChange(
                                          idx,
                                          p.name,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full bg-white border border-slate-subtle text-navy rounded-lg p-1.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

                {/* Leverage & Macro Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-navy font-bold block mb-1">Apalancamiento Base</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={leverage}
                      onChange={(e) => setLeverage(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-navy font-bold block mb-1">Apalancamiento Máximo</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={maxLeverage}
                      onChange={(e) => setMaxLeverage(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-navy">
                      <input
                        type="checkbox"
                        checked={useRegimes}
                        onChange={(e) => setUseRegimes(e.target.checked)}
                        className="rounded text-tech-blue focus:ring-tech-blue"
                      />
                      Apalancamiento Dinámico (Régimen)
                    </label>
                  </div>
                </div>
              </div>

              {/* Fixed Footer Actions */}
              <div className="p-4 sm:px-6 bg-slate-canvas border-t border-slate-subtle flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-muted rounded-xl text-xs font-bold border border-slate-subtle transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-navy hover:bg-navy-hover text-white font-bold rounded-xl text-xs shadow-navy-glow transition-all"
                >
                  {editingBot ? "Guardar y Crear Nueva Versión" : "Guardar e Inicializar Bot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
