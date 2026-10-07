"use client";

import { History, CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, ShieldCheck, Filter } from "lucide-react";

export default function OrdersPage() {
  const sampleOrders = [
    {
      id: "ord_001",
      client_order_id: "run_42_ba_alpaca_inst_QQQ_a9b1",
      symbol: "QQQ",
      side: "BUY",
      qty: "15.00",
      price: "$482.10",
      type: "MOC (Market-On-Close)",
      source: "Alpaca API (AUTO)",
      status: "FILLED",
      timestamp: "2026-10-02 16:00 ET",
    },
    {
      id: "ord_002",
      client_order_id: "run_42_ba_etoro_inst_TLT_c3d4",
      symbol: "TLT",
      side: "SELL",
      qty: "30.00",
      price: "$92.40",
      type: "MOC (Market-On-Close)",
      source: "Simulated Manual + Telegram",
      status: "FILLED",
      timestamp: "2026-10-02 15:45 ET",
    },
    {
      id: "ord_003",
      client_order_id: "run_41_ba_alpaca_inst_SPY_e5f6",
      symbol: "SPY",
      side: "BUY",
      qty: "20.00",
      price: "$540.80",
      type: "MOC (Market-On-Close)",
      source: "Alpaca API (AUTO)",
      status: "FILLED",
      timestamp: "2026-09-30 16:00 ET",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-subtle p-6 rounded-2xl shadow-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-navy">Auditoría de Órdenes y Ejecución (Fills)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              AUDITADO
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Registro inmutable de todas las órdenes despachadas hacia Alpaca (MOC) y ejecuciones manuales notificadas a Telegram.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-subtle rounded-2xl shadow-card-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-navy">
            <thead className="bg-slate-canvas text-slate-muted uppercase font-bold text-[10px] tracking-wider border-b border-slate-subtle">
              <tr>
                <th className="p-4">Client Order ID</th>
                <th className="p-4">Activo</th>
                <th className="p-4">Operación</th>
                <th className="p-4">Cantidad</th>
                <th className="p-4">Precio Fill</th>
                <th className="p-4">Fuente / Broker</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Hora Ejecución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-subtle font-sans">
              {sampleOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-muted text-[11px]">{o.client_order_id}</td>
                  <td className="p-4 font-heading font-bold text-sm text-navy">{o.symbol}</td>
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
                  <td className="p-4 font-mono font-bold text-navy">{o.price}</td>
                  <td className="p-4 text-slate-muted font-medium">{o.source}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-success" />
                      <span>{o.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-slate-muted font-mono text-[11px]">{o.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
