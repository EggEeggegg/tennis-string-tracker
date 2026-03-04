"use client";

import { useState, useEffect } from "react";
import { recordsApi } from "@/lib/api";
import { fmtMoney, MONTHS_TH } from "@/lib/utils";
import { toast } from "@/components/Toast";
import type { MonthSummary } from "@/types";

export default function MonthlyPage() {
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    setLoading(true);
    recordsApi
      .monthlySummary({ year })
      .then(setData)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => setLoading(false));
  }, [year]);

  const totalCount = data.reduce((s, m) => s + m.count, 0);
  const totalIncome = data.reduce((s, m) => s + m.total, 0);

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      <div className="text-center py-2 pb-4">
        <div className="text-3xl">🎾</div>
        <h1 className="num text-xl"
          style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          String Tracker
        </h1>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-base">📅 สรุปรายเดือน</h2>
        <select
          className="inp w-[110px] px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-[#374560] text-sm py-8">กำลังโหลด…</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-2">📅</div>
          <div className="text-[#475569] text-sm">ไม่มีข้อมูลปี {year}</div>
        </div>
      ) : (
        <>
          {data.map((m, i) => {
            const [y, mo] = m.month.split("-");
            return (
              <div
                key={m.month}
                className="record-item"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[15px]">
                      {MONTHS_TH[parseInt(mo) - 1]} {y}
                    </div>
                    <div className="text-xs text-[#4b5e7a] mt-[2px]">
                      {m.count} ไม้ · เฉลี่ย ฿{fmtMoney(Math.round(m.total / m.count))}
                    </div>
                  </div>
                  <div className="num text-xl" style={{ color: "#22c55e" }}>
                    ฿{fmtMoney(m.total)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div
            className="rounded-[14px] p-[14px] mt-2 flex justify-between items-center"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <div>
              <div className="font-bold">รวมทั้งหมด</div>
              <div className="text-xs text-[#64748b]">{totalCount} ไม้</div>
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
