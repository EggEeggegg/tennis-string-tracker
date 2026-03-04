"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { toast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fmtMoney, getStoredUser, today } from "@/lib/utils";
import type { User, AdminReportResponse } from "@/types";

const monthStart = () => `${today().slice(0, 7)}-01`;

export default function AdminPage() {
  const router = useRouter();
  const currentUser = getStoredUser();

  // Redirect non-admins
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

  const loadUsers = useCallback(() => {
    adminApi.listUsers().then(setUsers).catch(() => toast("โหลด user ล้มเหลว", "error"));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

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

    // Validate username format
    const usernameLower = createForm.username.toLowerCase();
    if (!/^[a-z0-9_-]{3,50}$/.test(usernameLower)) {
      toast("username ต้อง 3-50 ตัว (a-z, 0-9, _, -)", "error");
      return;
    }

    // Validate password length
    if (createForm.password.length < 6) {
      toast("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร", "error");
      return;
    }

    setCreating(true);
    try {
      const u = await adminApi.createUser({
        ...createForm,
        username: usernameLower, // Send lowercase to API
      });
      setUsers((prev) => [...prev, u]);
      setShowCreateForm(false);
      setCreateForm({ username: "", password: "", name: "", role: "user" });
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
      if (editForm.password) {
        payload.password = editForm.password;
      }

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

  // ── Report tab ─────────────────────────────────────────────────────────────

  const [tab, setTab] = useState<"users" | "report">("users");
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

  useEffect(() => { if (tab === "report") loadReport(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      <div className="text-center py-2 pb-4">
        <div className="text-3xl">🎾</div>
        <h1 className="num text-xl"
          style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          String Tracker
        </h1>
        <p className="text-[#374560] text-xs">⚙️ Admin Dashboard</p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2 mb-4">
        {(["users", "report"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "chip-active" : "chip-inactive"}
          >
            {t === "users" ? "👥 ผู้ใช้" : "📊 Report"}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-sm">รายชื่อผู้ใช้ ({users.length})</h2>
            <button className="btn-primary px-4 py-2 text-sm"
              onClick={() => setShowCreateForm(true)}>
              + เพิ่ม
            </button>
          </div>

          {users.map((u) => (
            <div key={u.id} className="record-item">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {u.name}
                    {u.role === "admin" && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-[1px] rounded-full">admin</span>
                    )}
                    {!u.is_active && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-[1px] rounded-full">ปิดใช้งาน</span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748b] mt-[2px]">@{u.username}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`text-[11px] px-2 py-1 rounded-[8px] border ${
                      u.is_active
                        ? "text-[#f59e0b] border-amber-500/30 bg-amber-500/10"
                        : "text-[#22c55e] border-green-500/30 bg-green-500/10"
                    }`}
                  >
                    {u.is_active ? "ปิด" : "เปิด"}
                  </button>
                  {u.id !== currentUser?.id && (
                    <>
                      <button
                        className="text-[11px] px-2 py-1 rounded-[8px] border text-[#3b82f6] border-blue-500/30 bg-blue-500/10"
                        onClick={() => handleEditClick(u)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-danger px-[10px] py-[6px] text-[11px] rounded-[8px]"
                        onClick={() => setDeleteUserId(u.id)}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Create user form */}
          {showCreateForm && (
            <div className="overlay" onClick={() => setShowCreateForm(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
                <h3 className="font-bold text-base mb-4">👤 เพิ่มผู้ใช้ใหม่</h3>
                <div className="flex flex-col gap-[14px]">
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">ชื่อผู้ใช้ *</label>
                    <input className="inp" placeholder="username" value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} />
                    <p className="text-[10px] text-[#475569] mt-1">3–50 ตัวอักษร, a-z, 0-9, _ หรือ - เท่านั้น</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">รหัสผ่าน *</label>
                    <input className="inp" type="password" placeholder="อย่างน้อย 6 ตัว" value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                    <p className="text-[10px] text-[#475569] mt-1">อย่างน้อย 6 ตัวอักษร</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">ชื่อ-นามสกุล *</label>
                    <input className="inp" placeholder="ชื่อแสดง" value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-2 block">บทบาท</label>
                    <div className="flex gap-2">
                      {(["user", "admin"] as const).map((r) => (
                        <button key={r} onClick={() => setCreateForm({ ...createForm, role: r })}
                          className={`flex-1 py-[10px] rounded-[10px] text-sm font-semibold transition-all ${
                            createForm.role === r
                              ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                              : "bg-white/[0.04] border-2 border-white/10 text-[#64748b]"
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-[10px] mt-5">
                  <button className="btn-ghost flex-1" onClick={() => setShowCreateForm(false)}>ยกเลิก</button>
                  <button className="btn-primary flex-[2] disabled:opacity-60" onClick={handleCreateUser} disabled={creating}>
                    {creating ? "กำลังสร้าง…" : "สร้าง User"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit user form */}
          {editingUser && (
            <div className="overlay" onClick={() => setEditingUser(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
                <h3 className="font-bold text-base mb-4">✎ แก้ไข {editingUser.name}</h3>
                <div className="flex flex-col gap-[14px]">
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">ชื่อ-นามสกุล *</label>
                    <input className="inp" placeholder="ชื่อแสดง" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1 block">รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</label>
                    <input className="inp" type="password" placeholder="ปล่อยว่างเพื่อไม่เปลี่ยน" value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                    <p className="text-[10px] text-[#475569] mt-1">อย่างน้อย 6 ตัวอักษร (ถ้ากรอก)</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-2 block">บทบาท</label>
                    <div className="flex gap-2">
                      {(["user", "admin"] as const).map((r) => (
                        <button key={r} onClick={() => setEditForm({ ...editForm, role: r })}
                          className={`flex-1 py-[10px] rounded-[10px] text-sm font-semibold transition-all ${
                            editForm.role === r
                              ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                              : "bg-white/[0.04] border-2 border-white/10 text-[#64748b]"
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-[10px] mt-5">
                  <button className="btn-ghost flex-1" onClick={() => setEditingUser(null)}>ยกเลิก</button>
                  <button className="btn-primary flex-[2] disabled:opacity-60" onClick={handleEditUser} disabled={editing}>
                    {editing ? "กำลังแก้ไข…" : "บันทึก"}
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
          {/* Filter */}
          <div className="card mb-4">
            <div className="flex gap-[10px] items-center mb-3">
              <div className="flex-1">
                <label className="text-xs text-[#475569] block mb-1">เริ่ม</label>
                <input type="date" className="inp px-3 py-[10px] text-sm" value={repStart}
                  onChange={(e) => setRepStart(e.target.value)} />
              </div>
              <span className="text-[#374560] mt-4">→</span>
              <div className="flex-1">
                <label className="text-xs text-[#475569] block mb-1">สิ้นสุด</label>
                <input type="date" className="inp px-3 py-[10px] text-sm" value={repEnd}
                  onChange={(e) => setRepEnd(e.target.value)} />
              </div>
            </div>
            <button className="btn-primary w-full" onClick={loadReport} disabled={repLoading}>
              {repLoading ? "กำลังโหลด…" : "ดู Report"}
            </button>
          </div>

          {report && (
            <>
              {/* Grand summary */}
              <div className="flex gap-2 mb-4">
                <div className="stat-card">
                  <div className="text-[#475569] text-[10px] font-semibold">รวมไม้</div>
                  <div className="num text-xl" style={{ color: "#3b82f6" }}>{report.grand_count}</div>
                </div>
                <div className="stat-card">
                  <div className="text-[#475569] text-[10px] font-semibold">รายได้รวม</div>
                  <div className="num text-xl" style={{ color: "#22c55e" }}>฿{fmtMoney(report.grand_total)}</div>
                </div>
              </div>

              {/* Per-user */}
              {report.users.map((u) => (
                <div key={u.user_id} className="record-item">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm">{u.name}</div>
                      <div className="text-xs text-[#64748b] mt-[2px]">@{u.username}</div>
                      <div className="text-xs text-[#4b5e7a] mt-1">
                        {u.count} ไม้ · ฿200×{u.count_200} · ฿300×{u.count_300}
                      </div>
                    </div>
                    <div className="num text-lg" style={{ color: "#22c55e" }}>
                      ฿{fmtMoney(u.total)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteUserId && (
        <ConfirmDialog
          title="ลบผู้ใช้นี้?"
          description="ข้อมูลทั้งหมดของผู้ใช้จะถูกลบ"
          confirmLabel="ลบ"
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUserId(null)}
        />
      )}
    </div>
  );
}
