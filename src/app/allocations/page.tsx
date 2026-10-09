"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  AlertCircle,
  Percent,
  DollarSign,
  ArrowLeft,
  Settings2,
  Scale,
  RefreshCw,
  CheckSquare,
  Square,
  Layers,
  Bot,
  PieChart,
  Building2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function AllocationsContent() {
  const searchParams = useSearchParams();
  const urlPortId = searchParams.get("portfolio") ? parseInt(searchParams.get("portfolio")!) : null;

  const { isAuthenticated } = useAuth();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<any | null>(null);

  // Step state: 1 = Bot Selection, 2 = Weight Distribution
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedBotIds, setSelectedBotIds] = useState<number[]>([]);
  const [weights, setWeights] = useState<{ [id: number]: number }>({});

  const [preview, setPreview] = useState<any>(null);
  const [driftData, setDriftData] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rebalance policy state
  const [rebalFreq, setRebalFreq] = useState<string>("daily");
  const [rebalTol, setRebalTol] = useState<number>(0.1);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stratsResponse, ports] = await Promise.all([
        fetchApi("/strategies/"),
        fetchApi("/portfolios/"),
      ]);
      const strats = stratsResponse?.instances || stratsResponse || [];
      setStrategies(strats);
      setPortfolios(ports || []);

      if (ports && ports.length > 0) {
        const targetPort = urlPortId ? (ports.find((p: any) => p.id === urlPortId) || ports[0]) : ports[0];
        setSelectedPortId(targetPort.id);
        setCurrentPortfolio(targetPort);
        setRebalFreq(targetPort.rebalance_frequency || "daily");
        setRebalTol(parseFloat(targetPort.rebalance_tolerance) || 0.1);
        initializeSelections(targetPort, strats);
        loadDrift(targetPort.id);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar estrategias y portafolios.");
    } finally {
      setLoading(false);
    }
  };

  const loadDrift = async (portId: number) => {
    try {
      const data = await fetchApi(`/portfolios/${portId}/drift/`);
      setDriftData(data);
    } catch (e) {
      console.warn("Could not load drift metrics:", e);
    }
  };

  const initializeSelections = (port: any, allStrats: any[]) => {
    const activeAllocs = (port.allocations || []).filter(
      (a: any) => parseFloat(a.target_weight) > 0
    );

    // If portfolio already has active allocations, select those bots
    if (activeAllocs.length > 0) {
      const activeIds = activeAllocs.map((a: any) => a.strategy);
      setSelectedBotIds(activeIds);

      const map: { [id: number]: number } = {};
      activeAllocs.forEach((a: any) => {
        map[a.strategy] = Math.round(parseFloat(a.target_weight) * 100);
      });
      setWeights(map);
      setCurrentStep(2); // Jump to step 2 if already configured
    } else {
      // New portfolio or empty: start at step 1
      setSelectedBotIds([]);
      setWeights({});
      setCurrentStep(1);
    }
  };

  const handlePortChange = (portId: number) => {
    setSelectedPortId(portId);
    const p = portfolios.find((item) => item.id === portId);
    if (p) {
      setCurrentPortfolio(p);
      setRebalFreq(p.rebalance_frequency || "daily");
      setRebalTol(parseFloat(p.rebalance_tolerance) || 0.1);
      initializeSelections(p, strategies);
    }
    setPreview(null);
    loadDrift(portId);
  };

  const toggleBotSelection = (botId: number) => {
    setSelectedBotIds((prev) =>
      prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]
    );
  };

  // Helper to split 100% equally among selected bots
  const splitEqually = (ids: number[]) => {
    if (ids.length === 0) return {};
    const count = ids.length;
    const basePct = Math.floor(100 / count);
    const remainder = 100 - basePct * count;

    const newWeights: { [id: number]: number } = {};
    ids.forEach((id, idx) => {
      newWeights[id] = basePct + (idx === 0 ? remainder : 0);
    });
    return newWeights;
  };

  const handleProceedToStep2 = () => {
    if (selectedBotIds.length === 0) return;

    // Check if we need to initialize or re-divide equally
    const hasExistingWeights = selectedBotIds.every((id) => weights[id] && weights[id] > 0);
    if (!hasExistingWeights) {
      setWeights(splitEqually(selectedBotIds));
    }
    setCurrentStep(2);
  };

  const handleResetEqually = () => {
    setWeights(splitEqually(selectedBotIds));
    setSavedSuccess(false);
  };

  const handleSliderChange = (botId: number, val: number) => {
    setWeights((prev) => ({ ...prev, [botId]: val }));
    setSavedSuccess(false);
  };

  const totalWeight = selectedBotIds.reduce((sum, id) => sum + (weights[id] || 0), 0);

  const handlePreviewRebalance = async () => {
    if (!selectedPortId) return;
    try {
      const res = await fetchApi(`/portfolios/${selectedPortId}/rebalance-preview/`, {
        method: "POST",
      });
      setPreview(res);
    } catch (e: any) {
      setError("Error al previsualizar rebalanceo: " + e.message);
    }
  };

  const handleSaveAllocations = async () => {
    if (totalWeight > 100 || !selectedPortId) return;
    setError(null);
    try {
      // Build allocation list for all strategies: selected ones get their weight, unselected get 0
      const allocList = strategies.map((strat) => ({
        strategy: strat.id,
        target_weight: selectedBotIds.includes(strat.id)
          ? ((weights[strat.id] || 0) / 100).toFixed(4)
          : "0.0000",
      }));

      // Update allocations
      await fetchApi(`/portfolios/${selectedPortId}/allocations/`, {
        method: "PUT",
        body: JSON.stringify({ allocations: allocList }),
      });

      // Update portfolio rebalance policy
      await fetchApi(`/portfolios/${selectedPortId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          rebalance_frequency: rebalFreq,
          rebalance_tolerance: rebalTol,
        }),
      });

      setSavedSuccess(true);
      loadDrift(selectedPortId);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setError("Error al guardar asignaciones: " + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center bg-white border border-slate-subtle rounded-2xl shadow-card-subtle space-y-3">
        <h2 className="font-heading font-bold text-lg text-navy">Inicia sesión para configurar portafolios</h2>
        <p className="text-xs text-slate-muted">Debes tener una cuenta activa para asignar bots a tus portafolios.</p>
      </div>
    );
  }

  const activeBroker = currentPortfolio?.primary_broker || (currentPortfolio?.broker_accounts && currentPortfolio.broker_accounts[0]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-tech-blue hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="font-heading font-extrabold text-2xl text-navy">
            Configuración y Asignación de Portafolio
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Asistente paso a paso: Selecciona qué bots incluir y luego define la distribución porcentual equitativa o personalizada.
          </p>
        </div>

        {/* Portfolio Selector & Broker info */}
        {portfolios.length > 0 && (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-navy font-bold">Portafolio:</span>
              <select
                value={selectedPortId || ""}
                onChange={(e) => handlePortChange(parseInt(e.target.value))}
                className="bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:border-tech-blue"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.kind.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-tech-blue hover:underline bg-slate-50 px-3 py-2 rounded-xl border border-slate-subtle"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {activeBroker ? `${activeBroker.broker_label} (${activeBroker.environment.toUpperCase()})` : "Sin Broker Vinculado"}
              </span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Progress Indicator */}
      <div className="bg-white border border-slate-subtle p-4 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStep === 1
                ? "bg-navy text-white shadow-navy-glow"
                : "bg-slate-100 text-navy hover:bg-slate-200"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
              1
            </span>
            <span>Paso 1: Selección de Bots ({selectedBotIds.length})</span>
          </button>

          <ArrowRight className="w-4 h-4 text-slate-300" />

          <button
            onClick={() => {
              if (selectedBotIds.length > 0) handleProceedToStep2();
            }}
            disabled={selectedBotIds.length === 0}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStep === 2
                ? "bg-navy text-white shadow-navy-glow"
                : selectedBotIds.length > 0
                ? "bg-slate-100 text-navy hover:bg-slate-200"
                : "bg-slate-50 text-slate-300 cursor-not-allowed"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
              2
            </span>
            <span>Paso 2: Ponderación (%) y Política</span>
          </button>
        </div>

        {driftData && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-muted font-medium">Tolerancia Portafolio:</span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                driftData.rebalance_needed
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  driftData.rebalance_needed ? "bg-amber-500 animate-pulse" : "bg-emerald-success"
                }`}
              />
              {driftData.rebalance_needed ? "REBALANCEO REQUERIDO" : "EN TOLERANCIA"}
            </span>
          </div>
        )}
      </div>

      {/* STEP 1: Bot Selection Checklist */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-subtle pb-4">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-navy flex items-center gap-2">
                <Bot className="w-5 h-5 text-tech-blue" />
                Paso 1: Elige los Bots que operarán en este Portafolio
              </h2>
              <p className="text-xs text-slate-muted mt-1">
                Marca los bots que deseas incluir. En el siguiente paso se dividirá el capital automáticamente.
              </p>
            </div>

            <button
              onClick={handleProceedToStep2}
              disabled={selectedBotIds.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedBotIds.length > 0
                  ? "bg-navy hover:bg-navy-hover text-white shadow-navy-glow"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              <span>Continuar a Ponderación ({selectedBotIds.length} seleccionados)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strat) => {
              const isSelected = selectedBotIds.includes(strat.id);
              const liveVer = strat.live_version;
              const traded = liveVer?.instruments?.find((i: any) => i.role === "traded");
              const signal = liveVer?.instruments?.find((i: any) => i.role === "signal_source");
              const configStrats = liveVer?.params?.strategies || [];

              return (
                <div
                  key={strat.id}
                  onClick={() => toggleBotSelection(strat.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? "bg-tech-blue/5 border-tech-blue shadow-md shadow-tech-blue/5 ring-1 ring-tech-blue"
                      : "bg-slate-canvas hover:bg-slate-100 border-slate-subtle"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-tech-blue flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="font-heading font-bold text-navy text-sm">{strat.name}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white text-navy border border-slate-subtle">
                        {strat.kind}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {traded && (
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-white text-tech-blue border border-tech-blue/20">
                          {traded.symbol}
                        </span>
                      )}
                      {signal && (
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Sig: {signal.symbol}
                        </span>
                      )}
                      <span className="text-slate-muted">Familia: {strat.family}</span>
                    </div>

                    {configStrats.length > 0 && (
                      <div className="text-[11px] text-slate-muted line-clamp-1 font-mono">
                        {configStrats.map((cs: any) => cs.strategy_name).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[11px]">
                    <span className={isSelected ? "text-tech-blue font-bold" : "text-slate-400"}>
                      {isSelected ? "✓ Incluido en Cartera" : "+ Clic para Incluir"}
                    </span>
                    <span className="text-slate-muted font-mono">{strat.timeframe}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-subtle">
            <button
              onClick={handleProceedToStep2}
              disabled={selectedBotIds.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedBotIds.length > 0
                  ? "bg-navy hover:bg-navy-hover text-white shadow-navy-glow"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              <span>Continuar a Ponderación ({selectedBotIds.length} seleccionados)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Weight Distribution & Policy Configuration */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Portfolio Rebalance Policy Box */}
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-subtle pb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-tech-blue" />
                <h2 className="font-heading font-bold text-base text-navy">
                  Política de Rebalanceo del Portafolio
                </h2>
              </div>
              <button
                onClick={handleResetEqually}
                className="text-xs font-bold text-tech-blue hover:text-navy flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tech-blue/5 border border-tech-blue/20"
              >
                <PieChart className="w-3.5 h-3.5" />
                Dividir Equitativamente (1/N)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-navy font-bold block mb-1">Frecuencia Periódica</label>
                <select
                  value={rebalFreq}
                  onChange={(e) => setRebalFreq(e.target.value)}
                  className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-tech-blue"
                >
                  <option value="daily">Diaria (Daily)</option>
                  <option value="weekly">Semanal (Último día hábil)</option>
                  <option value="monthly">Mensual (Último día hábil del mes)</option>
                  <option value="quarterly">Trimestral (Último día hábil trimestral)</option>
                  <option value="never">Solo por cambio de señal</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-navy font-bold block mb-1">
                  Tolerancia Máxima de Drift (±%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.5"
                    value={rebalTol}
                    onChange={(e) => setRebalTol(parseFloat(e.target.value) || 0.1)}
                    className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                  />
                  <span className="text-xs font-mono font-bold text-navy bg-slate-100 px-3 py-2 rounded-xl border border-slate-subtle">
                    ±{(rebalTol * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-subtle text-xs text-slate-muted flex flex-col justify-center">
                <span className="font-bold text-navy text-[11px] uppercase tracking-wider mb-0.5">
                  Criterio de Tolerancia
                </span>
                <p className="text-[11px] leading-relaxed">
                  Si alguna manga se desvía más de ±{(rebalTol * 100).toFixed(0)}% de su meta, el portafolio genera órdenes de rebalanceo MOC.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sliders Editor for Selected Bots Only */}
            <div className="lg:col-span-2 bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-6">
              <div className="flex items-center justify-between border-b border-slate-subtle pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">
                    Ponderación de Bots Seleccionados ({selectedBotIds.length})
                  </span>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-tech-blue hover:underline font-bold"
                  >
                    (Modificar selección)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-muted">Total asignado:</span>
                  <span
                    className={`text-sm font-bold font-mono px-3 py-1 rounded-full border ${
                      totalWeight === 100
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : totalWeight > 100
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {totalWeight}% / 100%
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {selectedBotIds.map((botId) => {
                  const strat = strategies.find((s) => s.id === botId);
                  if (!strat) return null;
                  const currentVal = weights[strat.id] || 0;
                  const liveVer = strat.live_version;
                  const traded = liveVer?.instruments?.find((i: any) => i.role === "traded");
                  const signal = liveVer?.instruments?.find((i: any) => i.role === "signal_source");

                  return (
                    <div
                      key={strat.id}
                      className="bg-slate-canvas p-4 rounded-xl border border-slate-subtle space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-heading font-bold text-navy text-sm flex items-center gap-2">
                            {strat.name}
                            {traded && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-tech-blue/10 text-tech-blue border border-tech-blue/20">
                                {traded.symbol}
                              </span>
                            )}
                            {signal && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Sig: {signal.symbol}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-muted mt-0.5">
                            Familia: <span className="font-mono text-navy font-semibold">{strat.family}</span> · Tipo:{" "}
                            <span className="text-navy capitalize font-semibold">{strat.kind}</span>
                          </p>
                        </div>
                        <span className="text-lg font-bold text-navy font-mono bg-white px-3 py-1 rounded-lg border border-slate-subtle shadow-card-subtle">
                          {currentVal}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleSliderChange(strat.id, parseInt(e.target.value) || 0)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tech-blue"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-subtle">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-muted text-xs font-bold rounded-xl border border-slate-subtle transition-all"
                  >
                    ← Modificar Bots
                  </button>
                  <button
                    onClick={handlePreviewRebalance}
                    disabled={!selectedPortId}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-navy text-xs font-bold rounded-xl border border-slate-subtle shadow-card-subtle transition-all disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4 text-tech-blue" />
                    <span>Previsualizar Rebalanceo</span>
                  </button>
                </div>

                <button
                  disabled={totalWeight > 100 || !selectedPortId}
                  onClick={handleSaveAllocations}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    totalWeight <= 100
                      ? "bg-navy hover:bg-navy-hover text-white shadow-navy-glow"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }`}
                >
                  <span>Guardar Distribución y Política</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {savedSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-success flex-shrink-0" />
                  <span>Asignaciones y política de rebalanceo guardadas con éxito.</span>
                </div>
              )}
            </div>

            {/* Rebalance Preview Panel */}
            <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle space-y-4">
              <div className="border-b border-slate-subtle pb-3">
                <h2 className="font-heading font-bold text-base text-navy">Simulación de Rebalanceo</h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Cálculo de capital objetivo por manga según el equity actual.
                </p>
              </div>

              {preview && preview.targets ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-canvas rounded-xl text-xs text-navy flex justify-between border border-slate-subtle">
                    <span className="font-semibold text-slate-muted">Equity Base Estimado:</span>
                    <span className="font-bold font-mono text-navy">${preview.estimated_equity}</span>
                  </div>

                  <div className="space-y-2">
                    {preview.targets.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-canvas border border-slate-subtle rounded-xl text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-navy">{t.strategy}</div>
                          <div className="text-slate-muted text-[11px] font-mono">
                            Peso: {parseFloat(t.target_weight) * 100}%
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          $
                          {parseFloat(t.target_capital).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-muted bg-slate-canvas border border-dashed border-slate-subtle rounded-xl">
                  Haz clic en <strong>Previsualizar Rebalanceo</strong> para calcular los objetivos de cada manga.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AllocationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-muted text-xs">
          Cargando configuración de portafolio...
        </div>
      }
    >
      <AllocationsContent />
    </Suspense>
  );
}
