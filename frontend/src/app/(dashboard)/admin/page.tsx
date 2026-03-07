"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { toast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fmtMoney, getStoredUser, today } from "@/lib/utils";
import type { User, AdminReportResponse } from "@/types";

const monthStart = () => `${today().slice(0, 7)}-01`;

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = getStoredUser();

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/daily");
    }
  }, [currentUser, router]);

  // ── Users tab ─────────────────────────────────────────────────────────────

  const [users, setUsers] = useState<User[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", name: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "user", password: "" });
  const [editing, setEditing] = useState(false);

  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);

  const loadUsers = useCallback(() => {
    adminApi.listUsers().then(setUsers).catch(() => toast("โหลด user ล้มเหลว", "error"));
  }, []);

  const loadDeletedUsers = useCallback(() => {
    adminApi.listDeletedUsers().then(setDeletedUsers).catch(() => toast("โหลด deleted users ล้มเหลว", "error"));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDeletedUsers();
  }, [loadDeletedUsers]);

  const handleToggleActive = async (u: User) => {
    try {
      const updated = await adminApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast(updated.is_active ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
    } catch {
      toast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await adminApi.deleteUser(deleteUserId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
      loadDeletedUsers(); // โหลด deleted users ใหม่
      toast("ลบผู้ใช้แล้ว", "warning");
    } catch {
      toast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password || !createForm.name) {
      toast("กรุณากรอกข้อมูลให้ครบ", "error");
      return;
    }
    const usernameLower = createForm.username.toLowerCase();
    if (!/^[a-z0-9_-]{3,50}$/.test(usernameLower)) {
      toast("username ต้อง 3-50 ตัว (a-z, 0-9, _, -)", "error");
      return;
    }
    if (createForm.password.length < 6) {
      toast("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร", "error");
      return;
    }
    setCreating(true);
    try {
      const u = await adminApi.createUser({ ...createForm, username: usernameLower });
      setUsers((prev) => [...prev, u]);
      setShowCreateForm(false);
      setCreateForm({ username: "", password: "", name: "", role: "user" });
      loadDeletedUsers(); // โหลด deleted users เพื่อให้ count ถูกต้อง
      toast("สร้าง user สำเร็จ ✓");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, password: "" });
  };

  const handleEditUser = async () => {
    if (!editingUser || !editForm.name) {
      toast("กรุณากรอกชื่อให้ครบ", "error");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร", "error");
      return;
    }
    setEditing(true);
    try {
      const payload: { name: string; role: string; password?: string } = {
        name: editForm.name,
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;
      const updated = await adminApi.updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingUser(null);
      toast("แก้ไข user สำเร็จ ✓");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setEditing(false);
    }
  };

  // ── Deleted users tab ─────────────────────────────────────────────────────

  const [restoreUserId, setRestoreUserId] = useState<string | null>(null);

  const handleRestoreUser = async () => {
    if (!restoreUserId) return;
    try {
      const restored = await adminApi.restoreUser(restoreUserId);
      setDeletedUsers((prev) => prev.filter((u) => u.id !== restored.id));
      setUsers((prev) => [...prev, restored]);
      setRestoreUserId(null);
      setShowDeletedUsers(false); // ย้อนกลับไปหน้า active users
      toast("กู้คืนผู้ใช้แล้ว ✓");
    } catch {
      toast("เกิดข้อผิดพลาด", "error");
    }
  };

  // ── Report tab ─────────────────────────────────────────────────────────────

  const [tab, setTab] = useState<"users" | "report">(
    (searchParams.get("tab") as "users" | "report") ?? "users"
  );

  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  const changeTab = (t: "users" | "report") => {
    setTab(t);
    router.replace(`/admin?tab=${t}`);
  };
  const [report, setReport] = useState<AdminReportResponse | null>(null);
  const [repStart, setRepStart] = useState(monthStart);
  const [repEnd, setRepEnd] = useState(today);
  const [repLoading, setRepLoading] = useState(false);

  const loadReport = async () => {
    setRepLoading(true);
    try {
      const data = await adminApi.report({ start: repStart, end: repEnd });
      setReport(data);
    } catch {
      toast("โหลด report ล้มเหลว", "error");
    } finally {
      setRepLoading(false);
    }
  };

  const downloadReportCSV = async () => {
    if (!report) {
      toast("ไม่มีรายงานให้ดาวน์โหลด", "error");
      return;
    }

    try {
      const res = await adminApi.exportReportCSV(repStart, repEnd);
      if (!res.ok) {
        toast("ดาวน์โหลดล้มเหลว", "error");
        return;
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `report_${repStart}_${repEnd}.xlsx`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("ดาวน์โหลดสำเร็จ ✓");
    } catch {
      toast("ดาวน์โหลดล้มเหลว", "error");
    }
  };

  useEffect(() => { if (tab === "report") loadReport(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avatar initials helper
  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const avatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-blue-700",
      "from-purple-500 to-purple-700",
      "from-emerald-500 to-emerald-700",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-rose-700",
      "from-cyan-500 to-cyan-700",
    ];
    const i = name.charCodeAt(0) % colors.length;
    return colors[i];
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
      {/* Header */}
      <div className="text-center py-3 pb-5">
        <div className="text-4xl mb-1">🎾</div>
        <h1
          className="num text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg,#60a5fa,#a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          String Tracker
        </h1>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-[11px] text-[#475569] bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-[3px]">
            ⚙️ Admin Dashboard
          </span>
        </div>
      </div>

      {/* Sub tabs */}
      <div
        className="flex rounded-[14px] p-[5px] mb-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {(["users", "report"] as const).map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className="flex-1 py-[10px] rounded-[10px] text-sm font-semibold transition-all duration-200"
            style={
              tab === t
                ? { background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff" }
                : { color: "#475569" }
            }
          >
            {t === "users" ? "👥 ผู้ใช้" : "📊 รายงาน"}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold text-base">
                {showDeletedUsers ? "ผู้ใช้ที่ถูกลบ" : "รายชื่อผู้ใช้"}
              </h2>
              <p className="text-xs text-[#475569]">
                {showDeletedUsers ? deletedUsers.length : users.length} บัญชี
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {deletedUsers.length > 0 && (
                <button
                  className={`text-xs px-3 py-[10px] rounded-[10px] border font-semibold transition-all ${showDeletedUsers
                    ? "text-gray-400 border-gray-500/30 bg-gray-500/10 active:bg-gray-500/20"
                    : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 active:bg-emerald-500/20"
                    }`}
                  onClick={() => {
                    setShowDeletedUsers(!showDeletedUsers);
                    if (!showDeletedUsers) loadDeletedUsers();
                  }}
                >
                  🗑️ {showDeletedUsers ? "รายชื่อ" : "กู้คืน"} ({deletedUsers.length})
                </button>
              )}
              {!showDeletedUsers && (
                <button
                  className="btn-primary px-4 py-[10px] text-sm flex items-center gap-1"
                  onClick={() => setShowCreateForm(true)}
                >
                  <span className="text-lg leading-none">+</span> เพิ่มผู้ใช้
                </button>
              )}
            </div>
          </div>

          {showDeletedUsers ? (
            deletedUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#475569] text-sm">ไม่มีผู้ใช้ที่ถูกลบ</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {deletedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {initials(u.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[15px] text-[#e2e8f0]">{u.name}</span>
                          {u.role === "admin" && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/25 px-2 py-[2px] rounded-full font-semibold">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#475569] mt-[2px]">@{u.username}</div>
                      </div>

                      {/* Restore button */}
                      <button
                        className="text-xs px-3 py-[7px] rounded-[10px] border text-emerald-400 border-emerald-500/30 bg-emerald-500/10 active:bg-emerald-500/20 font-semibold"
                        onClick={() => setRestoreUserId(u.id)}
                      >
                        ✓ กู้คืน
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4 transition-colors active:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                    >
                      {initials(u.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[15px] text-[#e2e8f0]">{u.name}</span>
                        {u.role === "admin" && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/25 px-2 py-[2px] rounded-full font-semibold">
                            ADMIN
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/25 px-2 py-[2px] rounded-full font-semibold">
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#475569] mt-[2px]">@{u.username}</div>
                    </div>

                    {/* Actions */}
                    {u.id !== currentUser?.id && (
                      <div className="flex gap-[6px] flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs px-3 py-[7px] rounded-[10px] border font-semibold transition-all ${u.is_active
                            ? "text-amber-400 border-amber-500/30 bg-amber-500/10 active:bg-amber-500/20"
                            : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 active:bg-emerald-500/20"
                            }`}
                        >
                          {u.is_active ? "Ban" : "Unban"}
                        </button>
                        <button
                          className="text-xs px-3 py-[7px] rounded-[10px] border text-blue-400 border-blue-500/30 bg-blue-500/10 active:bg-blue-500/20 font-semibold"
                          onClick={() => handleEditClick(u)}
                        >
                          แก้ไข
                        </button>
                        <button
                          className="text-xs px-3 py-[7px] rounded-[10px] border text-red-400 border-red-500/30 bg-red-500/10 active:bg-red-500/20 font-semibold"
                          onClick={() => setDeleteUserId(u.id)}
                          title="ลบผู้ใช้ (soft delete)"
                        >
                          ❌ ลบ
                        </button>
                      </div>
                    )}
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] text-[#374560] bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-full">
                        คุณ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create user modal */}
          {showCreateForm && (
            <div className="overlay" onClick={() => setShowCreateForm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
                <h3 className="font-bold text-lg mb-1">เพิ่มผู้ใช้ใหม่</h3>
                <p className="text-xs text-[#475569] mb-5">กรอกข้อมูลสำหรับบัญชีใหม่</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">ชื่อผู้ใช้ (username) *</label>
                    <input
                      className="inp"
                      placeholder="เช่น john_doe"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    />
                    <p className="text-[10px] text-[#374560] mt-[6px]">3–50 ตัว, a-z, 0-9, _ หรือ -</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">รหัสผ่าน *</label>
                    <input
                      className="inp"
                      type="password"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">ชื่อ-นามสกุล *</label>
                    <input
                      className="inp"
                      placeholder="ชื่อที่แสดงในระบบ"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">บทบาท</label>
                    <div className="flex gap-3">
                      {(["user", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setCreateForm({ ...createForm, role: r })}
                          className={`flex-1 py-3 rounded-[12px] text-sm font-semibold transition-all ${createForm.role === r
                            ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                            : "bg-white/[0.04] border-2 border-white/10 text-[#64748b]"
                            }`}
                        >
                          {r === "user" ? "👤 User" : "⚙️ Admin"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="btn-ghost flex-1" onClick={() => setShowCreateForm(false)}>ยกเลิก</button>
                  <button
                    className="btn-primary flex-[2] disabled:opacity-60"
                    onClick={handleCreateUser}
                    disabled={creating}
                  >
                    {creating ? "กำลังสร้าง…" : "สร้างบัญชี"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit user modal */}
          {editingUser && (
            <div className="overlay" onClick={() => setEditingUser(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(editingUser.name)} flex items-center justify-center text-white font-bold`}
                  >
                    {initials(editingUser.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">แก้ไขผู้ใช้</h3>
                    <p className="text-xs text-[#475569]">@{editingUser.username}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">ชื่อ-นามสกุล *</label>
                    <input
                      className="inp"
                      placeholder="ชื่อที่แสดงในระบบ"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</label>
                    <input
                      className="inp"
                      type="password"
                      placeholder="ปล่อยว่างเพื่อไม่เปลี่ยน"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                    <p className="text-[10px] text-[#374560] mt-[6px]">อย่างน้อย 6 ตัวอักษร (ถ้ากรอก)</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-[6px] block font-semibold">บทบาท</label>
                    <div className="flex gap-3">
                      {(["user", "admin"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setEditForm({ ...editForm, role: r })}
                          className={`flex-1 py-3 rounded-[12px] text-sm font-semibold transition-all ${editForm.role === r
                            ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                            : "bg-white/[0.04] border-2 border-white/10 text-[#64748b]"
                            }`}
                        >
                          {r === "user" ? "👤 User" : "⚙️ Admin"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="btn-ghost flex-1" onClick={() => setEditingUser(null)}>ยกเลิก</button>
                  <button
                    className="btn-primary flex-[2] disabled:opacity-60"
                    onClick={handleEditUser}
                    disabled={editing}
                  >
                    {editing ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Report tab ── */}
      {tab === "report" && (
        <div>
          {/* Filter card */}
          <div className="card mb-5">
            <p className="text-xs font-semibold text-[#475569] mb-3">ช่วงเวลา</p>
            <div className="flex gap-3 items-center mb-4">
              <div className="flex-1">
                <label className="text-[11px] text-[#374560] block mb-[6px]">เริ่มต้น</label>
                <input
                  type="date"
                  className="inp py-[10px] text-sm"
                  value={repStart}
                  onChange={(e) => setRepStart(e.target.value)}
                />
              </div>
              <div className="text-[#374560] mt-5 text-sm">→</div>
              <div className="flex-1">
                <label className="text-[11px] text-[#374560] block mb-[6px]">สิ้นสุด</label>
                <input
                  type="date"
                  className="inp py-[10px] text-sm"
                  value={repEnd}
                  onChange={(e) => setRepEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1 py-[12px]" onClick={loadReport} disabled={repLoading}>
                {repLoading ? "กำลังโหลด…" : "🔍 ดูรายงาน"}
              </button>
              <button
                className="btn-primary py-[12px] px-4 disabled:opacity-60"
                onClick={downloadReportCSV}
                disabled={!report || repLoading}
                title="ดาวน์โหลดรายงานเป็น Excel"
              >
                📊
              </button>
            </div>
          </div>

          {report && (
            <>
              {/* Grand summary */}
              {(() => {
                const grandSaleTotal = report.users.reduce((s, u) => s + u.sale_total, 0);
                const grandSaleCount = report.users.reduce((s, u) => s + u.sale_count, 0);
                const grandOtherTotal = report.grand_other_total ?? 0;
                const grandOtherCount = report.grand_other_count ?? 0;
                return (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-[#475569] mb-3">ภาพรวมทั้งหมด</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* รวมไม้ */}
                      <div
                        className="rounded-[16px] p-4 flex flex-col"
                        style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(59,130,246,0.06))", border: "1px solid rgba(59,130,246,0.2)" }}
                      >
                        <div className="text-blue-400 text-lg mb-1">🎾</div>
                        <div className="num text-lg font-bold text-blue-400 leading-tight">{report.grand_count} ไม้</div>
                        <div className="text-[11px] text-[#475569] mt-1 font-semibold">รวมไม้</div>
                      </div>
                      {/* รายรับเอ็น */}
                      <div
                        className="rounded-[16px] p-4 flex flex-col"
                        style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.06))", border: "1px solid rgba(34,197,94,0.2)" }}
                      >
                        <div className="text-emerald-400 text-lg mb-1">🧵</div>
                        <div className="num text-lg font-bold text-emerald-400 leading-tight">฿{fmtMoney(report.grand_total)}</div>
                        <div className="text-[11px] text-[#475569] mt-1 font-semibold">รายรับเอ็น</div>
                      </div>
                      {/* ขายไม้ */}
                      <div
                        className="rounded-[16px] p-4 flex flex-col"
                        style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.06))", border: "1px solid rgba(245,158,11,0.2)" }}
                      >
                        <div className="text-amber-400 text-lg mb-1">🏸</div>
                        <div className="num text-lg font-bold text-amber-400 leading-tight">฿{fmtMoney(grandSaleTotal)}</div>
                        <div className="text-[11px] text-[#475569] mt-1 font-semibold">ขายไม้ ({grandSaleCount})</div>
                      </div>
                    </div>

                    {/* Other income — show only if exists */}
                    {grandOtherCount > 0 && (
                      <div
                        className="rounded-[16px] p-4 mt-2 flex items-center justify-between"
                        style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.12),rgba(6,182,212,0.05))", border: "1px solid rgba(6,182,212,0.2)" }}
                      >
                        <div>
                          <div className="text-xs text-[#475569] font-semibold">รายได้อื่นๆ</div>
                          <div className="text-[11px] text-[#374560] mt-[2px]">{grandOtherCount} รายการ</div>
                        </div>
                        <div className="num text-xl font-bold text-cyan-400">
                          ฿{fmtMoney(grandOtherTotal)}
                        </div>
                      </div>
                    )}

                    {/* Total revenue */}
                    <div
                      className="rounded-[16px] p-4 mt-2 flex items-center justify-between"
                      style={{ background: "linear-gradient(135deg,rgba(167,139,250,0.12),rgba(139,92,246,0.06))", border: "1px solid rgba(167,139,250,0.2)" }}
                    >
                      <div>
                        <div className="text-xs text-[#475569] font-semibold">รายรับรวมทั้งหมด</div>
                        <div className="text-[11px] text-[#374560] mt-[2px]">เอ็น + ขายไม้{grandOtherCount > 0 ? " + อื่นๆ" : ""}</div>
                      </div>
                      <div className="num text-2xl font-bold text-purple-400">
                        ฿{fmtMoney(report.grand_total + grandSaleTotal + grandOtherTotal)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Per-user */}
              <p className="text-xs font-semibold text-[#475569] mb-3">รายละเอียดแต่ละคน ({report.users.length} คน)</p>
              <div className="flex flex-col gap-3">
                {report.users.map((u) => (
                  <div
                    key={u.user_id}
                    className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4"
                  >
                    {/* User header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                        >
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="font-bold text-[15px] text-[#e2e8f0]">{u.name}</div>
                          <div className="text-xs text-[#475569]">@{u.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="num text-xl font-bold text-purple-400">฿{fmtMoney(u.total + u.sale_total + (u.other_total ?? 0))}</div>
                        <div className="text-[10px] text-[#475569]">รวมทั้งหมด</div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="flex gap-2">
                      <div
                        className="flex-1 rounded-[12px] p-3"
                        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.14)" }}
                      >
                        <div className="flex items-center gap-1 mb-[6px]">
                          <span className="text-[10px]">🧵</span>
                          <span className="text-[11px] text-[#475569] font-semibold">เอ็น</span>
                        </div>
                        <div className="num text-base font-bold text-blue-400">{u.count} ไม้</div>
                        <div className="num text-sm text-blue-300 mt-[1px]">฿{fmtMoney(u.total)}</div>
                        <div className="text-[10px] text-[#374560] mt-1">
                          ฿200 × {u.count_200} · ฿300 × {u.count_300}
                        </div>
                      </div>
                      <div
                        className="flex-1 rounded-[12px] p-3"
                        style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.14)" }}
                      >
                        <div className="flex items-center gap-1 mb-[6px]">
                          <span className="text-[10px]">🏸</span>
                          <span className="text-[11px] text-[#475569] font-semibold">ขายไม้</span>
                        </div>
                        <div className="num text-base font-bold text-amber-400">{u.sale_count} ไม้</div>
                        <div className="num text-sm text-amber-300 mt-[1px]">฿{fmtMoney(u.sale_total)}</div>
                        <div className="text-[10px] text-[#374560] mt-1">
                          {u.sale_count > 0 ? `เฉลี่ย ฿${fmtMoney(Math.round(u.sale_total / u.sale_count))} / ไม้` : "ยังไม่มี"}
                        </div>
                      </div>
                    </div>

                    {/* Other income — show only if exists */}
                    {(u.other_count ?? 0) > 0 && (
                      <div
                        className="rounded-[12px] p-3 mt-2 flex items-center justify-between"
                        style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.14)" }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">💰</span>
                          <span className="text-[11px] text-[#475569] font-semibold">รายได้อื่นๆ ({u.other_count} รายการ)</span>
                        </div>
                        <div className="num text-base font-bold text-cyan-400">฿{fmtMoney(u.other_total)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteUserId && (
        <ConfirmDialog
          title="ลบผู้ใช้นี้?"
          description="ข้อมูลทั้งหมดของผู้ใช้จะถูกลบถาวร"
          confirmLabel="ลบ"
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUserId(null)}
        />
      )}

      {/* Restore confirm */}
      {restoreUserId && (
        <ConfirmDialog
          title="กู้คืนผู้ใช้นี้?"
          description="ผู้ใช้จะกลับมาในรายชื่อผู้ใช้ทั่วไป"
          confirmLabel="กู้คืน"
          onConfirm={handleRestoreUser}
          onCancel={() => setRestoreUserId(null)}
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  );
}
