import type { ApiResponse, Calculation } from "../types";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

const ADMIN_HEADER = "x-admin-token";

export function getStoredAdminToken(calcToken: string): string | null {
  try {
    return localStorage.getItem(`adminToken:${calcToken}`);
  } catch {
    return null;
  }
}

export function storeAdminToken(calcToken: string, adminToken: string) {
  try {
    localStorage.setItem(`adminToken:${calcToken}`, adminToken);
  } catch {
    // ignore
  }
}

export function clearStoredAdminToken(calcToken: string) {
  try {
    localStorage.removeItem(`adminToken:${calcToken}`);
  } catch {
    // ignore
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data ? (data as any).message : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

function withAdmin(calcToken: string, init?: RequestInit): RequestInit {
  const adminToken = getStoredAdminToken(calcToken);
  if (!adminToken) return init ?? {};
  return {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      [ADMIN_HEADER]: adminToken,
    },
  };
}

export async function createCalculation(payload: {
  groupName: string;
  participants: string[];
  adminName?: string;
}): Promise<ApiResponse<Calculation>> {
  return request("/calculations", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchCalculation(token: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}`, withAdmin(token));
}

export async function updateGroupName(token: string, groupName: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}`, withAdmin(token, {
    method: "PATCH",
    body: JSON.stringify({ groupName }),
  }));
}

export async function addParticipant(token: string, name: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/participants`, withAdmin(token, {
    method: "POST",
    body: JSON.stringify({ name }),
  }));
}

export async function removeParticipant(token: string, participantId: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/participants/${encodeURIComponent(participantId)}`, withAdmin(token, {
    method: "DELETE",
  }));
}

export async function addExpense(
  token: string,
  payload: { description?: string; amountCents: number; payerId: string; participantIds: string[] }
): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses`, withAdmin(token, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function updateExpense(
  token: string,
  expenseId: string,
  payload: { description?: string; amountCents: number; payerId: string; participantIds: string[] }
): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses/${encodeURIComponent(expenseId)}`, withAdmin(token, {
    method: "PUT",
    body: JSON.stringify(payload),
  }));
}

export async function deleteExpense(token: string, expenseId: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses/${encodeURIComponent(expenseId)}`, withAdmin(token, {
    method: "DELETE",
  }));
}

// --- Admin management

export async function listAdmins(token: string): Promise<{ admins: { id: string; name: string; createdAt?: string }[] }> {
  return request(`/calculations/${encodeURIComponent(token)}/admins`, withAdmin(token));
}

export async function createAdmin(
  token: string,
  name: string
): Promise<ApiResponse<Calculation> & { adminToken: string; admin: { id: string; name: string; createdAt?: string } }> {
  return request(
    `/calculations/${encodeURIComponent(token)}/admins`,
    withAdmin(token, {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  );
}

export async function deleteAdmin(token: string, adminId: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/admins/${encodeURIComponent(adminId)}`, withAdmin(token, { method: "DELETE" }));
}
