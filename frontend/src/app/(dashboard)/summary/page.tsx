"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordsApi } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { toast } from "@/components/Toast";
import type { DaySummary } from "@/types";

export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recordsApi
      .dailySummary()
      .then(setData)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const totalIncome = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      <div className="text-center py-2 pb-4">
        <div className="text-3xl">🎾</div>
        <h1 className="num text-xl"
          style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          String Tracker
        </h1>
      </div>

      <h2 className="font-bold text-base mb-4">📊 สรุปรายวัน</h2>

      {loading ? (
        <div className="text-center text-[#374560] text-sm py-8">กำลังโหลด…</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-[#475569] text-sm">ยังไม่มีข้อมูล</div>
        </div>
      ) : (
        <>
          {data.map((d, i) => (
            <div
              key={d.date}
              className="record-item cursor-pointer"
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => router.push(`/daily?date=${d.date}`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{fmtDate(d.date)}</div>
                  <div className="text-xs text-[#4b5e7a] mt-[2px]">
                    {d.count} ไม้ · เฉลี่ย ฿{fmtMoney(Math.round(d.total / d.count))}
                  </div>
                </div>
                <div className="num text-lg" style={{ color: "#22c55e" }}>
                  ฿{fmtMoney(d.total)}
                </div>
              </div>
            </div>
          ))}

          {/* Grand total */}
          <div
            className="rounded-[14px] p-[14px] mt-2 flex justify-between items-center"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <div>
              <div className="font-bold text-sm">รวมทั้งหมด</div>
              <div className="text-xs text-[#64748b]">
                {totalCount} ไม้ · {data.length} วัน
              </div>
            </div>
            <div className="num text-xl" style={{ color: "#22c55e" }}>
              ฿{fmtMoney(totalIncome)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
