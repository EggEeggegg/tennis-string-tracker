"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ToastContainer } from "@/components/Toast";
import { getToken, getStoredUser, clearAuth } from "@/lib/utils";
import { authApi } from "@/lib/api";
import type { User } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    // Try stored user first for immediate render
    const stored = getStoredUser();
    if (stored) setUser(stored);

    // Verify token is still valid with server
    authApi
      .me()
      .then((u) => {
        setUser(u);
        localStorage.setItem("tennis-tracker-user", JSON.stringify(u));
        setReady(true);
      })
      .catch(() => {
        clearAuth();
        router.replace("/login");
      });
  }, [router]);

  if (!ready && !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-[#374560] text-sm">กำลังโหลด…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-[80px]">
      <ToastContainer />

      {/* Logout button (top-right) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <span className="text-sm text-[#64748b]">{user?.name}</span>
        <button
          className="text-xs text-[#64748b] px-3 py-[6px] rounded-[6px] bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
          onClick={() => {
            clearAuth();
            router.replace("/login");
          }}
        >
          ออก
        </button>
      </div>

      <div className="pt-16">{children}</div>

      <NavBar isAdmin={user?.role === "admin"} />
    </div>
  );
}
