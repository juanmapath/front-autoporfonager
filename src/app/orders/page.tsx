"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (data && data.length > 0) {
        setSelectedPortId(data[0].id);
        loadOrders(data[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar portafolios.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (portId: number) => {
    setLoading(true);
    try {
      const data = await fetchApi(`/portfolios/${portId}/orders/`);
      setOrders(data || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar órdenes.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePortChange = (portId: number) => {
    setSelectedPortId(portId);
    loadOrders(portId);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center bg-white border border-slate-subtle rounded-2xl shadow-card-subtle space-y-3">
        <h2 className="font-heading font-bold text-lg text-navy">Inicia sesión para auditar órdenes</h2>
        <p className="text-xs text-slate-muted">Accede con tu cuenta para visualizar el registro inmutable de fills.</p>
      </div>
    );
  }

  const activePort = portfolios.find((p) => p.id === selectedPortId) || portfolios[0];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-tech-blue hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-navy">Auditoría de Órdenes y Fills</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              AUDITADO
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Registro inmutable de todas las órdenes despachadas hacia Alpaca (MOC) y ejecuciones manuales notificadas a Telegram.
          </p>
        </div>

        {/* Portfolio Selector */}
        {portfolios.length > 0 && (
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
            <button
              onClick={() => selectedPortId && loadOrders(selectedPortId)}
              className="p-2 bg-slate-canvas hover:bg-slate-100 rounded-xl border border-slate-subtle text-slate-muted hover:text-navy transition-all"
              title="Refrescar órdenes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-subtle rounded-2xl shadow-card-subtle overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-navy">
              <thead className="bg-slate-canvas text-slate-muted uppercase font-bold text-[10px] tracking-wider border-b border-slate-subtle">
                <tr>
                  <th className="p-4">ID / Client Order ID</th>
                  <th className="p-4">Activo</th>
                  <th className="p-4">Operación</th>
                  <th className="p-4">Cantidad</th>
                  <th className="p-4">Fuente / Broker</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Hora Ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-subtle font-sans">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-slate-muted text-[11px]">{o.client_order_id || `#${o.id}`}</td>
                    <td className="p-4 font-heading font-bold text-sm text-navy">{o.instrument}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-lg border ${
                          o.side === "BUY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {o.side === "BUY" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        <span>{o.side}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono font-semibold">{o.qty}</td>
                    <td className="p-4 text-slate-muted font-medium capitalize">{o.source || "MOC Engine"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-success" />
                        <span>{o.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-muted font-mono text-[11px]">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-muted space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-navy">
              <History className="w-5 h-5 text-tech-blue" />
            </div>
            <h3 className="font-heading font-bold text-base text-navy">No hay órdenes registradas aún</h3>
            <p className="max-w-md mx-auto text-slate-muted">
              Las órdenes se generan automáticamente cuando las estrategias activas emiten señales de compra o venta en la ventana de mercado (15:35 - 15:48 ET).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
