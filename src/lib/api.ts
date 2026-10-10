const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper to notify the app when the session is completely expired/invalid
function handleSessionExpired() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("autoportonager_token");
    localStorage.removeItem("autoportonager_refresh");
    localStorage.removeItem("autoportonager_user");
    window.dispatchEvent(new Event("autoportonager:session_expired"));
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("autoportonager_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    let res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401 Unauthorized, attempt a silent token refresh once
    const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/refresh") || endpoint.includes("/auth/register");
    if (res.status === 401 && !isAuthEndpoint) {
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("autoportonager_refresh") : null;

      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.access) {
              if (typeof window !== "undefined") {
                localStorage.setItem("autoportonager_token", refreshData.access);
                if (refreshData.refresh) {
                  localStorage.setItem("autoportonager_refresh", refreshData.refresh);
                }
              }

              // Retry original request with the fresh token
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${refreshData.access}`,
              };

              res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: retryHeaders,
              });
            } else {
              handleSessionExpired();
            }
          } else {
            // Refresh token is expired or revoked
            handleSessionExpired();
          }
        } catch {
          handleSessionExpired();
        }
      } else {
        // No refresh token available to recover
        handleSessionExpired();
      }
    }

    if (!res.ok) {
      const errorBody = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(errorBody);
      } catch (e) {}

      let errorMsg = parsed?.error || parsed?.detail;
      if (!errorMsg && parsed && typeof parsed === "object") {
        errorMsg = Object.entries(parsed)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
          .join(" | ");
      }

      throw new Error(errorMsg || `API error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`Error fetching ${endpoint}:`, err.message);
    throw err;
  }
}
