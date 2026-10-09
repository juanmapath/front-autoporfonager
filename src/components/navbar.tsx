"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User as UserIcon, LogOut, LogIn, Layers, FlaskConical } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="border-b border-slate-subtle bg-white/90 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Brand Logo & Wordmark (always links to Dashboard / Home) */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-navy flex items-center justify-center shadow-md shadow-navy/10 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 text-tech-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" className="text-tech-blue" />
                <circle cx="12" cy="12" r="4" className="text-emerald-success" fill="currentColor" />
              </svg>
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-navy">
              autoporfonager<span className="text-emerald-success font-black">.</span>
            </span>
          </Link>

          {/* Staff Navigation ONLY for Strategies & Backtest */}
          {isAuthenticated && user?.is_staff && !isAuthPage && (
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              <Link
                href="/admin/strategies"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  pathname === "/admin/strategies"
                    ? "bg-navy text-white font-bold shadow-sm"
                    : "text-slate-muted hover:text-navy hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Estrategias / Bots</span>
              </Link>
              <Link
                href="/admin/backtest"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  pathname === "/admin/backtest"
                    ? "bg-navy text-white font-bold shadow-sm"
                    : "text-slate-muted hover:text-navy hover:bg-slate-50"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Backtest Lab</span>
              </Link>
            </nav>
          )}
        </div>

        {/* Right side Auth Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* User badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-subtle rounded-xl text-xs shadow-card-subtle">
                <div className="w-2 h-2 rounded-full bg-emerald-success animate-pulse" />
                <UserIcon className="w-3.5 h-3.5 text-navy" />
                <span className="font-medium text-navy">{user.email}</span>
                {user.is_staff && (
                  <span className="px-1.5 py-0.5 bg-tech-blue/10 text-tech-blue rounded text-[10px] font-bold border border-tech-blue/20">
                    STAFF
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 text-slate-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-navy bg-white border border-slate-subtle hover:bg-slate-50 transition-all shadow-card-subtle"
              >
                <LogIn className="w-3.5 h-3.5 text-tech-blue" />
                <span>Iniciar Sesión</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


