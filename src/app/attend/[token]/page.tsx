"use client";

import React, { use, useEffect, useState } from "react";
import {
  getSessionByToken,
  getStudentGroups,
  getStudents,
  setRecord,
} from "@/lib/data";
import type { AttendanceSession, Student } from "@/lib/types";
import "@/components/app-shell.css";

export default function AttendByQrPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [groupName, setGroupName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSessionByToken(token);
      if (!s) {
        setLoading(false);
        return;
      }
      setSession(s);
      const [groups, studs] = await Promise.all([
        getStudentGroups(),
        getStudents(s.studentGroupId),
      ]);
      setGroupName(groups.find((g) => g.id === s.studentGroupId)?.name ?? "");
      setStudents(studs);
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !studentId) {
      setError("กรุณาเลือกชื่อของคุณ");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setRecord(session.id, studentId, "present", "qr");
      setDone(students.find((s) => s.id === studentId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ed-shell">
      <div
        className="ed-main"
        style={{ maxWidth: "440px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh" }}
      >
        <div className="ed-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <span className="ed-brand-mark">EF</span>
            <strong>ed-flow · เช็คชื่อด้วย QR</strong>
          </div>

          {loading ? (
            <div className="ed-loading">กำลังโหลด...</div>
          ) : !session ? (
            <div className="ed-empty">
              <span className="ed-empty-emoji">⚠️</span>
              ไม่พบคาบเช็คชื่อนี้ หรือ QR หมดอายุแล้ว
            </div>
          ) : done ? (
            <div className="ed-empty">
              <span className="ed-empty-emoji">🎉</span>
              <div style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 700 }}>
                เช็คชื่อสำเร็จ!
              </div>
              <p style={{ marginTop: "0.5rem" }}>
                {done.name} ({done.studentCode}) — บันทึกว่า{" "}
                <span style={{ color: "var(--accent-green)" }}>มาเรียน</span> เรียบร้อย
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="ed-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                ห้องเรียน <strong style={{ color: "var(--text-primary)" }}>{groupName}</strong> ·
                วันที่ {session.date}
                {session.period ? ` · คาบที่ ${session.period}` : ""}
              </p>

              <div className="ed-field">
                <label>เลือกชื่อของคุณเพื่อเช็คชื่อ</label>
                <select
                  className="ed-select"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                >
                  <option value="">— เลือกชื่อ —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p style={{ color: "var(--accent-red)", fontSize: "0.82rem" }}>{error}</p>
              )}

              <button
                type="submit"
                className="ed-btn ed-btn-primary"
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={submitting}
              >
                {submitting ? "กำลังบันทึก..." : "✅ เช็คชื่อมาเรียน"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
