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

function clearStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("autoportonager_token");
    localStorage.removeItem("autoportonager_refresh");
    localStorage.removeItem("autoportonager_user");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const verifyAndRestoreSession = async () => {
      const savedToken = localStorage.getItem("autoportonager_token");
      const savedRefresh = localStorage.getItem("autoportonager_refresh");
      const savedUser = localStorage.getItem("autoportonager_user");

      if (!savedToken || !savedUser) {
        if (isMounted) setLoading(false);
        return;
      }

      let parsedUser: User | null = null;
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        clearStorage();
        if (isMounted) setLoading(false);
        return;
      }

      try {
        let currentToken = savedToken;
        let res = await fetch(`${API_BASE}/me/`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        // If access token is expired (401), attempt refresh with saved refresh token
        if (res.status === 401 && savedRefresh) {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: savedRefresh }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.access) {
              currentToken = refreshData.access;
              localStorage.setItem("autoportonager_token", currentToken);
              if (refreshData.refresh) {
                localStorage.setItem("autoportonager_refresh", refreshData.refresh);
              }
              // Retry /me/ with newly refreshed access token
              res = await fetch(`${API_BASE}/me/`, {
                headers: { Authorization: `Bearer ${currentToken}` },
              });
            }
          }
        }

        if (res.ok) {
          const meData = await res.json();
          const updatedUser: User = {
            id: meData.id || parsedUser?.id || 1,
            email: meData.email,
            username: meData.username,
            is_staff: Boolean(meData.is_staff),
            is_superuser: Boolean(meData.is_superuser || meData.is_staff),
            timezone: meData.timezone || "America/Bogota",
            plan: meData.plan?.name || "PRO",
          };

          if (isMounted) {
            setToken(currentToken);
            setUser(updatedUser);
            localStorage.setItem("autoportonager_user", JSON.stringify(updatedUser));
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token is dead and refresh failed/expired: Purge session completely so Landing is shown
          clearStorage();
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } catch (e) {
        console.warn("Error verifying auth session with backend:", e);
        // On connection failure with unverified tokens, clear to prevent false logged-in state
        clearStorage();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyAndRestoreSession();

    // Listen for global session expiry events (triggered by 401 in fetchApi)
    const handleSessionExpired = () => {
      clearStorage();
      if (isMounted) {
        setUser(null);
        setToken(null);
        router.push("/");
      }
    };

    window.addEventListener("autoportonager:session_expired", handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener("autoportonager:session_expired", handleSessionExpired);
    };
  }, [router]);

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
    clearStorage();
    setUser(null);
    setToken(null);
    router.push("/");
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
