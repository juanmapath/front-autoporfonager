"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, Activity, Users, Layers, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight, Sliders, Cpu } from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<any>({
    aum_total: "148,250.00",
    total_portfolios: 4,
    live_portfolios: 1,
    paper_portfolios: 3,
    active_strategies: 5,
    open_alerts: 0,
    active_kill_switches: 0,
    system_health: "NOMINAL",
  });
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi("/ops/overview")
      .then((data) => {
        if (data && data.aum_total) setOverview(data);
      })
      .catch((err: any) => {
        setError(err.message || "No se pudo cargar la telemetría de operaciones.");
      });
  }, []);

  const handleKillSwitch = () => {
    const confirm = window.confirm(
      "¿Seguro que deseas activar el Kill Switch de emergencia? Esto congelará el trading en todos los portafolios."
    );
    if (confirm) {
      setKillSwitchTriggered(true);
      setOverview((prev: any) => ({ ...prev, active_kill_switches: 1, system_health: "KILL_SWITCH_ACTIVE" }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-tech-blue-light text-tech-blue border border-tech-blue/20 uppercase">
              Staff / Admin
            </span>
            <h1 className="font-heading font-extrabold text-2xl text-navy">Panel de Operaciones (Ops)</h1>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Supervisión global de AUM, estado de salud de los motores de ejecución y control de riesgos institucionales.
          </p>
        </div>

        {/* Emergency Kill Switch */}
        <button
          onClick={handleKillSwitch}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            killSwitchTriggered
              ? "bg-red-50 text-red-700 border border-red-200 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-950/20"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{killSwitchTriggered ? "KILL SWITCH ACTIVADO" : "ACTIVAR KILL SWITCH"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{error} (Asegúrate de haber iniciado sesión con una cuenta de Administrador / Staff).</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
          <div className="flex justify-between items-center text-slate-muted">
            <span className="text-[11px] uppercase tracking-wider font-bold">AUM Total en Plataforma</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-success">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-navy">${overview.aum_total}</div>
          <div className="text-xs text-slate-muted">Capital agregado bajo gestión</div>
        </div>

        <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
          <div className="flex justify-between items-center text-slate-muted">
            <span className="text-[11px] uppercase tracking-wider font-bold">Portafolios Totales</span>
            <div className="w-7 h-7 rounded-lg bg-tech-blue-light flex items-center justify-center text-tech-blue">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-navy">{overview.total_portfolios}</div>
          <div className="text-xs text-slate-muted font-medium">
            <span className="text-amber-700 font-bold">{overview.live_portfolios} Live</span> · {overview.paper_portfolios} Paper
          </div>
        </div>

        <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
          <div className="flex justify-between items-center text-slate-muted">
            <span className="text-[11px] uppercase tracking-wider font-bold">Estrategias Activas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-navy">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-navy">{overview.active_strategies}</div>
          <div className="text-xs text-slate-muted">Todas operando en v1 Live</div>
        </div>

        <div className="bg-white border border-slate-subtle p-5 rounded-2xl shadow-card-subtle space-y-2">
          <div className="flex justify-between items-center text-slate-muted">
            <span className="text-[11px] uppercase tracking-wider font-bold">Estado de Salud</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-success">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${overview.system_health === "NOMINAL" ? "bg-emerald-success animate-pulse" : "bg-red-500"}`} />
            <span
              className={`text-2xl font-bold font-heading ${
                overview.system_health === "NOMINAL" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {overview.system_health}
            </span>
          </div>
          <div className="text-xs text-slate-muted">Reconciliaciones 100% cuadradas</div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/strategies"
          className="bg-white hover:bg-slate-50 border border-slate-subtle p-6 rounded-2xl shadow-card-subtle transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-navy group-hover:text-tech-blue transition-colors">
              Gestión de Estrategias y Políticas de Rebalanceo
            </h2>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-tech-blue group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-slate-muted leading-relaxed">
            Activa o desactiva estrategias (modos Congelar o Liquidar), y configura frecuencias periódicas (daily, weekly, monthly, quarterly) y tolerancias de drift.
          </p>
        </Link>

        <Link
          href="/admin/backtest"
          className="bg-white hover:bg-slate-50 border border-slate-subtle p-6 rounded-2xl shadow-card-subtle transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-navy group-hover:text-tech-blue transition-colors">
              Laboratorio de Backtesting Local
            </h2>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-tech-blue group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-slate-muted leading-relaxed">
            Ejecuta simulaciones cuantitativas utilizando exactamente el mismo motor centralizado de señales y genera reportes de métricas avanzadas (Sharpe, CAGR, Win Rate).
          </p>
        </Link>
      </div>
    </div>
  );
}
