"use client";

import type { Record } from "@/types";
import { fmtDate } from "@/lib/utils";

interface Props {
  date: string;
  initial?: Partial<Record>;
  onSubmit: (data: {
    racket: string;
    string1: string;
    string2: string;
    price: 200 | 300;
    note: string;
  }) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

import { useState } from "react";

export function RecordForm({ date, initial, onSubmit, onClose, loading }: Props) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    racket: initial?.racket ?? "",
    string1: initial?.string1 ?? "",
    string2: initial?.string2 ?? "",
    price: (initial?.price ?? 200) as 200 | 300,
    note: initial?.note ?? "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.racket.trim()) {
      setError("กรุณากรอกชื่อไม้");
      return;
    }
    setError("");
    await onSubmit(form);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Handle bar */}
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-base">{isEdit ? "✏️ แก้ไข" : "➕ เพิ่มรายการ"}</h3>
          <div className="text-xs text-[#64748b]">{fmtDate(date)}</div>
        </div>

        {isEdit && (
          <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-[10px] px-3 py-2 mb-4 text-xs text-[#f59e0b]">
            ⏱ updatedAt จะอัพเดทอัตโนมัติเมื่อบันทึก
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[10px] px-3 py-2 mb-4 text-[#f87171] text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-[14px]">
          {/* Racket */}
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">ชื่อไม้ *</label>
            <input
              className="inp"
              placeholder="เช่น Wilson Pro Staff 97"
              value={form.racket}
              onChange={(e) => setForm({ ...form, racket: e.target.value })}
              autoFocus
            />
          </div>

          {/* Strings */}
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">เอ็น Main</label>
              <input
                className="inp"
                placeholder="Main"
                value={form.string1}
                onChange={(e) => setForm({ ...form, string1: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">เอ็น Cross</label>
              <input
                className="inp"
                placeholder="Cross"
                value={form.string2}
                onChange={(e) => setForm({ ...form, string2: e.target.value })}
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-[#64748b] mb-2 block">ราคา</label>
            <div className="flex gap-[10px]">
              {([200, 300] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, price: p })}
                  className="flex-1 py-[14px] rounded-[12px] font-bold text-lg num
                             cursor-pointer transition-all duration-150"
                  style={{
                    border: `2px solid ${
                      form.price === p
                        ? p === 200
                          ? "#22c55e"
                          : "#f59e0b"
                        : "rgba(255,255,255,0.1)"
                    }`,
                    background:
                      form.price === p
                        ? p === 200
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(245,158,11,0.12)"
                        : "rgba(255,255,255,0.03)",
                    color:
                      form.price === p
                        ? p === 200
                          ? "#22c55e"
                          : "#f59e0b"
                        : "#64748b",
                  }}
                >
                  ฿{p}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">หมายเหตุ</label>
            <input
              className="inp"
              placeholder="ไม่จำเป็น"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-[10px] mt-5">
          <button className="btn-ghost flex-1" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className={`${isEdit ? "btn-success" : "btn-primary"} flex-[2] disabled:opacity-60`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "กำลังบันทึก…" : isEdit ? "💾 บันทึก" : "➕ เพิ่ม"}
          </button>
        </div>
      </div>
    </div>
  );
}
