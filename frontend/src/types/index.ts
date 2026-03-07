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
  record_type: "string" | "other";
  racket: string;
  string1: string;
  string2: string;
  price: number;
  is_new_racket: boolean;
  activity_name: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  count: number;
  total: number;       // รายได้รวมทุกประเภท
  sale_count: number;  // จำนวนไม้ใหม่
  sale_total: number;  // ค่าคอมขายไม้ (sale_count * 200)
  other_count: number; // จำนวน record type=other
  other_total: number; // ยอดรายได้อื่นๆ
}

export interface MonthSummary {
  month: string; // YYYY-MM
  count: number;
  total: number;
  sale_count: number;
  sale_total: number;
  other_count: number;
  other_total: number;
}

export interface UserReport {
  user_id: string;
  name: string;
  username: string;
  count: number;
  total: number;
  count_200: number;
  count_300: number;
  sale_count: number;
  sale_total: number;
  other_count: number;
  other_total: number;
}

export interface AdminReportResponse {
  users: UserReport[];
  grand_total: number;
  grand_count: number;
  grand_other_total: number;
  grand_other_count: number;
  period: { start: string; end: string; as_of: string };
}

export type ToastType = "success" | "error" | "warning";

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}
