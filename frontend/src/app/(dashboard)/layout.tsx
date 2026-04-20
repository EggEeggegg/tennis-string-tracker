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
  const [isColdStart, setIsColdStart] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    // Try stored user first for immediate render
    const stored = getStoredUser();
    if (stored) setUser(stored);

    let retryTimer: NodeJS.Timeout;

    const verifyAuth = () => {
      // Show "waking up" message if it takes more than 3 seconds
      const coldStartTimer = setTimeout(() => setIsColdStart(true), 3000);

      authApi
        .me()
        .then((u) => {
          clearTimeout(coldStartTimer);
          setIsColdStart(false);
          setUser(u);
          localStorage.setItem("tennis-tracker-user", JSON.stringify(u));
          setReady(true);
        })
        .catch((err: Error) => {
          clearTimeout(coldStartTimer);
          // If 401 (Unauthorized), user MUST login again
          if (err.message.includes("401")) {
            clearAuth();
            router.replace("/login");
            return;
          }

          // For other errors (like 502, 504 from Render during cold start), 
          // just wait and retry instead of booting the user out.
          console.warn("Server might be waking up... retrying in 5s", err);
          setIsColdStart(true);
          retryTimer = setTimeout(verifyAuth, 5000);
        });
    };

    verifyAuth();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [router]);

  if (!ready && !user) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="text-[#374560] text-sm font-medium animate-pulse">
          {isColdStart ? "☕️ กำลังปลุกเซิร์ฟเวอร์ (อาจใช้เวลาประมาณ 1 นาที)..." : "กำลังโหลด…"}
        </div>
        {isColdStart && (
          <div className="text-[12px] text-[#64748b] max-w-[200px] text-center leading-relaxed">
            เซิร์ฟเวอร์ตัวฟรีของ Render อาจหลับอยู่ ระบบกำลังปลุกให้อย่างต่อเนื่องครับ
          </div>
        )}
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
