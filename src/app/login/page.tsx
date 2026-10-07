"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      router.push("/");
    } else {
      setError(res.error || "Error al iniciar sesión.");
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-slate-subtle p-8 sm:p-10 rounded-3xl shadow-card-subtle relative overflow-hidden">
        {/* Subtle top decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-navy via-tech-blue to-emerald-success" />

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-navy flex items-center justify-center shadow-md shadow-navy/10">
              <svg className="w-6 h-6 text-tech-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" className="text-tech-blue" />
                <circle cx="12" cy="12" r="4" className="text-emerald-success" fill="currentColor" />
              </svg>
            </div>
          </div>
          <h2 className="font-heading font-extrabold text-2xl tracking-tight text-navy">
            autoporfonager<span className="text-emerald-success font-black">.</span>
          </h2>
          <p className="text-xs text-slate-muted">
            Accede a tu panel de portafolios, rebalanceos automáticos y backtesting cuantitativo.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-navy mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-10 pr-3.5 py-3 bg-slate-canvas border border-slate-subtle rounded-xl text-xs text-navy font-medium placeholder-slate-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1.5">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-3 bg-slate-canvas border border-slate-subtle rounded-xl text-xs text-navy font-medium placeholder-slate-400 focus:outline-none focus:border-tech-blue focus:ring-2 focus:ring-tech-blue/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-navy hover:bg-navy-hover text-white text-xs font-bold rounded-xl shadow-navy-glow transition-all disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Ingresando..." : "Ingresar a la Plataforma"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-muted border-t border-slate-subtle">
          ¿No tienes una cuenta aún?{" "}
          <Link href="/register" className="font-bold text-tech-blue hover:underline">
            Crear cuenta nueva
          </Link>
        </div>
      </div>
    </div>
  );
}
