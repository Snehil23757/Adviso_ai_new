import { auth } from "./firebase.js";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID || "";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return typeof payload === "string" ? payload : null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.detail)) return "The backend rejected the request payload.";
  if (typeof record.message === "string") return record.message;
  return null;
}

export async function readApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  let payload: unknown = null;

  try {
    payload = contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload) || `Backend request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export function apiFailureMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function authHeaders(init: RequestInit, forceRefresh = false) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = await auth?.currentUser?.getIdToken(forceRefresh);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function refreshAuthToken() {
  return auth?.currentUser?.getIdToken(true);
}

export async function authorizedFetch(path: string, init: RequestInit = {}) {
  const firstResponse = await fetch(apiUrl(path), {
    ...init,
    headers: await authHeaders(init),
  });

  if (firstResponse.status !== 401 || !auth?.currentUser) {
    return firstResponse;
  }

  try {
    await auth.currentUser.reload();
    return await fetch(apiUrl(path), {
      ...init,
      headers: await authHeaders(init, true),
    });
  } catch {
    return firstResponse;
  }
}
