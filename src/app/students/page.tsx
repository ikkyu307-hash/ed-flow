"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  addStudent,
  deleteStudent,
  getStudentGroups,
  getStudents,
  updateStudent,
} from "@/lib/data";
import type { Student, StudentGroup } from "@/lib/types";

interface FormState {
  id: string | null;
  studentCode: string;
  name: string;
  studentGroupId: string;
}

const EMPTY_FORM: FormState = { id: null, studentCode: "", name: "", studentGroupId: "" };

export default function StudentsPage() {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? "—";

  const refresh = async () => {
    const all = await getStudents();
    setStudents(all);
  };

  useEffect(() => {
    (async () => {
      const [g, s] = await Promise.all([getStudentGroups(), getStudents()]);
      setGroups(g);
      setStudents(s);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterGroup && s.studentGroupId !== filterGroup) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.studentCode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, filterGroup, search]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, studentGroupId: filterGroup || groups[0]?.id || "" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setForm({ id: s.id, studentCode: s.studentCode, name: s.name, studentGroupId: s.studentGroupId });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentCode.trim() || !form.name.trim() || !form.studentGroupId) {
      setError("กรุณากรอกรหัสนักเรียน ชื่อ และเลือกห้องเรียนให้ครบ");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await updateStudent({
          id: form.id,
          studentCode: form.studentCode.trim(),
          name: form.name.trim(),
          studentGroupId: form.studentGroupId,
        });
      } else {
        await addStudent({
          studentCode: form.studentCode.trim(),
          name: form.name.trim(),
          studentGroupId: form.studentGroupId,
        });
      }
      await refresh();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`ลบนักเรียน "${s.name}" ?`)) return;
    await deleteStudent(s.id);
    await refresh();
  };

  return (
    <AppShell title="จัดการนักเรียน">
      <div className="ed-page-head">
        <h1 className="ed-page-title">จัดการข้อมูลนักเรียน</h1>
        <p className="ed-page-desc">เพิ่ม แก้ไข หรือลบข้อมูลนักเรียน (รหัสนักเรียน, ชื่อ, ห้องเรียน)</p>
      </div>

      <div className="ed-toolbar">
        <select
          className="ed-select"
          style={{ maxWidth: "220px" }}
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
        >
          <option value="">ทุกห้องเรียน</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          className="ed-input"
          style={{ maxWidth: "240px" }}
          placeholder="ค้นหาชื่อ / รหัส..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="ed-spacer" />
        <button className="ed-btn ed-btn-primary" onClick={openAdd}>
          + เพิ่มนักเรียน
        </button>
      </div>

      {loading ? (
        <div className="ed-loading">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="ed-card">
          <div className="ed-empty">
            <span className="ed-empty-emoji">🧑‍🎓</span>
            ไม่พบนักเรียน — กดปุ่ม &quot;เพิ่มนักเรียน&quot; เพื่อเริ่มต้น
          </div>
        </div>
      ) : (
        <div className="ed-table-wrap">
          <table className="ed-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ห้องเรียน</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id}>
                  <td className="ed-muted ed-mono">{idx + 1}</td>
                  <td className="ed-mono">{s.studentCode}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="ed-muted">{groupName(s.studentGroupId)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="ed-btn ed-btn-sm ed-btn-ghost" onClick={() => openEdit(s)}>
                      ✏️ แก้ไข
                    </button>{" "}
                    <button className="ed-btn ed-btn-sm ed-btn-danger" onClick={() => handleDelete(s)}>
                      🗑 ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="ed-modal-backdrop" onClick={() => setModalOpen(false)}>
          <form className="ed-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <div className="ed-modal-title">{form.id ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}</div>

            <div className="ed-field">
              <label>รหัสนักเรียน</label>
              <input
                className="ed-input"
                value={form.studentCode}
                onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                placeholder="เช่น 10001"
              />
            </div>
            <div className="ed-field">
              <label>ชื่อ-นามสกุล</label>
              <input
                className="ed-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น เด็กชายสมชาย ใจดี"
              />
            </div>
            <div className="ed-field">
              <label>ห้องเรียน / ชั้นเรียน</label>
              <select
                className="ed-select"
                value={form.studentGroupId}
                onChange={(e) => setForm({ ...form, studentGroupId: e.target.value })}
              >
                <option value="">— เลือกห้องเรียน —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p style={{ color: "var(--accent-red)", fontSize: "0.82rem" }}>{error}</p>
            )}

            <div className="ed-modal-actions">
              <button type="button" className="ed-btn" onClick={() => setModalOpen(false)}>
                ยกเลิก
              </button>
              <button type="submit" className="ed-btn ed-btn-primary" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
