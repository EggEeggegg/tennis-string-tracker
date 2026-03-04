// ─── Date helpers ────────────────────────────────────────────────────────────

export const today = () => {
  const now = new Date();
  const thDate = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7 (Thailand)
  return thDate.toISOString().slice(0, 10);
};

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtDateShort = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

// ─── Number helpers ───────────────────────────────────────────────────────────

export const fmtMoney = (n: number) => n.toLocaleString("th-TH");

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const TOKEN_KEY = "tennis-tracker-token";
export const USER_KEY = "tennis-tracker-user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
