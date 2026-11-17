const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "aikidz-token";

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  roles: string[];
};

export const authToken = () => localStorage.getItem(TOKEN_KEY);
export const saveAuthToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const token = authToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body as T;
}

export async function login(email: string, password: string) {
  return api<{ token: string; user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function register(payload: Record<string, unknown>) {
  return api<{ token: string; user: ApiUser }>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}
