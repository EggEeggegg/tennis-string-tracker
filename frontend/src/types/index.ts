export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Record {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  seq: number;
  racket: string;
  string1: string;
  string2: string;
  price: 200 | 300;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  count: number;
  total: number;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  count: number;
  total: number;
}

export interface UserReport {
  user_id: string;
  name: string;
  username: string;
  count: number;
  total: number;
  count_200: number;
  count_300: number;
}

export interface AdminReportResponse {
  users: UserReport[];
  grand_total: number;
  grand_count: number;
  period: { start: string; end: string; as_of: string };
}

export type ToastType = "success" | "error" | "warning";

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}
