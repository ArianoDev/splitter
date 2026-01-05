import type { ApiResponse, Calculation } from "../types";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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

export async function createCalculation(payload: {
  groupName: string;
  participants: string[];
}): Promise<ApiResponse<Calculation>> {
  return request("/calculations", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchCalculation(token: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}`);
}

export async function updateGroupName(token: string, groupName: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}`, {
    method: "PATCH",
    body: JSON.stringify({ groupName }),
  });
}

export async function addParticipant(token: string, name: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/participants`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function removeParticipant(token: string, participantId: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/participants/${encodeURIComponent(participantId)}`, {
    method: "DELETE",
  });
}

export async function addExpense(
  token: string,
  payload: { description?: string; amountCents: number; payerId: string; participantIds: string[] }
): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExpense(
  token: string,
  expenseId: string,
  payload: { description?: string; amountCents: number; payerId: string; participantIds: string[] }
): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses/${encodeURIComponent(expenseId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteExpense(token: string, expenseId: string): Promise<ApiResponse<Calculation>> {
  return request(`/calculations/${encodeURIComponent(token)}/expenses/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  });
}
