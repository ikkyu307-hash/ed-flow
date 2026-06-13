"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentTeacher, getMyClasses, type TeachingClass } from "@/lib/data";
import type { Teacher } from "@/lib/types";

export default function AttendanceHomePage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<TeachingClass[]>([]);
  const [loading, setLoading] = useState(true);

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
      const cls = await getMyClasses(t.id);
      if (!active) return;
      setClasses(cls);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AppShell title="เช็คชื่อนักเรียน" subtitle={teacher?.name}>
      <div className="ed-page-head">
        <h1 className="ed-page-title">เช็คชื่อนักเรียน</h1>
        <p className="ed-page-desc">
          เลือกห้องเรียนที่คุณสอนจากตารางด้านล่าง แล้วกดเข้าไปเพื่อดูรายชื่อนักเรียนและเริ่มเช็คชื่อ
        </p>
      </div>

      {loading ? (
        <div className="ed-loading">กำลังโหลดห้องเรียน...</div>
      ) : classes.length === 0 ? (
        <div className="ed-card">
          <div className="ed-empty">
            <span className="ed-empty-emoji">🏫</span>
            ยังไม่พบห้องเรียนที่คุณสอน — กรุณาจัดตารางสอนในเมนู &quot;ตารางสอน&quot; ก่อน
          </div>
        </div>
      ) : (
        <div className="ed-table-wrap">
          <table className="ed-table">
            <thead>
              <tr>
                <th>ห้องเรียน / ชั้นเรียน</th>
                <th>วิชาที่สอน</th>
                <th>ห้อง</th>
                <th>จำนวนนักเรียน</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr
                  key={c.group.id}
                  className="ed-clickable"
                  onClick={() => router.push(`/attendance/${c.group.id}`)}
                >
                  <td style={{ fontWeight: 700 }}>{c.group.name}</td>
                  <td className="ed-muted">
                    {c.courseNames.length ? c.courseNames.join(", ") : "—"}
                  </td>
                  <td className="ed-muted">
                    {c.classroomNames.length ? c.classroomNames.join(", ") : "—"}
                  </td>
                  <td className="ed-mono">{c.studentCount} คน</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="ed-btn ed-btn-primary ed-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/attendance/${c.group.id}`);
                      }}
                    >
                      เช็คชื่อ →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
