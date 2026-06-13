"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  getAllRecords,
  getAllSessions,
  getStudentGroups,
  getStudents,
} from "@/lib/data";
import {
  STATUS_META,
  STATUS_ORDER,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceStatus,
  type Student,
  type StudentGroup,
} from "@/lib/types";

type Mode = "daily" | "weekly" | "monthly";

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeFor(mode: Mode, dateStr: string): { start: string; end: string; label: string } {
  const base = new Date(dateStr + "T00:00:00");
  if (mode === "daily") {
    return { start: dateStr, end: dateStr, label: base.toLocaleDateString("th-TH", { dateStyle: "long" }) };
  }
  if (mode === "weekly") {
    const day = base.getDay(); // 0 Sun .. 6 Sat
    const diffToMon = (day + 6) % 7;
    const mon = new Date(base);
    mon.setDate(base.getDate() - diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: fmt(mon),
      end: fmt(sun),
      label: `${mon.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${sun.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`,
    };
  }
  // monthly
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    start: fmt(first),
    end: fmt(last),
    label: base.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
  };
}

type Counts = Record<AttendanceStatus, number>;
const zeroCounts = (): Counts => ({ present: 0, late: 0, leave: 0, absent: 0 });

function rate(c: Counts): number {
  const total = c.present + c.late + c.leave + c.absent;
  if (total === 0) return 0;
  return Math.round(((c.present + c.late) / total) * 100);
}

export default function ReportsPage() {
  const [mode, setMode] = useState<Mode>("daily");
  const [date, setDate] = useState(fmt(new Date()));
  const [groupFilter, setGroupFilter] = useState("");

  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [g, st, se, re] = await Promise.all([
        getStudentGroups(),
        getStudents(),
        getAllSessions(),
        getAllRecords(),
      ]);
      setGroups(g);
      setStudents(st);
      setSessions(se);
      setRecords(re);
      setLoading(false);
    })();
  }, []);

  const range = useMemo(() => rangeFor(mode, date), [mode, date]);

  const data = useMemo(() => {
    const inRange = sessions.filter(
      (s) =>
        s.date >= range.start &&
        s.date <= range.end &&
        (!groupFilter || s.studentGroupId === groupFilter),
    );
    const sessionIds = new Set(inRange.map((s) => s.id));
    const sessionGroup = new Map(inRange.map((s) => [s.id, s.studentGroupId]));
    const rangeRecords = records.filter((r) => sessionIds.has(r.sessionId));

    const overall = zeroCounts();
    const byGroup = new Map<string, Counts>();
    const byStudent = new Map<string, Counts>();

    rangeRecords.forEach((r) => {
      overall[r.status] += 1;
      const gid = sessionGroup.get(r.sessionId);
      if (gid) {
        if (!byGroup.has(gid)) byGroup.set(gid, zeroCounts());
        byGroup.get(gid)![r.status] += 1;
      }
      if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, zeroCounts());
      byStudent.get(r.studentId)![r.status] += 1;
    });

    return { inRange, overall, byGroup, byStudent, sessionCount: inRange.length };
  }, [sessions, records, range, groupFilter]);

  const studentRows = useMemo(() => {
    if (!groupFilter) return [];
    return students
      .filter((s) => s.studentGroupId === groupFilter)
      .map((s) => ({ student: s, counts: data.byStudent.get(s.id) ?? zeroCounts() }))
      .sort((a, b) => a.student.studentCode.localeCompare(b.student.studentCode));
  }, [students, groupFilter, data]);

  return (
    <AppShell title="รายงานการเช็คชื่อ">
      <div className="ed-page-head">
        <h1 className="ed-page-title">รายงานสรุปการเช็คชื่อ</h1>
        <p className="ed-page-desc">สรุปข้อมูลการมาเรียนแบบรายวัน รายสัปดาห์ และรายเดือน</p>
      </div>

      <div className="ed-card" style={{ marginBottom: "1rem" }}>
        <div className="ed-toolbar" style={{ marginBottom: 0 }}>
          <div className="ed-status-group">
            {(["daily", "weekly", "monthly"] as Mode[]).map((m) => (
              <button
                key={m}
                className={`ed-btn ed-btn-sm ${mode === m ? "ed-btn-primary" : ""}`}
                onClick={() => setMode(m)}
              >
                {m === "daily" ? "รายวัน" : m === "weekly" ? "รายสัปดาห์" : "รายเดือน"}
              </button>
            ))}
          </div>
          <input
            className="ed-input"
            style={{ maxWidth: "180px" }}
            type={mode === "monthly" ? "month" : "date"}
            value={mode === "monthly" ? date.slice(0, 7) : date}
            onChange={(e) =>
              setDate(mode === "monthly" ? `${e.target.value}-01` : e.target.value)
            }
          />
          <select
            className="ed-select"
            style={{ maxWidth: "220px" }}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">ทุกห้องเรียน</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <p className="ed-muted" style={{ marginTop: "0.7rem", fontSize: "0.85rem" }}>
          ช่วงรายงาน: <strong>{range.label}</strong> · {data.sessionCount} คาบเช็คชื่อ
        </p>
      </div>

      {loading ? (
        <div className="ed-loading">กำลังโหลดรายงาน...</div>
      ) : (
        <>
          {/* Overall stats */}
          <div className="ed-stat-grid" style={{ marginBottom: "1.2rem" }}>
            <div className="ed-stat">
              <div className="ed-stat-value" style={{ color: "var(--accent-color)" }}>
                {rate(data.overall)}%
              </div>
              <div className="ed-stat-label">อัตราการมาเรียน</div>
            </div>
            {STATUS_ORDER.map((s) => (
              <div className="ed-stat" key={s}>
                <div className="ed-stat-value" style={{ color: STATUS_META[s].color }}>
                  {data.overall[s]}
                </div>
                <div className="ed-stat-label">
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </div>
              </div>
            ))}
          </div>

          {/* Per-class summary */}
          <h3 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>สรุปรายห้องเรียน</h3>
          {data.byGroup.size === 0 ? (
            <div className="ed-card">
              <div className="ed-empty">
                <span className="ed-empty-emoji">📊</span>
                ไม่มีข้อมูลการเช็คชื่อในช่วงที่เลือก
              </div>
            </div>
          ) : (
            <div className="ed-table-wrap">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>ห้องเรียน</th>
                    {STATUS_ORDER.map((s) => (
                      <th key={s}>{STATUS_META[s].short}</th>
                    ))}
                    <th>อัตรามา</th>
                  </tr>
                </thead>
                <tbody>
                  {groups
                    .filter((g) => data.byGroup.has(g.id))
                    .map((g) => {
                      const c = data.byGroup.get(g.id)!;
                      return (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 600 }}>{g.name}</td>
                          {STATUS_ORDER.map((s) => (
                            <td key={s} className="ed-mono" style={{ color: STATUS_META[s].color }}>
                              {c[s]}
                            </td>
                          ))}
                          <td className="ed-mono" style={{ fontWeight: 700 }}>{rate(c)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-student (only when a class is selected) */}
          {groupFilter && studentRows.length > 0 && (
            <>
              <h3 style={{ margin: "1.4rem 0 0.6rem", fontSize: "1rem" }}>
                รายละเอียดรายนักเรียน
              </h3>
              <div className="ed-table-wrap">
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อ-นามสกุล</th>
                      {STATUS_ORDER.map((s) => (
                        <th key={s}>{STATUS_META[s].short}</th>
                      ))}
                      <th>อัตรามา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map(({ student, counts }) => (
                      <tr key={student.id}>
                        <td className="ed-mono">{student.studentCode}</td>
                        <td style={{ fontWeight: 600 }}>{student.name}</td>
                        {STATUS_ORDER.map((s) => (
                          <td key={s} className="ed-mono">
                            {counts[s]}
                          </td>
                        ))}
                        <td className="ed-mono" style={{ fontWeight: 700 }}>{rate(counts)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
