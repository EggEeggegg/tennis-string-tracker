"use client";

import { useState, useEffect, useCallback } from "react";
import { RecordCard } from "@/components/RecordCard";
import { RecordForm } from "@/components/RecordForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import { recordsApi } from "@/lib/api";
import { today, fmtDateShort, fmtMoney } from "@/lib/utils";
import type { Record } from "@/types";

export default function DailyPage() {
  const [selDate, setSelDate] = useState(today);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<Record | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Chips: today + up to 7 recent dates
  const [recentDates, setRecentDates] = useState<string[]>([]);

  const loadRecords = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await recordsApi.list({ date });
      setRecords(data);
    } catch {
      toast("โหลดข้อมูลล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recent dates for chips (all distinct dates)
  useEffect(() => {
    recordsApi
      .dailySummary()
      .then((ds) => setRecentDates(ds.map((d) => d.date).slice(0, 8)))
      .catch(() => { });
  }, []);

  useEffect(() => {
    loadRecords(selDate);
  }, [selDate, loadRecords]);

  const dayTotal = records.reduce((s, r) => s + r.price, 0);
  const saleCount = records.filter((r) => r.is_new_racket).length;
  const saleTotal = saleCount * 200;

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (data: Omit<Record, "id" | "user_id" | "date" | "seq" | "created_at" | "updated_at">) => {
    setSaving(true);
    try {
      const created = await recordsApi.create({ date: selDate, ...data });
      setRecords((prev) => [...prev, created]);
      setShowForm(false);
      toast("เพิ่มสำเร็จ ✓");
      // Refresh chips if this is a new date
      if (!recentDates.includes(selDate)) {
        setRecentDates((prev) => [selDate, ...prev].slice(0, 8));
      }
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────

  const handleUpdate = async (data: Omit<Record, "id" | "user_id" | "date" | "seq" | "created_at" | "updated_at">) => {
    if (!editRecord) return;
    setSaving(true);
    try {
      const updated = await recordsApi.update(editRecord.id, data);
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditRecord(null);
      toast("แก้ไขสำเร็จ — updatedAt อัพเดทแล้ว ✓");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await recordsApi.delete(deleteId);
      setRecords((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      toast("ลบแล้ว", "warning");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "เกิดข้อผิดพลาด", "error");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      {/* App header */}
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
        <p className="text-[#374560] text-xs">บันทึกการขึ้นเอ็นเทนนิส</p>
      </div>

      {/* Date picker + chips */}
      <div className="mb-4">
        <div className="flex items-center gap-[10px] mb-[10px]">
          <span className="font-bold text-sm">📅 วันที่</span>
          <input
            type="date"
            value={selDate}
            onChange={(e) => setSelDate(e.target.value)}
            className="inp w-[160px] px-3 py-2 text-sm ml-auto"
          />
        </div>

        {/* Date chips */}
        <div className="flex gap-[6px] overflow-x-auto pb-1"
          style={{ WebkitOverflowScrolling: "touch" }}>
          <button
            className={selDate === today() ? "chip-active" : "chip-inactive"}
            onClick={() => setSelDate(today())}
          >
            วันนี้
          </button>
          {recentDates
            .filter((d) => d !== today())
            .map((d) => (
              <button
                key={d}
                className={selDate === d ? "chip-active" : "chip-inactive"}
                onClick={() => setSelDate(d)}
              >
                {fmtDateShort(d)}
              </button>
            ))}
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className={`grid gap-2 mb-4 ${saleCount > 0 ? "grid-cols-2" : "grid-cols-2"}`}>
          <div className="stat-card">
            <div className="text-[#475569] text-[10px] font-semibold">ไม้</div>
            <div className="num text-xl mt-1" style={{ color: "#e2e8f0" }}>{records.length}</div>
          </div>
          <div className="stat-card">
            <div className="text-[#475569] text-[10px] font-semibold">รายได้</div>
            <div className="num text-xl mt-1" style={{ color: "#22c55e" }}>฿{fmtMoney(dayTotal)}</div>
          </div>
          {saleCount > 0 && (
            <>
              <div className="stat-card">
                <div className="text-[#475569] text-[10px] font-semibold">ขายไม้ได้</div>
                <div className="num text-xl mt-1" style={{ color: "#e2e8f0" }}>{saleCount}</div>
              </div>
              <div className="stat-card">
                <div className="text-[#475569] text-[10px] font-semibold">ค่าคอม</div>
                <div className="num text-xl mt-1" style={{ color: "#f59e0b" }}>฿{fmtMoney(saleTotal)}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div className="text-center text-[#374560] text-sm py-8">กำลังโหลด…</div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-[#475569] text-sm font-semibold">ยังไม่มีรายการ</div>
          <div className="text-[#2d3a52] text-xs mt-1">กดปุ่ม + ด้านล่างเพื่อเพิ่ม</div>
        </div>
      ) : (
        records.map((r) => (
          <RecordCard
            key={r.id}
            record={r}
            onEdit={(rec) => setEditRecord(rec)}
            onDelete={(id) => setDeleteId(id)}
          />
        ))
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={() => {
          setEditRecord(null);
          setShowForm(true);
        }}
      >
        +
      </button>

      {/* Create form */}
      {showForm && (
        <RecordForm
          date={selDate}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          loading={saving}
        />
      )}

      {/* Edit form */}
      {editRecord && (
        <RecordForm
          date={selDate}
          initial={editRecord}
          onSubmit={handleUpdate}
          onClose={() => setEditRecord(null)}
          loading={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ConfirmDialog
          title="ลบรายการนี้?"
          description="การลบไม่สามารถย้อนกลับได้"
          confirmLabel="ลบเลย"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
