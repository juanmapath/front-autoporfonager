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
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPortName, setNewPortName] = useState("");
  const [newPortKind, setNewPortKind] = useState("paper");
  const [createError, setCreateError] = useState<string | null>(null);

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
        setSelectedId(data[0].id);
        loadPositions(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async (portId: number) => {
    try {
      const posData = await fetchApi(`/portfolios/${portId}/positions/`);
      setPositions(posData || []);
    } catch (e) {
      setPositions([]);
    }
  };

  const handleSelectPortfolio = (portId: number) => {
    setSelectedId(portId);
    loadPositions(portId);
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await fetchApi("/portfolios/", {
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
      loadPortfolios();
    } catch (err: any) {
      setCreateError(err.message || "Error al crear portafolio.");
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

  return (
    <div className="space-y-6">
      {/* Portfolio Selector Header with direct navigation to manage portfolios */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-navy">Centro de Portafolios</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
              {user?.plan || "PRO"}
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Cuenta activa: <strong className="text-navy font-semibold">{user?.email}</strong> · Motor de Rebalanceo Cuantitativo
          </p>
        </div>

        {/* Portfolio Tabs & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {portfolios.map((p) => {
            const isSelected = activePort?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPortfolio(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-navy text-white shadow-navy-glow"
                    : "bg-white border border-slate-subtle text-navy hover:bg-slate-50 shadow-card-subtle"
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

          <Link
            href="/portfolios"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-canvas hover:bg-slate-100 text-navy rounded-xl text-xs font-bold border border-slate-subtle transition-all"
            title="Ver todos los portafolios y vincular cuentas de broker"
          >
            <Building2 className="w-3.5 h-3.5 text-tech-blue" />
            <span>Gestionar Portafolios</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-navy rounded-xl text-xs font-bold border border-slate-subtle shadow-card-subtle transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-tech-blue" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
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

      {/* Main Stats when portfolio exists */}
      {activePort && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
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

            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
              <div className="flex justify-between items-center text-slate-muted">
                <span className="text-[11px] uppercase tracking-wider font-bold">Tipo de Entorno</span>
                <div className="w-7 h-7 rounded-lg bg-tech-blue-light flex items-center justify-center text-tech-blue">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold uppercase font-heading text-navy flex items-center gap-2">
                <span>{activePort.kind}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activePort.kind === "live"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-tech-blue-light text-tech-blue"
                  }`}
                >
                  {activePort.kind === "live" ? "Broker Real" : "Simulado"}
                </span>
              </div>
              <div className="text-xs text-slate-muted">
                <Link href="/portfolios" className="text-tech-blue hover:underline font-semibold flex items-center gap-1">
                  <span>{activePort.kind === "live" ? "Gestionar brokers" : "Ver configuración"}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
              <div className="flex justify-between items-center text-slate-muted">
                <span className="text-[11px] uppercase tracking-wider font-bold">Estrategias Asignadas</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-navy">
                  <Sliders className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-heading text-navy">{activeAllocs.length} Mangas</div>
              <div className="text-xs text-slate-muted">
                <Link href="/allocations" className="text-tech-blue hover:underline font-semibold flex items-center gap-1">
                  <span>Configurar asignaciones (%)</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
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

          {/* Allocations & Positions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategy Allocations Card */}
            <div className="lg:col-span-1 bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-subtle pb-3">
                <h2 className="font-heading font-bold text-base text-navy">Estrategias en este Portafolio</h2>
                <Link href="/allocations" className="text-xs font-bold text-tech-blue hover:underline flex items-center gap-1">
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
                  <div className="pt-2">
                    <Link
                      href="/allocations"
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5 text-tech-blue" />
                      <span>Ajustar Distribución de Capital</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-muted bg-slate-canvas rounded-xl space-y-3">
                  <p>No tienes estrategias asignadas a este portafolio.</p>
                  <Link
                    href="/allocations"
                    className="inline-block px-4 py-2 bg-navy hover:bg-navy-hover text-white rounded-xl text-xs font-bold shadow-navy-glow transition-all"
                  >
                    Asignar Estrategias
                  </Link>
                </div>
              )}
            </div>

            {/* Positions Table */}
            <div className="lg:col-span-2 bg-white border border-slate-subtle rounded-2xl p-6 shadow-card-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-subtle pb-3">
                <div>
                  <h2 className="font-heading font-bold text-base text-navy">Posiciones Lógicas en Base de Datos</h2>
                  <p className="text-xs text-slate-muted mt-0.5">Sincronizadas y conciliadas con órdenes MOC</p>
                </div>
              </div>

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
                <div className="p-10 text-center text-xs text-slate-muted bg-slate-canvas rounded-xl border border-dashed border-slate-subtle">
                  No hay posiciones abiertas actualmente. Se generarán automáticamente cuando las estrategias emitan señales de compra en la ventana de mercado.
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
    </div>
  );
}
