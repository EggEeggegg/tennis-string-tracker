"use client";

import { useState, useEffect } from "react";
import { recordsApi } from "@/lib/api";
import { today, fmtMoney } from "@/lib/utils";
import { toast } from "@/components/Toast";
import type { Record } from "@/types";

const monthStart = () => `${today().slice(0, 7)}-01`;

export default function FilterPage() {
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const data = await recordsApi.list({ start, end });
      setRecords(data);
    } catch {
      toast("โหลดข้อมูลล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const count = records.length;
  const total = records.reduce((s, r) => s + r.price, 0);
  const c200 = records.filter((r) => r.price === 200).length;
  const c300 = records.filter((r) => r.price === 300).length;
  const days = new Set(records.map((r) => r.date)).size;
  const avgPerDay = days > 0 ? Math.round(total / days) : 0;

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      <div className="text-center py-2 pb-4">
        <div className="text-3xl">🎾</div>
        <h1 className="num text-xl"
          style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          String Tracker
        </h1>
      </div>

      {/* Date range picker */}
      <div className="card mb-4">
        <h3 className="font-bold text-[15px] mb-4">🔍 เลือกช่วงวันที่</h3>
        <div className="flex gap-[10px] items-center">
          <div className="flex-1">
            <label className="text-xs text-[#475569] block mb-1">เริ่ม</label>
            <input type="date" className="inp px-3 py-[10px] text-sm" value={start}
              onChange={(e) => setStart(e.target.value)} />
          </div>
          <span className="text-[#374560] mt-4">→</span>
          <div className="flex-1">
            <label className="text-xs text-[#475569] block mb-1">สิ้นสุด</label>
            <input type="date" className="inp px-3 py-[10px] text-sm" value={end}
              onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary w-full mt-4" onClick={fetch} disabled={loading}>
          {loading ? "กำลังโหลด…" : "ค้นหา"}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "จำนวนไม้", value: count, unit: "ไม้", color: "#3b82f6" },
          { label: "รายได้รวม", value: `฿${fmtMoney(total)}`, color: "#22c55e" },
          { label: "รายได้/วัน", value: `฿${fmtMoney(avgPerDay)}`, color: "#f59e0b" },
          { label: "จำนวนวัน", value: days, unit: "วัน", color: "#ec4899" },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="text-[#475569] text-[11px] font-semibold mb-1">{s.label}</div>
            <div className="num text-2xl" style={{ color: s.color }}>{s.value}</div>
            {s.unit && <div className="text-[#2d3a52] text-[11px]">{s.unit}</div>}
          </div>
        ))}
      </div>

      {/* Price breakdown */}
      <div className="card">
        <h4 className="font-bold text-sm mb-3">แยกตามราคา</h4>
        <div className="flex gap-[10px]">
          <div className="flex-1 p-[14px] rounded-[12px]"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <div className="text-[11px] text-[#475569] font-semibold">฿200</div>
            <div className="num text-xl" style={{ color: "#22c55e" }}>{c200}</div>
            <div className="text-xs text-[#4b5e7a]">= ฿{fmtMoney(c200 * 200)}</div>
          </div>
          <div className="flex-1 p-[14px] rounded-[12px]"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <div className="text-[11px] text-[#475569] font-semibold">฿300</div>
            <div className="num text-xl" style={{ color: "#f59e0b" }}>{c300}</div>
            <div className="text-xs text-[#4b5e7a]">= ฿{fmtMoney(c300 * 300)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
