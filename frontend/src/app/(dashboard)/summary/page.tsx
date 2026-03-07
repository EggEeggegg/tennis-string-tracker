"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recordsApi } from "@/lib/api";
import { fmtDate, fmtMoney, today, MONTHS_TH } from "@/lib/utils";
import { toast } from "@/components/Toast";
import type { DaySummary, MonthSummary, Record } from "@/types";

type Mode = "daily" | "monthly" | "filter";

const monthStart = () => `${today().slice(0, 7)}-01`;

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) ?? "daily";

  const [mode, setMode] = useState<Mode>(initialMode);

  // daily state
  const [dailyData, setDailyData] = useState<DaySummary[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyLoaded, setDailyLoaded] = useState(false);

  // monthly state
  const [monthlyData, setMonthlyData] = useState<MonthSummary[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // filter state
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [records, setRecords] = useState<Record[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterLoaded, setFilterLoaded] = useState(false);

  const changeMode = (m: Mode) => {
    setMode(m);
    router.replace(`/summary?mode=${m}`);
  };

  const fetchDaily = useCallback(() => {
    setDailyLoading(true);
    recordsApi
      .dailySummary()
      .then(setDailyData)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => { setDailyLoading(false); setDailyLoaded(true); });
  }, []);

  const fetchMonthly = useCallback(() => {
    setMonthlyLoading(true);
    recordsApi
      .monthlySummary({ year })
      .then(setMonthlyData)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => setMonthlyLoading(false));
  }, [year]);

  const fetchFilter = useCallback(async () => {
    if (!start || !end) return;
    setFilterLoading(true);
    try {
      const data = await recordsApi.list({ start, end });
      setRecords(data);
      setFilterLoaded(true);
    } catch {
      toast("โหลดข้อมูลล้มเหลว", "error");
    } finally {
      setFilterLoading(false);
    }
  }, [start, end]);

  const exportExcel = async () => {
    if (!start || !end) {
      toast("กรุณาเลือกวันที่ก่อน", "error");
      return;
    }
    try {
      const res = await recordsApi.exportExcel(start, end);
      if (!res.ok) {
        toast("ดาวน์โหลดล้มเหลว", "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tennis-records-${start}-${end}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("ดาวน์โหลดสำเร็จ", "success");
    } catch {
      toast("ดาวน์โหลดล้มเหลว", "error");
    }
  };

  // load on first visit to each mode
  useEffect(() => { if (mode === "daily" && !dailyLoaded) fetchDaily(); }, [mode, dailyLoaded, fetchDaily]);
  useEffect(() => { if (mode === "monthly") fetchMonthly(); }, [mode, year, fetchMonthly]);
  useEffect(() => { if (mode === "filter" && !filterLoaded) fetchFilter(); }, [mode, filterLoaded, fetchFilter]);

  // daily totals
  const dTotal = dailyData.reduce((s, d) => s + d.total, 0);
  const dSaleTotal = dailyData.reduce((s, d) => s + d.sale_total, 0);
  const dCount = dailyData.reduce((s, d) => s + d.count, 0);

  // monthly totals
  const mTotal = monthlyData.reduce((s, m) => s + m.total, 0);
  const mSaleTotal = monthlyData.reduce((s, m) => s + m.sale_total, 0);
  const mCount = monthlyData.reduce((s, m) => s + m.count, 0);

  // filter stats
  const fStringRecords = records.filter((r) => r.record_type === "string");
  const fOtherRecords = records.filter((r) => r.record_type === "other");
  const fCount = fStringRecords.length;
  const fOtherCount = fOtherRecords.length;
  const fStringTotal = fStringRecords.reduce((s, r) => s + r.price, 0);
  const fOtherTotal = fOtherRecords.reduce((s, r) => s + r.price, 0);
  const c200 = fStringRecords.filter((r) => r.price === 200).length;
  const c300 = fStringRecords.filter((r) => r.price === 300).length;
  const saleCount = fStringRecords.filter((r) => r.is_new_racket).length;
  const saleTotal = saleCount * 200;
  const fTotal = fStringTotal + fOtherTotal + saleTotal;

  const MODES: { key: Mode; icon: string; label: string }[] = [
    { key: "daily", icon: "📊", label: "รายวัน" },
    { key: "monthly", icon: "📅", label: "รายเดือน" },
    { key: "filter", icon: "🔍", label: "ช่วงวันที่" },
  ];

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      {/* Header */}
      <div className="text-center py-2 pb-4">
        <div className="text-3xl">🎾</div>
        <h1
          className="num text-xl"
          style={{
            background: "linear-gradient(135deg,#60a5fa,#a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          String Tracker
        </h1>
      </div>

      {/* Mode toggle */}
      <div
        className="flex rounded-[12px] p-1 mb-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => changeMode(m.key)}
            className="flex-1 py-[8px] rounded-[9px] text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1"
            style={
              mode === m.key
                ? { background: "#3b82f6", color: "#fff" }
                : { color: "#475569" }
            }
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* ── Daily mode ── */}
      {mode === "daily" && (
        <>
          <div className="mb-4">
            <p className="text-xs text-[#94a3b8]">7 วันล่าสุด</p>
          </div>

          {dailyLoading ? (
            <div className="text-center text-[#374560] text-sm py-8">กำลังโหลด…</div>
          ) : dailyData.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-[#475569] text-sm">ยังไม่มีข้อมูล</div>
            </div>
          ) : (
            <>
              {dailyData.map((d, i) => (
                <div
                  key={d.date}
                  className="record-item cursor-pointer"
                  style={{ animationDelay: `${i * 0.03}s` }}
                  onClick={() => router.push(`/daily?date=${d.date}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{fmtDate(d.date)}</div>
                      <div className="text-xs text-[#4b5e7a] mt-[2px]">
                        {d.count - d.other_count} ไม้
                        {d.sale_count > 0 && ` · ได้ค่าคอม ${d.sale_count} ไม้`}
                        {d.other_count > 0 && ` · อื่นๆ ${d.other_count} รายการ`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="num text-lg" style={{ color: "#22c55e" }}>
                        ฿{fmtMoney(d.total - d.other_total)} เอ็น
                      </div>
                      {d.sale_count > 0 && (
                        <div className="num text-xs" style={{ color: "#f59e0b" }}>
                          +฿{fmtMoney(d.sale_total)} คอม
                        </div>
                      )}
                      {d.other_count > 0 && (
                        <div className="num text-xs" style={{ color: "#06b6d4" }}>
                          +฿{fmtMoney(d.other_total)} อื่นๆ
                        </div>
                      )}
                      {(d.sale_count > 0 || d.other_count > 0) && (
                        <div className="num text-xs font-bold" style={{ color: "#a78bfa" }}>
                          = ฿{fmtMoney(d.total + d.sale_total)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div
                className="rounded-[14px] p-[14px] mt-2"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                {(() => {
                  const dOtherTotal = dailyData.reduce((s, d) => s + d.other_total, 0);
                  const dOtherCount = dailyData.reduce((s, d) => s + d.other_count, 0);
                  const dStringTotal = dTotal - dOtherTotal;
                  const dStringCount = dCount - dOtherCount;
                  return (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm">รวมทั้งหมด</div>
                        <div className="text-xs text-[#64748b]">
                          {dStringCount} ไม้ · {dailyData.length} วัน
                          {dSaleTotal > 0 && ` · ค่าคอม ${dailyData.reduce((s, d) => s + d.sale_count, 0)} ไม้`}
                          {dOtherCount > 0 && ` · อื่นๆ ${dOtherCount} รายการ`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="num text-xl" style={{ color: "#22c55e" }}>฿{fmtMoney(dStringTotal)} เอ็น</div>
                        {dSaleTotal > 0 && (
                          <div className="num text-sm" style={{ color: "#f59e0b" }}>+฿{fmtMoney(dSaleTotal)} ค่าคอม</div>
                        )}
                        {dOtherTotal > 0 && (
                          <div className="num text-sm" style={{ color: "#06b6d4" }}>+฿{fmtMoney(dOtherTotal)} อื่นๆ</div>
                        )}
                        {dOtherTotal > 0 && (
                          <div className="num text-sm font-bold" style={{ color: "#a78bfa" }}>= ฿{fmtMoney(dTotal)} รวม</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Monthly mode ── */}
      {mode === "monthly" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-[#94a3b8]">12 เดือนของปี {year}</p>
            <select
              className="inp w-[110px] px-3 py-2 text-sm text-white"
              style={{ backgroundColor: "#1e293b" }}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                <option key={y} value={y} style={{ color: "#fff" }}>{y}</option>
              ))}
            </select>
          </div>

          {monthlyLoading ? (
            <div className="text-center text-[#374560] text-sm py-8">กำลังโหลด…</div>
          ) : monthlyData.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-2">📅</div>
              <div className="text-[#475569] text-sm">ไม่มีข้อมูลปี {year}</div>
            </div>
          ) : (
            <>
              {monthlyData.map((m, i) => {
                const [y, mo] = m.month.split("-");
                return (
                  <div key={m.month} className="record-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px]">
                          {MONTHS_TH[parseInt(mo) - 1]} {y}
                        </div>
                        <div className="text-xs text-[#4b5e7a] mt-[2px]">
                          {m.count - m.other_count} ไม้
                          {m.sale_count > 0 && ` · ได้ค่าคอม ${m.sale_count} ไม้`}
                          {m.other_count > 0 && ` · อื่นๆ ${m.other_count} รายการ`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="num text-xl" style={{ color: "#22c55e" }}>฿{fmtMoney(m.total - m.other_total)} เอ็น</div>
                        {m.sale_count > 0 && (
                          <div className="num text-sm" style={{ color: "#f59e0b" }}>+฿{fmtMoney(m.sale_total)} คอม</div>
                        )}
                        {m.other_count > 0 && (
                          <div className="num text-sm" style={{ color: "#06b6d4" }}>+฿{fmtMoney(m.other_total)} อื่นๆ</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                className="rounded-[14px] p-[14px] mt-2"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                {(() => {
                  const mOtherTotal = monthlyData.reduce((s, m) => s + m.other_total, 0);
                  const mOtherCount = monthlyData.reduce((s, m) => s + m.other_count, 0);
                  const mStringTotal = mTotal - mOtherTotal;
                  const mStringCount = mCount - mOtherCount;
                  return (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">รวมทั้งหมด</div>
                        <div className="text-xs text-[#64748b]">
                          {mStringCount} ไม้
                          {mSaleTotal > 0 && ` · ค่าคอม ${monthlyData.reduce((s, m) => s + m.sale_count, 0)} ไม้`}
                          {mOtherCount > 0 && ` · อื่นๆ ${mOtherCount} รายการ`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="num text-xl" style={{ color: "#22c55e" }}>฿{fmtMoney(mStringTotal)} เอ็น</div>
                        {mSaleTotal > 0 && (
                          <div className="num text-sm" style={{ color: "#f59e0b" }}>+฿{fmtMoney(mSaleTotal)} ค่าคอม</div>
                        )}
                        {mOtherTotal > 0 && (
                          <div className="num text-sm" style={{ color: "#06b6d4" }}>+฿{fmtMoney(mOtherTotal)} อื่นๆ</div>
                        )}
                        {mOtherTotal > 0 && (
                          <div className="num text-sm font-bold" style={{ color: "#a78bfa" }}>= ฿{fmtMoney(mTotal)} รวม</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Filter mode ── */}
      {mode === "filter" && (
        <>
          <div className="card mb-4">
            <div className="flex gap-[10px] items-center">
              <div className="flex-1">
                <label className="text-xs text-[#475569] block mb-1">เริ่ม</label>
                <input
                  type="date"
                  className="inp px-3 py-[10px] text-sm"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <span className="text-[#374560] mt-4">→</span>
              <div className="flex-1">
                <label className="text-xs text-[#475569] block mb-1">สิ้นสุด</label>
                <input
                  type="date"
                  className="inp px-3 py-[10px] text-sm"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <button className="btn-primary w-full mt-4" onClick={fetchFilter} disabled={filterLoading}>
              {filterLoading ? "กำลังโหลด…" : "ค้นหา"}
            </button>
            {filterLoaded && (
              <button className="btn-ghost w-full mt-2" onClick={exportExcel}>
                📥 Export Excel
              </button>
            )}
          </div>

          {filterLoaded && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4 items-stretch">
                {[
                  { label: "จำนวนไม้", value: fCount, unit: "ไม้", color: "#22c55e" },
                  { label: "รายได้ขึ้นเอ็น", value: `฿${fmtMoney(fStringTotal)}`, color: "#22c55e" },
                  { label: "ได้ค่าคอม", value: saleCount, unit: "ไม้", color: "#3b82f6" },
                  { label: "ค่าคอมรวม", value: `฿${fmtMoney(saleTotal)}`, color: "#3b82f6" },
                ].map((s, i) => (
                  <div key={i} className="stat-card flex flex-col justify-between" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="text-[#475569] text-[11px] font-semibold mb-1">{s.label}</div>
                    <div className="num text-2xl" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[11px] text-[#2d3a52]">{s.unit ?? "\u00A0"}</div>
                  </div>
                ))}
                {fOtherCount > 0 && (
                  <>
                    <div className="stat-card flex flex-col justify-between" style={{ animationDelay: "0.24s" }}>
                      <div className="text-[#475569] text-[11px] font-semibold mb-1">รายการอื่นๆ</div>
                      <div className="num text-2xl" style={{ color: "#06b6d4" }}>{fOtherCount}</div>
                      <div className="text-[11px] text-[#2d3a52]">รายการ</div>
                    </div>
                    <div className="stat-card flex flex-col justify-between" style={{ animationDelay: "0.3s" }}>
                      <div className="text-[#475569] text-[11px] font-semibold mb-1">รายได้อื่นๆ</div>
                      <div className="num text-2xl" style={{ color: "#06b6d4" }}>฿{fmtMoney(fOtherTotal)}</div>
                      <div className="text-[11px] text-[#2d3a52]">&nbsp;</div>
                    </div>
                  </>
                )}
                {fOtherCount > 0 && (
                  <div className="stat-card col-span-2 flex flex-col justify-between" style={{ animationDelay: "0.36s" }}>
                    <div className="text-[#475569] text-[11px] font-semibold mb-1">รายได้รวมทุกประเภท</div>
                    <div className="num text-2xl" style={{ color: "#a78bfa" }}>฿{fmtMoney(fTotal)}</div>
                    <div className="text-[11px] text-[#2d3a52]">&nbsp;</div>
                  </div>
                )}
              </div>

              <div className="card">
                <h4 className="font-bold text-sm mb-3">แยกตามราคาขึ้นเอ็น</h4>
                <div className="flex gap-[10px]">
                  <div
                    className="flex-1 p-[14px] rounded-[12px]"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}
                  >
                    <div className="text-[11px] text-[#475569] font-semibold">฿200</div>
                    <div className="num text-xl" style={{ color: "#22c55e" }}>{c200}</div>
                    <div className="text-xs text-[#4b5e7a]">= ฿{fmtMoney(c200 * 200)}</div>
                  </div>
                  <div
                    className="flex-1 p-[14px] rounded-[12px]"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
                  >
                    <div className="text-[11px] text-[#475569] font-semibold">฿300</div>
                    <div className="num text-xl" style={{ color: "#f59e0b" }}>{c300}</div>
                    <div className="text-xs text-[#4b5e7a]">= ฿{fmtMoney(c300 * 300)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense>
      <SummaryContent />
    </Suspense>
  );
}
