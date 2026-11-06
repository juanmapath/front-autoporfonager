"use client";

import { Plus, Trash2 } from "lucide-react";

/**
 * Editor de la política de apalancamiento de un bot. Las opciones salen del catálogo del back
 * (`leverage_catalog` de /ops/strategies/): una táctica nueva aparece aquí sin tocar el front.
 */

export type LeverageCatalog = {
  policies: { key: string; name: string; description: string; needs_regimes?: boolean; defaults?: any }[];
  layers: { key: string; kind: "scaler" | "cap" | "label"; name: string; description: string; defaults: Record<string, any>; experimental?: boolean }[];
  providers: { key: string; name: string; available: boolean }[];
};

const KIND_LISTS: { kind: "scaler" | "cap" | "label"; list: "scalers" | "caps" | "label_policies"; title: string; hint: string }[] = [
  { kind: "scaler", list: "scalers", title: "Escaladores", hint: "Multiplican el apalancamiento base." },
  { kind: "cap", list: "caps", title: "Topes", hint: "Limitan el apalancamiento máximo de hoy (se toma el menor)." },
  { kind: "label", list: "label_policies", title: "Políticas de etiqueta", hint: "Apalancamiento desde el régimen y los trades pasados." },
];

const PARAM_LABELS: Record<string, string> = {
  target_vol: "Volatilidad objetivo", estimator: "Estimador", lambda: "Lambda EWMA", ref: "Referencia",
  sma: "Media móvil (días)", band: "Banda", cap_below: "Tope bajo la media", threshold: "Umbral VIX/VIX3M",
  cap: "Tope en estrés", ratio: "VIX / mediana", window: "Ventana (días)", drop: "Caída 20 días",
  change_window: "Días del cambio", p: "Percentil", dd_limit: "Límite de caída", min_trades: "Mín. trades",
  lookback_years: "Ventana (años)", fraction: "Fracción Kelly",
};

const inputCls =
  "w-full bg-white border border-slate-subtle text-navy rounded-xl p-2 text-xs font-mono font-bold focus:outline-none focus:border-tech-blue";

export default function LeveragePolicyEditor({
  catalog,
  value,
  onChange,
}: {
  catalog: LeverageCatalog | null;
  value: any;
  onChange: (v: any) => void;
}) {
  const policies = catalog?.policies?.length
    ? catalog.policies
    : [{ key: "fixed", name: "Fijo", description: "Siempre el apalancamiento base." }];
  const type = value?.type || "fixed";
  const current = policies.find((p) => p.key === type);
  const set = (patch: any) => onChange({ ...value, ...patch });

  const layerSpec = (key: string) => catalog?.layers.find((l) => l.key === key);

  const updateLayer = (list: string, idx: number, patch: any) => {
    const items = [...(value?.[list] || [])];
    items[idx] = { ...items[idx], params: { ...(items[idx]?.params || {}), ...patch } };
    set({ [list]: items });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-navy font-bold block mb-1">Táctica de apalancamiento</label>
        <select
          value={type}
          onChange={(e) => {
            const p = policies.find((x) => x.key === e.target.value);
            onChange({ type: e.target.value, ...(p?.defaults || {}) });
          }}
          className="w-full bg-slate-canvas border border-slate-subtle text-navy rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:border-tech-blue"
        >
          {policies.map((p) => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>
        {current && <p className="text-[11px] text-slate-muted mt-1">{current.description}</p>}
      </div>

      {type === "regime_pf" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-navy font-bold block mb-1">Proveedor de régimen</label>
            <select
              value={(value?.providers || ["macro"])[0]}
              onChange={(e) => set({ providers: [e.target.value] })}
              className={inputCls}
            >
              {(catalog?.providers || [{ key: "macro", name: "Macro", available: true }]).map((p) => (
                <option key={p.key} value={p.key} disabled={!p.available}>
                  {p.name}{p.available ? "" : " (próximamente)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-navy font-bold block mb-1">Mín. trades por régimen</label>
            <input type="number" min="1" step="1" className={inputCls} value={value?.min_trades ?? 3}
              onChange={(e) => set({ min_trades: Math.max(1, parseInt(e.target.value) || 1) })} />
          </div>
          <div>
            <label className="text-[11px] text-navy font-bold block mb-1">Ventana (años)</label>
            <input type="number" min="1" step="1" className={inputCls} value={value?.lookback_years ?? 15}
              onChange={(e) => set({ lookback_years: Math.max(1, parseFloat(e.target.value) || 15) })} />
          </div>
        </div>
      )}

      {type === "layered" && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-muted">
            L = clip(min(base × escaladores × etiquetas, topes), mínimo, máximo). Base y máximo son los apalancamientos del bot.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-navy font-bold block mb-1">Aplicar</label>
              <select className={inputCls} value={value?.apply || "daily"} onChange={(e) => set({ apply: e.target.value })}>
                <option value="daily">A diario</option>
                <option value="entry">Solo en la entrada</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-navy font-bold block mb-1">Mínimo</label>
              <input type="number" step="0.1" min="0" className={inputCls} value={value?.min ?? 1.0}
                onChange={(e) => set({ min: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-[11px] text-navy font-bold block mb-1">Cambio mínimo</label>
              <input type="number" step="0.05" min="0" className={inputCls} value={value?.min_change ?? 0.15}
                onChange={(e) => set({ min_change: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-[11px] text-navy font-bold block mb-1">Subida máx./semana</label>
              <input type="number" step="0.05" min="0" className={inputCls} value={value?.max_step_up ?? 0.25}
                onChange={(e) => set({ max_step_up: parseFloat(e.target.value) })} />
            </div>
          </div>

          {KIND_LISTS.map(({ kind, list, title, hint }) => {
            const items: any[] = value?.[list] || [];
            const options = (catalog?.layers || []).filter((l) => l.kind === kind);
            return (
              <div key={list} className="bg-slate-canvas rounded-xl border border-slate-subtle p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-navy">{title}</div>
                    <div className="text-[10px] text-slate-muted">{hint}</div>
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      set({ [list]: [...items, { key: e.target.value, params: {} }] });
                    }}
                    className="bg-white border border-slate-subtle text-tech-blue rounded-lg p-1.5 text-[11px] font-bold"
                    aria-label={`Agregar ${title.toLowerCase()}`}
                  >
                    <option value="">+ Agregar</option>
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>{o.name}</option>
                    ))}
                  </select>
                </div>
                {items.length === 0 && <div className="text-[11px] italic text-slate-400">Ninguno</div>}
                {items.map((item, idx) => {
                  const spec = layerSpec(item.key);
                  const params = { ...(spec?.defaults || {}), ...(item.params || {}) };
                  return (
                    <div key={`${item.key}-${idx}`} className="bg-white rounded-lg border border-slate-subtle p-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-navy">{spec?.name || item.key}</div>
                          <div className="text-[10px] text-slate-muted">{spec?.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => set({ [list]: items.filter((_, i) => i !== idx) })}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label="Quitar capa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(params).map(([k, v]) => (
                          <div key={k}>
                            <label className="text-[10px] text-slate-muted font-bold block mb-0.5">{PARAM_LABELS[k] || k}</label>
                            <input
                              className={inputCls}
                              type={typeof v === "number" ? "number" : "text"}
                              step="any"
                              value={v as any}
                              onChange={(e) =>
                                updateLayer(list, idx, {
                                  [k]: typeof v === "number" ? parseFloat(e.target.value) : e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {(value?.label_policies || []).length > 1 && (
            <div>
              <label className="text-[11px] text-navy font-bold block mb-1">Combinar etiquetas</label>
              <select className={inputCls} value={value?.combine_labels || "min"} onChange={(e) => set({ combine_labels: e.target.value })}>
                <option value="min">Mínimo (conservador)</option>
                <option value="mean">Promedio</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PlusIcon() {
  return <Plus className="w-3 h-3" />;
}
