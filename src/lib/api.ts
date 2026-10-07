const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      console.warn(`Unauthorized request to ${endpoint}`);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        // Optional redirect or clear
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
