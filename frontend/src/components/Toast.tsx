"use client";

import { useEffect, useState } from "react";
import type { Toast as ToastType, ToastType as TT } from "@/types";

let toastId = 0;
type Listener = (t: ToastType) => void;
const listeners = new Set<Listener>();

export function toast(msg: string, type: TT = "success") {
  const t: ToastType = { id: ++toastId, msg, type };
  listeners.forEach((fn) => fn(t));
}

const BG: Record<TT, string> = {
  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const add = (t: ToastType) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 2200);
    };
    listeners.add(add);
    return () => void listeners.delete(add);
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast px-6 py-[10px] rounded-[12px] text-white font-bold text-sm
                     shadow-[0_8px_32px_rgba(0,0,0,0.4)] whitespace-nowrap"
          style={{ backgroundColor: BG[t.type] }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
