"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  ShieldCheck,
  Link2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Building2,
  Radio,
  ArrowLeft,
  Sliders,
  ArrowRight,
  Activity,
  Key,
  Lock,
  ExternalLink,
  Zap,
  RefreshCw,
  Trash2,
  Settings,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function PortfoliosManagementPage() {
  const { isAuthenticated } = useAuth();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Management
  const [activeModalPort, setActiveModalPort] = useState<any | null>(null);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [syncingBroker, setSyncingBroker] = useState(false);
  const [disconnectingBroker, setDisconnectingBroker] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  // Form State
  const [brokerLabel, setBrokerLabel] = useState("Alpaca");
  const [displayName, setDisplayName] = useState("");
  const [executionMode, setExecutionMode] = useState("auto");
  const [provider, setProvider] = useState("alpaca");
  const [brokerEnv, setBrokerEnv] = useState<string>("paper");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  // Test Ping State
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [brokerError, setBrokerError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortfolios();
    }
  }, [isAuthenticated]);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/portfolios/");
      setPortfolios(data || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar portafolios.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBrokerModal = (port: any) => {
    setActiveModalPort(port);
    const existingBroker = port.primary_broker || (port.broker_accounts && port.broker_accounts[0]);

    if (existingBroker) {
      setIsEditingCredentials(false);
      setBrokerLabel(existingBroker.broker_label || "Alpaca");
      setProvider(existingBroker.provider || "alpaca");
      setExecutionMode(existingBroker.execution_mode || "auto");
      setBrokerEnv(existingBroker.environment || (port.kind === "paper" ? "paper" : "live"));
      setDisplayName(existingBroker.display_name || `Alpaca ${port.kind === "paper" ? "Paper" : "Live"}`);
    } else {
      setIsEditingCredentials(true);
      setBrokerLabel("Alpaca");
      setProvider("alpaca");
      setExecutionMode("auto");
      setBrokerEnv(port.kind === "paper" ? "paper" : "live");
      setDisplayName(`Alpaca ${port.kind === "paper" ? "Paper" : "Live"}`);
    }

    setApiKey("");
    setSecretKey("");
    setPingResult(null);
    setBrokerError(null);
    setModalSuccessMsg(null);
  };

  const handleTestPing = async () => {
    if (provider !== "alpaca") return;
    if (!apiKey || !secretKey) {
      setBrokerError("Por favor ingresa tanto el API Key ID como el Secret Key para probar la conexión.");
      return;
    }
    setTestingPing(true);
    setBrokerError(null);
    setPingResult(null);

    try {
      const res = await fetchApi("/portfolios/test-broker-connection/", {
        method: "POST",
        body: JSON.stringify({
          provider: "alpaca",
          environment: brokerEnv,
          api_key: apiKey,
          secret_key: secretKey,
        }),
      });
      if (res && res.success) {
        setPingResult(res.account);
      }
    } catch (err: any) {
      setBrokerError(err.message || "Error al probar la conexión con Alpaca.");
    } finally {
      setTestingPing(false);
    }
  };

  const handleAddOrUpdateBroker = async (e: React.FormEvent, portfolioId: number) => {
    e.preventDefault();
    setBrokerError(null);
    try {
      await fetchApi(`/portfolios/${portfolioId}/broker-accounts/`, {
        method: "POST",
        body: JSON.stringify({
          portfolio: portfolioId,
          display_name: displayName || `${brokerLabel} Account`,
          broker_label: brokerLabel,
          provider: provider,
          environment: brokerEnv,
          execution_mode: executionMode,
          api_key: apiKey,
          secret_key: secretKey,
        }),
      });

      setModalSuccessMsg("Broker conectado y capital sincronizado exitosamente.");
      await loadPortfolios();
      setTimeout(() => {
        setActiveModalPort(null);
      }, 1500);
    } catch (err: any) {
      setBrokerError(err.message || "Error al vincular cuenta de broker.");
    }
  };

  const handleSyncBroker = async (portfolioId: number) => {
    setSyncingBroker(true);
    setBrokerError(null);
    try {
      const res = await fetchApi(`/portfolios/${portfolioId}/sync-broker/`, {
        method: "POST",
      });
      if (res && res.success) {
        setModalSuccessMsg("Capital sincronizado exitosamente con Alpaca.");
        await loadPortfolios();
        // Update current modal state
        if (activeModalPort && res.portfolio) {
          setActiveModalPort(res.portfolio);
        }
      }
    } catch (err: any) {
      setBrokerError(err.message || "Error al sincronizar con el broker.");
    } finally {
      setSyncingBroker(false);
    }
  };

  const handleDisconnectBroker = async (portfolioId: number) => {
    if (!confirm("¿Estás seguro de que deseas desvincular la cuenta de broker de este portafolio?")) {
      return;
    }
    setDisconnectingBroker(true);
    setBrokerError(null);
    try {
      await fetchApi(`/portfolios/${portfolioId}/disconnect-broker/`, {
        method: "POST",
      });
      setModalSuccessMsg("Broker desvinculado exitosamente.");
      await loadPortfolios();
      setTimeout(() => {
        setActiveModalPort(null);
      }, 1000);
    } catch (err: any) {
      setBrokerError(err.message || "Error al desvincular el broker.");
    } finally {
      setDisconnectingBroker(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center bg-white border border-slate-subtle rounded-2xl shadow-card-subtle space-y-3">
        <h2 className="font-heading font-bold text-lg text-navy">Inicia sesión para gestionar portafolios</h2>
        <p className="text-xs text-slate-muted">Accede con tu cuenta para vincular brokers y portafolios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-tech-blue hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="font-heading font-extrabold text-2xl text-navy">Gestión de Portafolios y Cuentas Broker</h1>
          <p className="text-xs text-slate-muted mt-1">
            Supervisa el capital, rendimiento y vincula tus cuentas de broker (Alpaca Paper / Live) para ejecutar las señales algorítmicas.
          </p>
        </div>

        <Link
          href="/allocations"
          className="flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all"
        >
          <Sliders className="w-4 h-4 text-emerald-success" />
          <span>Configurar Portafolios</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Portfolios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portfolios.map((port) => {
          const hasBroker = port.broker_accounts && port.broker_accounts.length > 0;
          const brokerAcc = port.primary_broker || (hasBroker ? port.broker_accounts[0] : null);
          const isPositive = (port.total_return_pct || 0) >= 0;

          return (
            <div
              key={port.id}
              className="bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-5">
                {/* Header of Card */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-heading font-bold text-xl text-navy">{port.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded font-black ${
                          port.kind === "live"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-tech-blue-light text-tech-blue"
                        }`}
                      >
                        {port.kind === "live" ? "Live (Dinero Real)" : "Paper (Simulador)"}
                      </span>
                      <span className="text-xs text-slate-muted font-mono">Moneda: {port.base_currency}</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      port.trading_enabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        port.trading_enabled ? "bg-emerald-success animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span>{port.trading_enabled ? "TRADING ACTIVO" : "PAUSADO"}</span>
                  </span>
                </div>

                {/* Capital & PnL Metrics Summary */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-canvas rounded-xl border border-slate-subtle">
                  <div>
                    <span className="text-[11px] font-bold text-slate-muted uppercase tracking-wider block">
                      Valor del Portafolio
                    </span>
                    <span className="text-xl font-black font-mono text-navy mt-0.5 block">
                      $
                      {Number(port.current_value || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[10px] text-slate-muted font-mono">
                      Base: ${Number(port.initial_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-muted uppercase tracking-wider block">
                      Retorno Total / PnL
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-base font-bold font-mono ${
                          isPositive ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {Number(port.total_return_pct || 0).toFixed(2)}%
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        isPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}$
                      {Number(port.total_pnl || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                </div>

                {/* Broker Connection Card */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-subtle pb-2">
                    <h3 className="text-xs uppercase font-bold text-slate-muted tracking-wider">
                      Conexión a Broker
                    </h3>

                    {/* Dynamic Action Button: + Vincular Broker vs Configurar Conexión */}
                    {hasBroker ? (
                      <button
                        onClick={() => handleOpenBrokerModal(port)}
                        className="flex items-center gap-1.5 text-xs font-bold text-navy hover:text-tech-blue bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-all"
                      >
                        <Settings className="w-3.5 h-3.5 text-tech-blue" />
                        <span>Configurar Conexión</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBrokerModal(port)}
                        className="flex items-center gap-1 text-xs font-bold text-tech-blue hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Vincular Broker</span>
                      </button>
                    )}
                  </div>

                  {hasBroker && brokerAcc ? (
                    <div className="p-4 bg-slate-canvas rounded-xl text-xs border border-slate-subtle space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-navy flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-tech-blue" />
                            <span>{brokerAcc.display_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white text-navy border border-slate-200">
                              {brokerAcc.environment?.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-slate-muted text-[11px] mt-1 font-mono">
                            {brokerAcc.broker_label} · Modo:{" "}
                            <span className="font-bold text-navy uppercase">{brokerAcc.execution_mode}</span>
                            {brokerAcc.external_account_id && ` · ID: ${brokerAcc.external_account_id}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-success animate-pulse" />
                          <span>Conectada</span>
                        </div>
                      </div>

                      {/* Broker Balance Details */}
                      {brokerAcc.order_policy && (
                        <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                          <div>
                            <span className="text-slate-muted block text-[10px]">BUYING POWER</span>
                            <span className="font-bold text-navy">
                              ${Number(brokerAcc.order_policy.buying_power || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-muted block text-[10px]">CASH DISPONIBLE</span>
                            <span className="font-bold text-navy">
                              ${Number(brokerAcc.order_policy.cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-canvas rounded-xl text-xs text-slate-muted border border-dashed border-slate-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-navy block">Sin broker externo vinculado</span>
                        <p className="text-[11px] text-slate-muted mt-0.5">
                          {port.kind === "paper"
                            ? "Simulador contable local activo. Puedes vincularlo a Alpaca Paper Trading para operar en sandbox real."
                            : "Vincula tu API de Alpaca Live para ejecutar órdenes con dinero real."}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenBrokerModal(port)}
                        className="flex-shrink-0 px-3 py-1.5 bg-tech-blue/10 hover:bg-tech-blue/20 text-tech-blue text-xs font-bold rounded-lg transition-all"
                      >
                        + Vincular Broker
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Configurar Portafolio */}
              <div className="pt-3 border-t border-slate-subtle">
                <Link
                  href={`/allocations?portfolio=${port.id}`}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-success" />
                    <span>Configurar Portafolio (Estrategias y Rebalanceo)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Gestionar / Vincular Conexión a Broker */}
      {activeModalPort && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl max-w-lg w-full shadow-card-hover space-y-4 my-8">
            <div className="flex justify-between items-start border-b border-slate-subtle pb-3">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-navy flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-tech-blue" />
                  {activeModalPort.broker_accounts?.length > 0 && !isEditingCredentials
                    ? "Gestión de Conexión a Broker"
                    : "Vincular Cuenta de Broker"}
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Portafolio: <strong>{activeModalPort.name}</strong> ({activeModalPort.kind.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setActiveModalPort(null)}
                className="text-slate-muted hover:text-navy text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {brokerError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{brokerError}</span>
              </div>
            )}

            {modalSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-success flex-shrink-0" />
                <span>{modalSuccessMsg}</span>
              </div>
            )}

            {/* If broker is connected and NOT in edit mode -> Show current status & sync & options */}
            {activeModalPort.broker_accounts?.length > 0 && !isEditingCredentials ? (
              <div className="space-y-4">
                {activeModalPort.broker_accounts.map((acc: any) => (
                  <div key={acc.id} className="p-4 bg-slate-canvas rounded-xl border border-slate-subtle space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-navy text-sm flex items-center gap-2">
                          <span>{acc.display_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white text-navy border border-slate-200">
                            {acc.environment.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-muted font-mono">
                          {acc.broker_label} · ID: {acc.external_account_id || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success" />
                        <span>Activo</span>
                      </div>
                    </div>

                    {/* Capital Overview */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-muted uppercase block">Capital Gestionado</span>
                        <span className="font-bold text-base text-navy">
                          ${Number(acc.managed_capital || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-muted uppercase block">Buying Power</span>
                        <span className="font-bold text-base text-tech-blue">
                          ${Number(acc.order_policy?.buying_power || acc.managed_capital || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-muted uppercase block">Cash Disponible</span>
                        <span className="font-bold text-slate-700">
                          ${Number(acc.order_policy?.cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-muted uppercase block">Moneda</span>
                        <span className="font-bold text-slate-700">{acc.order_policy?.currency || "USD"}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Action Buttons in Connected State */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSyncBroker(activeModalPort.id)}
                    disabled={syncingBroker}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingBroker ? "animate-spin" : ""}`} />
                    <span>{syncingBroker ? "Sincronizando con Alpaca..." : "Sincronizar Capital y Balance Ahora"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingCredentials(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-navy text-xs font-bold rounded-xl border border-slate-subtle transition-all"
                  >
                    <Key className="w-3.5 h-3.5 text-tech-blue" />
                    <span>Actualizar / Cambiar Credenciales API</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDisconnectBroker(activeModalPort.id)}
                    disabled={disconnectingBroker}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>{disconnectingBroker ? "Desvinculando..." : "Desvincular / Eliminar Conexión de Broker"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Add or Edit Credentials Form */
              <form onSubmit={(e) => handleAddOrUpdateBroker(e, activeModalPort.id)} className="space-y-4">
                {activeModalPort.broker_accounts?.length > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-subtle">
                    <span className="text-xs text-slate-muted">Modo edición de credenciales</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingCredentials(false)}
                      className="text-xs font-bold text-tech-blue hover:underline"
                    >
                      ← Volver a Estado de Cuenta
                    </button>
                  </div>
                )}

                {/* Broker Provider Selection */}
                <div>
                  <label className="text-xs text-navy font-bold block mb-1">1. Broker / Plataforma</label>
                  <select
                    value={brokerLabel}
                    onChange={(e) => {
                      setBrokerLabel(e.target.value);
                      if (e.target.value === "Alpaca") {
                        setProvider("alpaca");
                        setExecutionMode("auto");
                      } else {
                        setProvider("manual");
                        setExecutionMode("manual");
                      }
                    }}
                    className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-tech-blue"
                  >
                    <option value="Alpaca">Alpaca Markets (API Automatizada)</option>
                    <option value="eToro">eToro (Manual / Alertas Telegram)</option>
                    <option value="Interactive Brokers">Interactive Brokers (Manual / Fase 1)</option>
                  </select>
                </div>

                {/* Environment & Descriptive Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-navy font-bold block mb-1">Nombre Descriptivo</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ej. Alpaca Paper Principal"
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-tech-blue"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-navy font-bold block mb-1">Entorno</label>
                    <select
                      value={brokerEnv}
                      onChange={(e) => setBrokerEnv(e.target.value)}
                      className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-tech-blue"
                    >
                      {activeModalPort.kind === "paper" ? (
                        <option value="paper">Paper / Sandbox (paper-api.alpaca.markets)</option>
                      ) : (
                        <option value="live">Live Trading (Dinero Real)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Alpaca API Credentials Input Section */}
                {provider === "alpaca" && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-tech-blue" />
                        Credenciales API de Alpaca
                      </span>
                      <a
                        href="https://app.alpaca.markets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-tech-blue hover:underline font-bold flex items-center gap-1"
                      >
                        <span>Dashboard Alpaca</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div>
                      <label className="text-[11px] text-navy font-bold block mb-0.5">
                        API Key ID (ej. PK...)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="PK..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-white border border-slate-subtle text-navy rounded-lg p-2 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-navy font-bold block mb-0.5">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••••••••••••••••••••••"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        className="w-full bg-white border border-slate-subtle text-navy rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-tech-blue"
                      />
                    </div>

                    {/* Ping Test Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={testingPing || !apiKey || !secretKey}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 text-navy font-bold text-xs rounded-lg border border-slate-300 transition-all disabled:opacity-50"
                      >
                        {testingPing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-tech-blue rounded-full animate-spin" />
                            <span>Verificando conexión con Alpaca...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Probar Conexión (Ping Alpaca)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Ping Success Banner with Available Capital Notice */}
                    {pingResult && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1.5 animate-fade-in">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-success" />
                          <span>¡Conexión exitosa! Cuenta Alpaca ({pingResult.status?.toUpperCase()})</span>
                        </div>
                        <p className="text-[11px] text-emerald-900 font-semibold">
                          Esta cuenta tiene disponible{" "}
                          <span className="font-black text-navy font-mono">
                            ${Number(pingResult.portfolio_value || pingResult.cash || 0).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {pingResult.currency}
                          </span>{" "}
                          de capital (Buying Power: ${Number(pingResult.buying_power || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}).
                        </p>
                        <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-emerald-200/60 flex justify-between">
                          <span>Cuenta #{pingResult.account_number || pingResult.account_id?.slice(0, 8)}</span>
                          <span>Cash: ${Number(pingResult.cash || 0).toLocaleString("en-US")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveModalPort(null)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-muted rounded-xl text-xs font-bold border border-slate-subtle transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white font-bold rounded-xl text-xs shadow-navy-glow transition-all"
                  >
                    Guardar y Conectar Broker
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
