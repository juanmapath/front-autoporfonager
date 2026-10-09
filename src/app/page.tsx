"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  Layers,
  Sliders,
  ShieldCheck,
  Plus,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Activity,
  Zap,
  Building2,
  RefreshCw,
  History,
  AlertCircle,
  ExternalLink,
  Settings,
  Key,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");

  // Create Portfolio Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPortName, setNewPortName] = useState("");
  const [newPortKind, setNewPortKind] = useState("paper");
  const [createError, setCreateError] = useState<string | null>(null);

  // Broker Modal & Connection Management State
  const [activeModalPort, setActiveModalPort] = useState<any | null>(null);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [syncingBroker, setSyncingBroker] = useState(false);
  const [disconnectingBroker, setDisconnectingBroker] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  const [brokerLabel, setBrokerLabel] = useState("Alpaca");
  const [displayName, setDisplayName] = useState("");
  const [executionMode, setExecutionMode] = useState("auto");
  const [provider, setProvider] = useState("alpaca");
  const [brokerEnv, setBrokerEnv] = useState<string>("paper");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);
  const [brokerError, setBrokerError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortfolios();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/portfolios/");
      setPortfolios(data || []);
      if (data && data.length > 0) {
        const initialId = selectedId || data[0].id;
        setSelectedId(initialId);
        loadPortfolioDetails(initialId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioDetails = async (portId: number) => {
    try {
      const [posData, ordersData] = await Promise.all([
        fetchApi(`/portfolios/${portId}/positions/`).catch(() => []),
        fetchApi(`/portfolios/${portId}/orders/`).catch(() => []),
      ]);
      setPositions(posData || []);
      setRecentOrders(ordersData || []);
    } catch (e) {
      setPositions([]);
      setRecentOrders([]);
    }
  };

  const handleSelectPortfolio = (portId: number) => {
    setSelectedId(portId);
    loadPortfolioDetails(portId);
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const res = await fetchApi("/portfolios/", {
        method: "POST",
        body: JSON.stringify({
          name: newPortName || "Mi Portafolio",
          kind: newPortKind,
          base_currency: "USD",
          paper_initial_capital: 100000.0,
          trading_enabled: true,
        }),
      });
      setShowCreateModal(false);
      setNewPortName("");
      if (res && res.id) {
        setSelectedId(res.id);
      }
      loadPortfolios();
    } catch (err: any) {
      setCreateError(err.message || "Error al crear portafolio.");
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-subtle border-t-tech-blue"></div>
      </div>
    );
  }

  // If unauthenticated, show clean landing with only login CTA
  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto my-8 space-y-12">
        {/* Hero Section */}
        <div className="bg-white border border-slate-subtle rounded-3xl p-8 sm:p-14 shadow-card-subtle text-center space-y-6 relative overflow-hidden">
          {/* Subtle top decoration */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-navy via-tech-blue to-emerald-success" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success" />
            <span>Control total · Cero fricción · Tranquilidad visible</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-navy tracking-tight max-w-3xl mx-auto leading-tight">
            Trading Cuantitativo con Validación Institucional en Tiempo Real
          </h1>

          <p className="text-sm sm:text-base text-slate-muted max-w-2xl mx-auto leading-relaxed">
            Administra portafolios multi-estrategia, optimiza tus asignaciones algorítmicas y ejecuta rebalanceos automáticos en la ventana de cierre de mercado (MOC) con auditoría inmutable.
          </p>

          <div className="flex justify-center items-center pt-4">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-navy hover:bg-navy-hover text-white text-sm font-bold rounded-xl shadow-navy-glow transition-all"
            >
              <LogIn className="w-4 h-4 text-emerald-success" />
              <span>Iniciar Sesión / Acceso a la Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars of Authority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-subtle p-7 rounded-2xl shadow-card-subtle space-y-3">
            <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-success" />
            </div>
            <h2 className="font-heading font-bold text-lg text-navy">Solidez Bancaria</h2>
            <p className="text-xs text-slate-muted leading-relaxed">
              Base Deep Navy que garantiza auditoría rigurosa, reconciliación matemática y seguridad institucional de nivel corporativo.
            </p>
          </div>

          <div className="bg-white border border-slate-subtle p-7 rounded-2xl shadow-card-subtle space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5 text-emerald-success" />
            </div>
            <h2 className="font-heading font-bold text-lg text-navy">Validación en Vivo</h2>
            <p className="text-xs text-slate-muted leading-relaxed">
              Confirmación de fondos reales y conciliación instantánea para que cada manga opere con paz mental y transparencia.
            </p>
          </div>

          <div className="bg-white border border-slate-subtle p-7 rounded-2xl shadow-card-subtle space-y-3">
            <div className="w-10 h-10 rounded-xl bg-tech-blue-light border border-tech-blue/20 flex items-center justify-center text-tech-blue">
              <Zap className="w-5 h-5 text-tech-blue" />
            </div>
            <h2 className="font-heading font-bold text-lg text-navy">Ejecución MOC Eficiente</h2>
            <p className="text-xs text-slate-muted leading-relaxed">
              Enrutamiento inteligente de órdenes automáticas hacia Alpaca y alertas instantáneas a Telegram para cuentas manuales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activePort = portfolios.find((p) => p.id === selectedId) || portfolios[0];
  const initialCap = activePort ? parseFloat(activePort.paper_initial_capital || "100000") : 100000;
  const activeAllocs = activePort?.allocations || [];
  const brokerAccounts = activePort?.broker_accounts || [];
  const hasBroker = brokerAccounts.length > 0;
  const primaryBroker = activePort?.primary_broker || (hasBroker ? brokerAccounts[0] : null);
  const isPositiveReturn = (activePort?.total_return_pct || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Empty State when no portfolios exist */}
      {portfolios.length === 0 && !loading && (
        <div className="p-12 text-center bg-white border border-slate-subtle rounded-2xl shadow-card-subtle space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-tech-blue-light flex items-center justify-center mx-auto text-tech-blue">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-bold text-lg text-navy">No tienes portafolios creados aún</h2>
          <p className="text-xs text-slate-muted max-w-sm mx-auto">
            Crea tu primer portafolio Paper con capital simulado para comenzar a probar estrategias algorítmicas.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-success" />
            <span>Crear Mi Primer Portafolio</span>
          </button>
        </div>
      )}

      {/* Active Portfolio Comprehensive View */}
      {activePort && (
        <>
          {/* Main Top Cards: Portfolio Selector + Capital + Trading Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Portfolio Selector & Quick Creation (Spans 2 columns on lg) */}
            <div className="lg:col-span-2 bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-muted">
                    Portafolio Activo
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      activePort.kind === "live"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-tech-blue-light text-tech-blue border border-tech-blue/20"
                    }`}
                  >
                    {activePort.kind === "live" ? "Broker Real" : "Simulado Paper"}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-xs font-bold shadow-navy-glow transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-success" />
                  <span>Nuevo Portafolio</span>
                </button>
              </div>

              {/* Portfolio Switcher Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                {portfolios.map((p) => {
                  const isSelected = activePort?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPortfolio(p.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                        isSelected
                          ? "bg-navy text-white shadow-sm"
                          : "bg-slate-canvas border border-slate-subtle text-navy hover:bg-slate-100"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${
                          p.kind === "live"
                            ? isSelected
                              ? "bg-amber-400 text-navy"
                              : "bg-amber-100 text-amber-800"
                            : isSelected
                            ? "bg-tech-blue text-white"
                            : "bg-tech-blue-light text-tech-blue"
                        }`}
                      >
                        {p.kind}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Capital del Portafolio */}
            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-muted">
                <span className="text-[11px] uppercase tracking-wider font-bold">Capital del Portafolio</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-success">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-navy">
                ${initialCap.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-muted flex items-center gap-1">
                <span>Moneda base:</span>
                <span className="font-bold text-navy">{activePort.base_currency}</span>
              </div>
            </div>

            {/* Card 3: Estado de Trading */}
            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-muted">
                <span className="text-[11px] uppercase tracking-wider font-bold">Estado de Trading</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-success">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${activePort.trading_enabled ? "bg-emerald-success animate-pulse" : "bg-amber-500"}`} />
                <span className={`text-2xl font-bold font-heading ${activePort.trading_enabled ? "text-emerald-700" : "text-amber-700"}`}>
                  {activePort.trading_enabled ? "ACTIVO" : "PAUSADO"}
                </span>
              </div>
              <div className="text-xs text-slate-muted font-mono">Ventana MOC: 15:35 - 15:48 ET</div>
            </div>
          </div>

          {/* Grid with 2 Core Columns: Left Column (Strategy Allocations & Broker), Right Column (Positions & Orders Tabs) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Strategy Distribution & Broker Accounts */}
            <div className="lg:col-span-1 space-y-6">
              {/* Strategy Allocations Card (Top) */}
              <div className="bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-slate-subtle pb-3">
                  <div>
                    <h2 className="font-heading font-bold text-base text-navy">Estrategias Asignadas</h2>
                    <p className="text-xs text-slate-muted">Distribución de capital ({activeAllocs.length} mangas)</p>
                  </div>
                  <Link href={`/allocations?portfolio=${activePort.id}`} className="text-xs font-bold text-tech-blue hover:underline flex items-center gap-1">
                    <span>Editar %</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {activeAllocs.length > 0 ? (
                  <div className="space-y-3">
                    {activeAllocs.map((alloc: any) => {
                      const pct = (parseFloat(alloc.target_weight) * 100).toFixed(0);
                      return (
                        <div key={alloc.id} className="bg-slate-canvas p-3.5 rounded-xl border border-slate-subtle space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-navy">{alloc.strategy_name || `Estrategia #${alloc.strategy}`}</span>
                            <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-success h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-1">
                      <Link
                        href={`/allocations?portfolio=${activePort.id}`}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all"
                      >
                        <Sliders className="w-3.5 h-3.5 text-tech-blue" />
                        <span>Ajustar Distribución de Capital (%)</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-muted bg-slate-canvas rounded-xl space-y-3">
                    <p>No tienes estrategias asignadas a este portafolio.</p>
                    <Link
                      href={`/allocations?portfolio=${activePort.id}`}
                      className="inline-block px-4 py-2 bg-navy hover:bg-navy-hover text-white rounded-xl text-xs font-bold shadow-navy-glow transition-all"
                    >
                      Asignar Estrategias
                    </Link>
                  </div>
                )}
              </div>

              {/* Broker Accounts Management Card (Bottom) */}
              <div className="bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-slate-subtle pb-3">
                  <div>
                    <h2 className="font-heading font-bold text-base text-navy">Conexión a Broker</h2>
                    <p className="text-xs text-slate-muted">Cuentas vinculadas ({brokerAccounts.length}/5)</p>
                  </div>
                  <button
                    onClick={() => handleOpenBrokerModal(activePort)}
                    className="flex items-center gap-1.5 text-xs font-bold text-navy hover:text-tech-blue bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-all"
                  >
                    {hasBroker ? <Settings className="w-3.5 h-3.5 text-tech-blue" /> : <Plus className="w-3.5 h-3.5 text-tech-blue" />}
                    <span>{hasBroker ? "Gestionar" : "+ Vincular"}</span>
                  </button>
                </div>

                {hasBroker && primaryBroker ? (
                  <div className="p-4 bg-slate-canvas rounded-xl text-xs border border-slate-subtle space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-navy flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-tech-blue" />
                          <span>{primaryBroker.display_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white text-navy border border-slate-200">
                            {primaryBroker.environment?.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-slate-muted text-[11px] mt-1 font-mono">
                          {primaryBroker.broker_label} · Modo:{" "}
                          <span className="font-bold text-navy uppercase">{primaryBroker.execution_mode}</span>
                          {primaryBroker.external_account_id && ` · ID: ${primaryBroker.external_account_id}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-success animate-pulse" />
                        <span>Conectada</span>
                      </div>
                    </div>

                    {/* Broker Balance Details */}
                    {primaryBroker.order_policy && (
                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                        <div>
                          <span className="text-slate-muted block text-[10px]">BUYING POWER</span>
                          <span className="font-bold text-navy">
                            ${Number(primaryBroker.order_policy.buying_power || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-muted block text-[10px]">CASH DISPONIBLE</span>
                          <span className="font-bold text-navy">
                            ${Number(primaryBroker.order_policy.cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-canvas rounded-xl text-xs text-slate-muted border border-dashed border-slate-subtle space-y-2">
                    <span className="font-bold text-navy block">Sin broker externo vinculado</span>
                    <p className="text-[11px] text-slate-muted">
                      {activePort.kind === "paper"
                        ? "Simulador contable local activo. Puedes vincular Alpaca Paper Trading para operar en sandbox real."
                        : "Vincula tu cuenta API de Alpaca Live para ejecutar órdenes con dinero real."}
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => handleOpenBrokerModal(activePort)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-navy text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-success" />
                        <span>Vincular Broker</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Tabbed View for Positions and Recent Orders */}
            <div className="lg:col-span-2 bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-5">
              {/* Tabs Switcher Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-subtle pb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("positions")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === "positions"
                        ? "bg-navy text-white shadow-navy-glow"
                        : "bg-slate-canvas text-navy hover:bg-slate-100 border border-slate-subtle"
                    }`}
                  >
                    <span>Posiciones Lógicas</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
                      {positions.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === "orders"
                        ? "bg-navy text-white shadow-navy-glow"
                        : "bg-slate-canvas text-navy hover:bg-slate-100 border border-slate-subtle"
                    }`}
                  >
                    <span>Órdenes & Fills Recientes</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
                      {recentOrders.length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadPortfolioDetails(activePort.id)}
                    className="p-2 bg-slate-canvas hover:bg-slate-100 rounded-xl border border-slate-subtle text-slate-muted hover:text-navy transition-all"
                    title="Actualizar datos"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/orders"
                    className="text-xs font-bold text-tech-blue hover:underline flex items-center gap-1"
                  >
                    <span>Auditoría Completa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Tab 1: Positions Table */}
              {activeTab === "positions" && (
                <div>
                  {positions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-navy">
                        <thead className="bg-slate-canvas text-slate-muted uppercase font-bold text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3 rounded-l-lg">Activo</th>
                            <th className="p-3">Estrategia</th>
                            <th className="p-3">Cantidad</th>
                            <th className="p-3">Precio Medio</th>
                            <th className="p-3 rounded-r-lg">PnL Realizado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-subtle">
                          {positions.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-navy">{p.instrument}</td>
                              <td className="p-3 text-slate-muted">{p.strategy}</td>
                              <td className="p-3 font-mono font-semibold">{p.qty}</td>
                              <td className="p-3 font-mono text-slate-muted">${p.avg_cost}</td>
                              <td className="p-3 font-mono font-bold text-emerald-success">
                                ${p.realized_pnl}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-xs text-slate-muted bg-slate-canvas rounded-xl border border-dashed border-slate-subtle space-y-2">
                      <p className="font-semibold text-navy">No hay posiciones abiertas actualmente</p>
                      <p>Se generarán automáticamente cuando las estrategias emitan señales de compra en la ventana de mercado (15:35 - 15:48 ET).</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Recent Orders Table (Live Data from API) */}
              {activeTab === "orders" && (
                <div>
                  {recentOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-navy">
                        <thead className="bg-slate-canvas text-slate-muted uppercase font-bold text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3 rounded-l-lg">ID / Client ID</th>
                            <th className="p-3">Activo</th>
                            <th className="p-3">Lado</th>
                            <th className="p-3">Cantidad</th>
                            <th className="p-3">Fuente</th>
                            <th className="p-3 rounded-r-lg">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-subtle">
                          {recentOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-slate-muted text-[11px]">{o.client_order_id || `#${o.id}`}</td>
                              <td className="p-3 font-bold text-navy">{o.instrument}</td>
                              <td className="p-3 font-bold">
                                <span className={o.side === "BUY" ? "text-emerald-700" : "text-amber-700"}>
                                  {o.side}
                                </span>
                              </td>
                              <td className="p-3 font-mono">{o.qty}</td>
                              <td className="p-3 text-slate-muted capitalize">{o.source || "MOC"}</td>
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-xs text-slate-muted bg-slate-canvas rounded-xl border border-dashed border-slate-subtle space-y-2">
                      <p className="font-semibold text-navy">No hay órdenes recientes registradas</p>
                      <p>Las órdenes enviadas a brokers o notificadas a Telegram se auditarán aquí en tiempo real.</p>
                      <div className="pt-2">
                        <Link
                          href="/orders"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-navy text-white text-xs font-bold rounded-xl shadow-sm"
                        >
                          <History className="w-3.5 h-3.5 text-tech-blue" />
                          <span>Ir al Historial Completo</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-subtle p-6 rounded-2xl max-w-md w-full shadow-card-hover space-y-4">
            <h2 className="font-heading font-bold text-lg text-navy">Crear Nuevo Portafolio</h2>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label className="text-xs text-navy font-bold block mb-1">Nombre del Portafolio</label>
                <input
                  type="text"
                  required
                  value={newPortName}
                  onChange={(e) => setNewPortName(e.target.value)}
                  placeholder="ej. Portafolio Alpha Tech"
                  className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
                />
              </div>

              <div>
                <label className="text-xs text-navy font-bold block mb-1">Tipo de Portafolio</label>
                <select
                  value={newPortKind}
                  onChange={(e) => setNewPortKind(e.target.value)}
                  className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
                >
                  <option value="paper">Paper (Simulado sin broker - Máx 3)</option>
                  <option value="live">Live (Dinero real / Brokers - Máx 1)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-muted rounded-xl text-xs font-bold border border-slate-subtle transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white font-bold rounded-xl text-xs shadow-navy-glow transition-all"
                >
                  Crear Portafolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar / Vincular Conexión a Broker (Full-featured with Ping & Sync) */}
      {activeModalPort && (
        <div className="fixed inset-0 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-subtle rounded-2xl max-w-lg w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-subtle flex justify-between items-start flex-shrink-0 bg-white">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-navy flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-tech-blue" />
                  <span>
                    {activeModalPort.broker_accounts?.length > 0 && !isEditingCredentials
                      ? "Gestión de Conexión a Broker"
                      : "Vincular Cuenta de Broker"}
                  </span>
                </h2>
                <p className="text-xs text-slate-muted mt-0.5">
                  Portafolio: <strong>{activeModalPort.name}</strong> ({activeModalPort.kind.toUpperCase()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalPort(null)}
                className="text-slate-muted hover:text-navy text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
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
                            {acc.environment?.toUpperCase()}
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
        </div>
      )}
    </div>
  );
}
