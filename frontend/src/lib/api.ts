import type {
  AdminReportResponse,
  DaySummary,
  MonthSummary,
  Record as TRecord,
  User,
} from "@/types";
import { getToken } from "./utils";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
    ...(options.headers as { [key: string]: string }),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({ error: "Unknown error" }));

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<User>("/api/auth/me"),

  changePassword: (body: { old_password: string; new_password: string }) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Records ──────────────────────────────────────────────────────────────────

export const recordsApi = {
  list: (params: { date?: string; start?: string; end?: string } = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    );
    return request<TRecord[]>(`/api/records?${q}`);
  },

  dailySummary: (params: { start?: string; end?: string } = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    );
    return request<DaySummary[]>(`/api/records/summary/daily?${q}`);
  },

  monthlySummary: (params: { year?: string } = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    );
    return request<MonthSummary[]>(`/api/records/summary/monthly?${q}`);
  },

  create: (body: {
    date: string;
    racket: string;
    string1?: string;
    string2?: string;
    price: number;
    note?: string;
  }) =>
    request<TRecord>("/api/records", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: {
      racket: string;
      string1?: string;
      string2?: string;
      price: number;
      note?: string;
    }
  ) =>
    request<TRecord>(`/api/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<null>(`/api/records/${id}`, { method: "DELETE" }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: () => request<User[]>("/api/admin/users"),

  createUser: (body: {
    username: string;
    password: string;
    name: string;
    role?: string;
  }) =>
    request<User>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (
    id: string,
    body: { name?: string; is_active?: boolean; role?: string }
  ) =>
    request<User>(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteUser: (id: string) =>
    request<null>(`/api/admin/users/${id}`, { method: "DELETE" }),

  report: (params: { start?: string; end?: string; user_id?: string } = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    );
    return request<AdminReportResponse>(`/api/admin/report?${q}`);
  },
};
