"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: number;
  email: string;
  username: string;
  is_staff: boolean;
  is_superuser: boolean;
  timezone: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem("autoportonager_token");
    const savedUser = localStorage.getItem("autoportonager_user");

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);

        // Background sync with /me/ to keep is_staff and plan live without requiring logout/login
        fetch(`${API_BASE}/me/`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((meData) => {
            if (meData) {
              const updatedUser: User = {
                id: parsed.id || 1,
                email: meData.email,
                username: meData.username,
                is_staff: Boolean(meData.is_staff),
                is_superuser: Boolean(meData.is_superuser || meData.is_staff),
                timezone: meData.timezone || "America/Bogota",
                plan: meData.plan?.name || "Default",
              };
              setUser(updatedUser);
              localStorage.setItem("autoportonager_user", JSON.stringify(updatedUser));
            }
          })
          .catch(() => {});
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem("autoportonager_token");
        localStorage.removeItem("autoportonager_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || data.non_field_errors?.[0] || "Credenciales inválidas. Verifica tu correo y contraseña.",
        };
      }

      setToken(data.access);
      setUser(data.user);
      localStorage.setItem("autoportonager_token", data.access);
      localStorage.setItem("autoportonager_refresh", data.refresh);
      localStorage.setItem("autoportonager_user", JSON.stringify(data.user));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: "No se pudo conectar con el servidor backend (http://localhost:8000)." };
    }
  };

  const register = async (email: string, pass: string, username?: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass, username }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.email?.[0] || data.password?.[0] || data.detail || "Error al registrar la cuenta.";
        return { success: false, error: errorMsg };
      }

      setToken(data.access);
      setUser(data.user);
      localStorage.setItem("autoportonager_token", data.access);
      localStorage.setItem("autoportonager_refresh", data.refresh);
      localStorage.setItem("autoportonager_user", JSON.stringify(data.user));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: "No se pudo conectar con el servidor backend (http://localhost:8000)." };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("autoportonager_token");
    localStorage.removeItem("autoportonager_refresh");
    localStorage.removeItem("autoportonager_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
