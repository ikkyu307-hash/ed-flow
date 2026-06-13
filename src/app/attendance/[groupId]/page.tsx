"use client";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import AppShell from "@/components/AppShell";
import {
  createSession,
  getCourses,
  getCurrentTeacher,
  getRecords,
  getSessionsForGroup,
  getStudentGroups,
  getStudents,
  setRecord,
} from "@/lib/data";
import {
  STATUS_META,
  STATUS_ORDER,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceStatus,
  type Course,
  type Student,
  type StudentGroup,
  type Teacher,
} from "@/lib/types";

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ClassAttendancePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [group, setGroup] = useState<StudentGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayStr());
  const [period, setPeriod] = useState<number | "">("");
  const [courseId, setCourseId] = useState<string>("");

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      const t = await getCurrentTeacher();
      if (!active) return;
      if (!t) {
        router.push("/login");
        return;
      }
      setTeacher(t);
      const [groups, studs, crs] = await Promise.all([
        getStudentGroups(),
        getStudents(groupId),
        getCourses(),
      ]);
      if (!active) return;
      setGroup(groups.find((g) => g.id === groupId) ?? null);
      setStudents(studs);
      setCourses(crs);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [groupId, router]);

  const loadRecords = useCallback(async (sessionId: string) => {
    const recs = await getRecords(sessionId);
    const map: Record<string, AttendanceRecord> = {};
    recs.forEach((r) => {
      map[r.studentId] = r;
    });
    setRecords(map);
  }, []);

  // Resolve the session whenever date/period changes (find existing, else null)
  useEffect(() => {
    let active = true;
    (async () => {
      const all = await getSessionsForGroup(groupId);
      if (!active) return;
      const match = all.find(
        (s) => s.date === date && (s.period ?? "") === (period === "" ? "" : period),
      );
      if (match) {
        setSession(match);
        await loadRecords(match.id);
      } else {
        setSession(null);
        setRecords({});
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, date, period, loadRecords]);

  const ensureSession = useCallback(async (): Promise<AttendanceSession | null> => {
    if (session) return session;
    if (!teacher) return null;
    const created = await createSession({
      teacherId: teacher.id,
      studentGroupId: groupId,
      courseId: courseId || null,
      classroomId: null,
      date,
      period: period === "" ? null : period,
    });
    setSession(created);
    return created;
  }, [session, teacher, groupId, courseId, date, period]);

  const handleMark = async (studentId: string, status: AttendanceStatus) => {
    setSavingId(studentId);
    try {
      const s = await ensureSession();
      if (!s) return;
      await setRecord(s.id, studentId, status, "manual");
      await loadRecords(s.id);
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAll = async (status: AttendanceStatus) => {
    const s = await ensureSession();
    if (!s) return;
    for (const st of students) {
      await setRecord(s.id, st.id, status, "manual");
    }
    await loadRecords(s.id);
  };

  const handleOpenQr = async () => {
    const s = await ensureSession();
    if (!s) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/attend/${s.token}`;
    setQrUrl(url);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1 });
      setQrDataUrl(dataUrl);
      setQrOpen(true);
    } catch (e) {
      console.error("QR generation failed", e);
    }
  };

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, late: 0, leave: 0, absent: 0 };
    Object.values(records).forEach((r) => {
      counts[r.status] += 1;
    });
    const marked = Object.keys(records).length;
    return { counts, marked, unmarked: students.length - marked };
  }, [records, students]);

  return (
    <AppShell title="เช็คชื่อ" subtitle={group?.name}>
      <div className="ed-page-head">
        <Link href="/attendance" className="ed-muted" style={{ fontSize: "0.85rem" }}>
          ← กลับไปรายการห้องเรียน
        </Link>
        <h1 className="ed-page-title" style={{ marginTop: "0.4rem" }}>
          {group ? group.name : "ห้องเรียน"}
        </h1>
        <p className="ed-page-desc">เลือกวันที่/คาบ แล้วเช็คชื่อนักเรียนได้เลย หรือสร้าง QR ให้นักเรียนสแกน</p>
      </div>

      {loading ? (
        <div className="ed-loading">กำลังโหลดรายชื่อนักเรียน...</div>
      ) : (
        <>
          {/* Controls */}
          <div className="ed-card" style={{ marginBottom: "1rem" }}>
            <div className="ed-form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div className="ed-field" style={{ marginBottom: 0 }}>
                <label>วันที่</label>
                <input
                  className="ed-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="ed-field" style={{ marginBottom: 0 }}>
                <label>คาบเรียน</label>
                <select
                  className="ed-select"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">ทั้งวัน</option>
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      คาบที่ {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ed-field" style={{ marginBottom: 0 }}>
                <label>วิชา (ไม่บังคับ)</label>
                <select
                  className="ed-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">— ไม่ระบุ —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="ed-stat-grid" style={{ marginBottom: "1rem" }}>
            <div className="ed-stat">
              <div className="ed-stat-value">{students.length}</div>
              <div className="ed-stat-label">นักเรียนทั้งหมด</div>
            </div>
            {STATUS_ORDER.map((s) => (
              <div className="ed-stat" key={s}>
                <div className="ed-stat-value" style={{ color: STATUS_META[s].color }}>
                  {summary.counts[s]}
                </div>
                <div className="ed-stat-label">
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="ed-toolbar">
            <button className="ed-btn ed-btn-sm" onClick={() => handleMarkAll("present")}>
              ✅ มาเรียนทั้งหมด
            </button>
            <span className="ed-spacer" />
            <button className="ed-btn ed-btn-purple ed-btn-sm" onClick={handleOpenQr}>
              📱 สร้าง QR เช็คชื่อ
            </button>
          </div>

          {/* Student table */}
          {students.length === 0 ? (
            <div className="ed-card">
              <div className="ed-empty">
                <span className="ed-empty-emoji">🧑‍🎓</span>
                ยังไม่มีรายชื่อนักเรียนในห้องนี้ — เพิ่มได้ที่เมนู &quot;นักเรียน&quot;
              </div>
            </div>
          ) : (
            <div className="ed-table-wrap">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>รหัส</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => {
                    const current = records[st.id]?.status;
                    return (
                      <tr key={st.id}>
                        <td className="ed-muted ed-mono">{idx + 1}</td>
                        <td className="ed-mono">{st.studentCode}</td>
                        <td style={{ fontWeight: 600 }}>
                          {st.name}
                          {records[st.id]?.source === "qr" && (
                            <span className="ed-muted" style={{ fontSize: "0.72rem" }}> &nbsp;· สแกน QR</span>
                          )}
                        </td>
                        <td>
                          <div className="ed-status-group">
                            {STATUS_ORDER.map((s) => (
                              <button
                                key={s}
                                disabled={savingId === st.id}
                                className={`ed-status-btn ${s} ${current === s ? "on" : ""}`}
                                onClick={() => handleMark(st.id, s)}
                              >
                                {STATUS_META[s].short}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* QR modal */}
      {qrOpen && (
        <div className="ed-modal-backdrop" onClick={() => setQrOpen(false)}>
          <div className="ed-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ed-modal-title">QR เช็คชื่อ — {group?.name}</div>
            <div className="ed-qr-box">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code สำหรับเช็คชื่อ" />
              )}
              <p className="ed-muted" style={{ fontSize: "0.85rem", textAlign: "center" }}>
                ให้นักเรียนสแกน QR นี้ด้วยกล้องมือถือ เพื่อเช็คชื่อด้วยตนเอง
              </p>
              <div className="ed-qr-url">{qrUrl}</div>
            </div>
            <div className="ed-modal-actions">
              <button className="ed-btn" onClick={() => setQrOpen(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
