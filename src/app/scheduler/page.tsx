"use client";

import React, { useState, useEffect } from "react";
import "./scheduler.css";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Interface Definitions
interface Teacher {
  id: string;
  name: string;
  subject: string;
}

interface Classroom {
  id: string;
  name: string;
  type: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  defaultTeacherId: string;
  defaultClassroomId: string;
}

interface StudentGroup {
  id: string;
  name: string;
}

interface ScheduleSlot {
  id: string;
  courseId: string;
  teacherId: string;
  classroomId: string;
  studentGroupId: string;
  dayOfWeek: number; // 1 = Monday, ..., 5 = Friday
  period: number; // 1 to 8 (excluding lunch)
}

interface ConflictDetail {
  type: "teacher" | "room";
  message: string;
  conflictingSlotId: string;
}

// Local Mock Data (for fallback offline mode)
const MOCK_TEACHERS: Teacher[] = [
  { id: "t1", name: "ครูสมชาย รักเรียน", subject: "คณิตศาสตร์" },
  { id: "t2", name: "ครูสมศรี แสนดี", subject: "วิทยาศาสตร์" },
  { id: "t3", name: "ครูทิพย์วรรณ สอนดี", subject: "ภาษาอังกฤษ" },
  { id: "t4", name: "ครูรัชนี วรรณศิลป์", subject: "ภาษาไทย" },
  { id: "t5", name: "ครูวิชัย พงษ์เพชร", subject: "สังคมศึกษา" },
];

const MOCK_CLASSROOMS: Classroom[] = [
  { id: "r1", name: "ห้อง 101", type: "ห้องเรียนทั่วไป" },
  { id: "r2", name: "ห้อง 102", type: "ห้องเรียนทั่วไป" },
  { id: "r3", name: "ห้องวิทย์ Lab 1", type: "ห้องทดลองวิทยาศาสตร์" },
  { id: "r4", name: "ห้อง Sound Lab", type: "ห้องปฏิบัติการทางภาษา" },
  { id: "r5", name: "ห้องคอม 3", type: "ห้องคอมพิวเตอร์" },
];

const MOCK_COURSES: Course[] = [
  { id: "c1", name: "คณิตศาสตร์พื้นฐาน", code: "ค21101", color: "rgba(56, 189, 248, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r1" },
  { id: "c2", name: "วิทยาศาสตร์ทั่วไป", code: "ว21101", color: "rgba(192, 132, 252, 0.15)", defaultTeacherId: "t2", defaultClassroomId: "r3" },
  { id: "c3", name: "ภาษาอังกฤษพื้นฐาน", code: "อ21101", color: "rgba(52, 211, 153, 0.15)", defaultTeacherId: "t3", defaultClassroomId: "r4" },
  { id: "c4", name: "ภาษาไทยเบื้องต้น", code: "ท21101", color: "rgba(251, 146, 60, 0.15)", defaultTeacherId: "t4", defaultClassroomId: "r2" },
  { id: "c5", name: "สังคมศึกษาและการพัฒนา", code: "ส21101", color: "rgba(244, 63, 94, 0.15)", defaultTeacherId: "t5", defaultClassroomId: "r1" },
  { id: "c6", name: "เทคโนโลยีสารสนเทศ", code: "ว21103", color: "rgba(6, 182, 212, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r5" },
];

const MOCK_STUDENT_GROUPS: StudentGroup[] = [
  { id: "g1", name: "ชั้น ม.1/1 (Grade 7/1)" },
  { id: "g2", name: "ชั้น ม.1/2 (Grade 7/2)" },
  { id: "g3", name: "ชั้น ม.2/1 (Grade 8/1)" },
];

const INITIAL_SCHEDULES: ScheduleSlot[] = [
  { id: "s1", courseId: "c1", teacherId: "t1", classroomId: "r1", studentGroupId: "g1", dayOfWeek: 1, period: 1 },
  { id: "s2", courseId: "c2", teacherId: "t2", classroomId: "r3", studentGroupId: "g1", dayOfWeek: 1, period: 2 },
  { id: "s3", courseId: "c3", teacherId: "t3", classroomId: "r4", studentGroupId: "g1", dayOfWeek: 1, period: 4 },
  { id: "s4", courseId: "c6", teacherId: "t1", classroomId: "r5", studentGroupId: "g2", dayOfWeek: 1, period: 1 },
  { id: "s5", courseId: "c4", teacherId: "t4", classroomId: "r2", studentGroupId: "g2", dayOfWeek: 1, period: 2 },
  { id: "s6", courseId: "c3", teacherId: "t3", classroomId: "r4", studentGroupId: "g3", dayOfWeek: 1, period: 4 },
];

const DAYS = [
  { value: 1, name: "วันจันทร์", sub: "Monday", class: "mon" },
  { value: 2, name: "วันอังคาร", sub: "Tuesday", class: "tue" },
  { value: 3, name: "วันพุธ", sub: "Wednesday", class: "wed" },
  { value: 4, name: "วันพฤหัสบดี", sub: "Thursday", class: "thu" },
  { value: 5, name: "วันศุกร์", sub: "Friday", class: "fri" },
];

const PERIOD_TIMES = [
  { num: 1, label: "คาบที่ 1", time: "08:30 - 09:30" },
  { num: 2, label: "คาบที่ 2", time: "09:30 - 10:30" },
  { num: 3, label: "คาบที่ 3", time: "10:30 - 11:30" },
  { num: 0, label: "พักกลางวัน", time: "11:30 - 12:30" },
  { num: 4, label: "คาบที่ 4", time: "12:30 - 13:30" },
  { num: 5, label: "คาบที่ 5", time: "13:30 - 14:30" },
  { num: 6, label: "คาบที่ 6", time: "14:30 - 15:30" },
  { num: 7, label: "คาบที่ 7", time: "15:30 - 16:30" },
  { num: 8, label: "คาบที่ 8", time: "16:30 - 17:30" },
];

export default function SchedulerPage() {
  // Master lists in state (fallbacks to mocks if not connected)
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_CLASSROOMS);
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(MOCK_STUDENT_GROUPS);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(INITIAL_SCHEDULES);

  const [activeView, setActiveView] = useState<"group" | "teacher" | "room">("group");
  
  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>("g1");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("t1");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("r1");
  
  // Visual states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Drag and drop states
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; period: number } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    day: number;
    period: number;
    courseId: string;
    teacherId: string;
    classroomId: string;
    studentGroupId: string;
    slotIdToUpdate?: string;
  } | null>(null);

  // Toggle Theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("light-theme");
    } else {
      root.classList.add("light-theme");
    }
  }, [isDarkMode]);

  // Fetch initial data from Supabase
  const fetchInitialData = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const [tRes, cRes, coRes, gRes, sRes] = await Promise.all([
        supabase.from("teachers").select("*"),
        supabase.from("classrooms").select("*"),
        supabase.from("courses").select("*"),
        supabase.from("student_groups").select("*"),
        supabase.from("schedules").select("*"),
      ]);

      if (tRes.data && tRes.data.length > 0) setTeachers(tRes.data as Teacher[]);
      if (cRes.data && cRes.data.length > 0) setClassrooms(cRes.data as Classroom[]);
      
      if (coRes.data && coRes.data.length > 0) {
        const mappedCourses: Course[] = coRes.data.map((co: any) => ({
          id: co.id,
          code: co.code,
          name: co.name,
          color: co.color,
          defaultTeacherId: co.default_teacher_id,
          defaultClassroomId: co.default_classroom_id,
        }));
        setCourses(mappedCourses);
      }

      if (gRes.data && gRes.data.length > 0) {
        const mappedGroups: StudentGroup[] = gRes.data.map((g: any) => ({
          id: g.id,
          name: g.name,
        }));
        setStudentGroups(mappedGroups);
      }

      if (sRes.data) {
        const mappedSchedules: ScheduleSlot[] = sRes.data.map((s: any) => ({
          id: s.id,
          courseId: s.course_id,
          teacherId: s.teacher_id,
          classroomId: s.classroom_id,
          studentGroupId: s.student_group_id,
          dayOfWeek: s.day_of_week,
          period: s.period,
        }));
        setSchedules(mappedSchedules);
      }
    } catch (err) {
      console.error("Error fetching initial Supabase data:", err);
    }
  };

  // Supabase Real-time Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.log("Supabase is offline. Using local memory storage.");
      return;
    }

    console.log("Supabase is online. Loading data and subscribing to realtime...");
    fetchInitialData();

    // Map DB schema columns to camelCase JS state
    const mapSlot = (item: any): ScheduleSlot => ({
      id: item.id,
      courseId: item.course_id,
      teacherId: item.teacher_id,
      classroomId: item.classroom_id,
      studentGroupId: item.student_group_id,
      dayOfWeek: item.day_of_week,
      period: item.period,
    });

    // Realtime channel listener for postgres changes on schedules table
    const channel = supabase
      .channel("schedules-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        (payload: any) => {
          console.log("Real-time database payload received:", payload);
          if (payload.eventType === "INSERT") {
            setSchedules((prev) => {
              if (prev.some((s) => s.id === payload.new.id)) return prev;
              return [...prev, mapSlot(payload.new)];
            });
          } else if (payload.eventType === "UPDATE") {
            setSchedules((prev) =>
              prev.map((s) => (s.id === payload.new.id ? mapSlot(payload.new) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setSchedules((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Database Seeding Trigger (For fresh Supabase DB setup)
  const handleSeedDatabase = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    
    setIsSeeding(true);
    try {
      // 1. Seed Teachers
      await supabase.from("teachers").upsert(
        MOCK_TEACHERS.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
        }))
      );

      // 2. Seed Classrooms
      await supabase.from("classrooms").upsert(
        MOCK_CLASSROOMS.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
        }))
      );

      // 3. Seed Courses
      await supabase.from("courses").upsert(
        MOCK_COURSES.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          color: c.color,
          default_teacher_id: c.defaultTeacherId,
          default_classroom_id: c.defaultClassroomId,
        }))
      );

      // 4. Seed Student Groups
      await supabase.from("student_groups").upsert(
        MOCK_STUDENT_GROUPS.map((g) => ({
          id: g.id,
          name: g.name,
        }))
      );

      // 5. Seed Schedules
      await supabase.from("schedules").upsert(
        INITIAL_SCHEDULES.map((s) => ({
          id: s.id,
          course_id: s.courseId,
          teacher_id: s.teacherId,
          classroom_id: s.classroomId,
          student_group_id: s.studentGroupId,
          day_of_week: s.dayOfWeek,
          period: s.period,
        }))
      );
      
      alert("จัดส่งข้อมูลตั้งต้นครู วิชา และตารางสอนจำลองขึ้น Supabase Database สำเร็จแล้ว!");
      await fetchInitialData();
    } catch (err) {
      console.error("Seeding error:", err);
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (err as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Conflict Checking Engine
  const getConflictsForSlot = (slot: ScheduleSlot): ConflictDetail[] => {
    const conflicts: ConflictDetail[] = [];
    
    schedules.forEach((other) => {
      if (other.id === slot.id) return;
      
      if (other.dayOfWeek === slot.dayOfWeek && other.period === slot.period) {
        
        // 1. Teacher Conflict
        if (slot.teacherId && other.teacherId === slot.teacherId && other.studentGroupId !== slot.studentGroupId) {
          const teacher = teachers.find((t) => t.id === slot.teacherId);
          const otherGroup = studentGroups.find((g) => g.id === other.studentGroupId);
          conflicts.push({
            type: "teacher",
            message: `${teacher?.name || "ครูผู้สอน"} ติดสอนชนกับกลุ่ม ${otherGroup?.name || "กลุ่มอื่น"}`,
            conflictingSlotId: other.id,
          });
        }
        
        // 2. Classroom Conflict
        if (slot.classroomId && other.classroomId === slot.classroomId && other.studentGroupId !== slot.studentGroupId) {
          const room = classrooms.find((r) => r.id === slot.classroomId);
          const otherGroup = studentGroups.find((g) => g.id === other.studentGroupId);
          conflicts.push({
            type: "room",
            message: `${room?.name || "ห้องเรียน"} ถูกจองใช้ชนกับกลุ่ม ${otherGroup?.name || "กลุ่มอื่น"}`,
            conflictingSlotId: other.id,
          });
        }
      }
    });
    
    return conflicts;
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, courseId: string) => {
    setDraggedCourseId(courseId);
    setDraggedSlotId(null);
    e.dataTransfer.setData("text/plain", courseId);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleCardDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    setDraggedSlotId(slot.id);
    setDraggedCourseId(slot.courseId);
    e.dataTransfer.setData("text/plain", slot.courseId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedCourseId(null);
    setDraggedSlotId(null);
    setHoveredCell(null);
  };

  const handleDragOver = (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    if (period === 0) return;
    setHoveredCell({ day, period });
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    setHoveredCell(null);
    if (period === 0) return;

    const courseId = e.dataTransfer.getData("text/plain") || draggedCourseId;
    if (!courseId) return;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    let targetGroupId = selectedGroupId;
    let targetTeacherId = course.defaultTeacherId;
    let targetRoomId = course.defaultClassroomId;

    if (activeView === "teacher") {
      targetTeacherId = selectedTeacherId;
    } else if (activeView === "room") {
      targetRoomId = selectedRoomId;
    }

    setModalData({
      day,
      period,
      courseId,
      teacherId: targetTeacherId,
      classroomId: targetRoomId,
      studentGroupId: targetGroupId,
      slotIdToUpdate: draggedSlotId || undefined,
    });
    setIsModalOpen(true);
  };

  // Save / Update Schedule Slot (Handles both Supabase & Offline local states)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData) return;

    const { day, period, courseId, teacherId, classroomId, studentGroupId, slotIdToUpdate } = modalData;
    const finalSlotId = slotIdToUpdate || `s-${Date.now()}`;

    const newSlot: ScheduleSlot = {
      id: finalSlotId,
      courseId,
      teacherId,
      classroomId,
      studentGroupId,
      dayOfWeek: day,
      period,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("schedules").upsert({
          id: finalSlotId,
          course_id: courseId,
          teacher_id: teacherId,
          classroom_id: classroomId,
          student_group_id: studentGroupId,
          day_of_week: day,
          period: period,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Supabase save error:", err);
        alert("ไม่สามารถบันทึกไปยัง Supabase ได้: " + (err as Error).message);
      }
    } else {
      // Local State edit (Offline Mode)
      if (slotIdToUpdate) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === slotIdToUpdate ? newSlot : s))
        );
      } else {
        setSchedules((prev) => [...prev, newSlot]);
      }
    }

    setIsModalOpen(false);
    setModalData(null);
    setDraggedSlotId(null);
  };

  // Delete slot
  const handleDeleteSlot = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("คุณต้องการลบวิชาเรียนนี้ออกจากตารางใช่หรือไม่?")) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("schedules").delete().eq("id", slotId);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase delete error:", err);
        alert("ไม่สามารถลบข้อมูลจาก Supabase ได้: " + (err as Error).message);
      }
    } else {
      setSchedules((prev) => prev.filter((s) => s.id !== slotId));
    }
  };

  // Clear all schedules in view
  const handleClearAllSchedules = async () => {
    if (!confirm("คุณต้องการล้างข้อมูลตารางเรียนทั้งหมดใช่หรือไม่?")) return;

    if (isSupabaseConfigured && supabase) {
      try {
        // Delete all rows in schedules table
        const { error } = await supabase.from("schedules").delete().neq("id", "0");
        if (error) throw error;
        setSchedules([]);
      } catch (err) {
        console.error("Supabase clear error:", err);
        alert("ไม่สามารถล้างข้อมูลใน Supabase ได้: " + (err as Error).message);
      }
    } else {
      setSchedules([]);
    }
  };

  // Filter slots to display in current grid view
  const getFilteredSchedules = () => {
    if (activeView === "group") {
      return schedules.filter((s) => s.studentGroupId === selectedGroupId);
    } else if (activeView === "teacher") {
      return schedules.filter((s) => s.teacherId === selectedTeacherId);
    } else {
      return schedules.filter((s) => s.classroomId === selectedRoomId);
    }
  };

  const visibleSchedules = getFilteredSchedules();
  
  // Find all active conflicts in the entire system for sidebar display
  const allConflictsList = schedules
    .map((s) => {
      const confs = getConflictsForSlot(s);
      return { slot: s, conflicts: confs };
    })
    .filter((item) => item.conflicts.length > 0);

  return (
    <div className="scheduler-container">
      {/* Sidebar */}
      <aside className="scheduler-sidebar">
        <div className="logo-section">
          <div className="logo-icon">EF</div>
          <div className="logo-text">ed-flow Scheduler</div>
        </div>

        {/* View Specific Options */}
        <div className="sidebar-section">
          {activeView === "group" && (
            <>
              <label className="sidebar-title">เลือกกลุ่มนักเรียน (Classroom)</label>
              <select
                className="select-input"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {studentGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeView === "teacher" && (
            <>
              <label className="sidebar-title">เลือกครูผู้สอน (Teacher)</label>
              <select
                className="select-input"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subject})
                  </option>
                ))}
              </select>
              
              <label className="sidebar-title" style={{ marginTop: "0.5rem" }}>
                วางข้อมูลเข้าตารางสำหรับกลุ่มเรียน:
              </label>
              <select
                className="select-input"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {studentGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeView === "room" && (
            <>
              <label className="sidebar-title">เลือกห้องเรียน (Room)</label>
              <select
                className="select-input"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>

              <label className="sidebar-title" style={{ marginTop: "0.5rem" }}>
                วางข้อมูลเข้าตารางสำหรับกลุ่มเรียน:
              </label>
              <select
                className="select-input"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {studentGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Draggable Subjects */}
        <div className="sidebar-section" style={{ flexGrow: 1 }}>
          <label className="sidebar-title">วิชาเรียน (Drag to Timetable)</label>
          <div className="draggable-list">
            {courses.map((course) => (
              <div
                key={course.id}
                className="draggable-item"
                draggable
                onDragStart={(e) => handleDragStart(e, course.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="course-info">
                  <span className="course-name">{course.name}</span>
                  <span className="course-code">{course.code}</span>
                </div>
                <span className="course-drag-handle">☰</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Conflict Alerting Panel */}
        {allConflictsList.length > 0 && (
          <div className="conflict-list-section">
            <div className="conflict-list-title">
              ⚠️ การชนกันในระบบ ({allConflictsList.reduce((acc, curr) => acc + curr.conflicts.length, 0)})
            </div>
            {allConflictsList.map((item, idx) => {
              const course = courses.find((c) => c.id === item.slot.courseId);
              const group = studentGroups.find((g) => g.id === item.slot.studentGroupId);
              const dayObj = DAYS.find((d) => d.value === item.slot.dayOfWeek);
              
              return (
                <div key={idx} className="conflict-sidebar-item">
                  <span className="conflict-sidebar-item-desc">
                    {course?.name} ({group?.name})
                  </span>
                  <span className="conflict-sidebar-item-meta">
                    {dayObj?.name} คาบที่ {item.slot.period} -{" "}
                    {item.conflicts.map((c) => c.message).join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Main Board */}
      <main className="scheduler-main">
        {/* Supabase Connectivity Banner */}
        {isSupabaseConfigured ? (
          <div className="firebase-banner online">
            <span>🟢 เชื่อมต่อ Supabase Database เรียบร้อยแล้ว (เซฟข้อมูลลง PostgreSQL แบบ Real-time)</span>
            <button 
              className="firebase-banner-btn" 
              onClick={handleSeedDatabase}
              disabled={isSeeding}
            >
              {isSeeding ? "กำลังอัปโหลด..." : "⚡ อัปโหลดข้อมูลตั้งต้นจำลอง"}
            </button>
          </div>
        ) : (
          <div className="firebase-banner">
            <span>⚠️ โหมดออฟไลน์ (Local Mock Mode) - กรุณากรอกรหัส Supabase ในไฟล์ `.env.local` เพื่อเซฟข้อมูลขึ้น Cloud จริง</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>ข้อมูลตารางที่แก้อยู่ในเว็บจะหายไปเมื่อกด Refresh</span>
          </div>
        )}

        {/* Header */}
        <header className="scheduler-header">
          <div className="header-title-section">
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>จัดตารางเรียนตารางสอน</h1>
            <span className="header-subtitle">ลากวิชาทางซ้ายวางลงบนตารางเพื่อวางชั่วโมงสอน</span>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${activeView === "group" ? "active" : ""}`}
              onClick={() => setActiveView("group")}
            >
              มุมมองห้องเรียน
            </button>
            <button
              className={`view-btn ${activeView === "teacher" ? "active" : ""}`}
              onClick={() => setActiveView("teacher")}
            >
              มุมมองรายครู
            </button>
            <button
              className={`view-btn ${activeView === "room" ? "active" : ""}`}
              onClick={() => setActiveView("room")}
            >
              มุมมองรายห้อง
            </button>
          </div>

          <div className="action-controls">
            <button
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <button
              className="secondary-btn"
              onClick={handleClearAllSchedules}
            >
              ล้างตารางทั้งหมด
            </button>
            <button
              className="primary-btn"
              onClick={() => {
                alert("ข้อมูลจะถูกบันทึกโดยอัตโนมัติเมื่อจัดตารางเรียน");
              }}
              style={{ opacity: isSupabaseConfigured ? 0.7 : 1 }}
            >
              {isSupabaseConfigured ? "ระบบบันทึกอัตโนมัติ" : "บันทึกข้อมูล"}
            </button>
          </div>
        </header>

        {/* Timetable Grid Container */}
        <div className="scheduler-content">
          <div className="timetable-card">
            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {activeView === "group" && `ตารางเรียน: ${studentGroups.find(g => g.id === selectedGroupId)?.name}`}
                {activeView === "teacher" && `ตารางสอน: ${teachers.find(t => t.id === selectedTeacherId)?.name}`}
                {activeView === "room" && `ตารางใช้ห้อง: ${classrooms.find(r => r.id === selectedRoomId)?.name}`}
              </h2>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                คาบพักกลางวันถูกตรึงไว้เป็นคาบพิเศษ
              </span>
            </div>

            <div className="timetable-grid">
              {/* Header Row */}
              <div className="grid-header-cell day-label">
                <span>วัน / เวลา</span>
              </div>
              {PERIOD_TIMES.map((pt, idx) => (
                <div key={idx} className="grid-header-cell">
                  <span style={{ fontWeight: pt.num === 0 ? 800 : 700 }}>{pt.label}</span>
                  <span className="period-time">{pt.time}</span>
                </div>
              ))}

              {/* Day Rows */}
              {DAYS.map((day) => (
                <div key={day.value} className="day-row">
                  {/* Day Label Header */}
                  <div className={`day-header-cell ${day.class}`}>
                    <span>{day.name}</span>
                    <span className="day-sub">{day.sub}</span>
                  </div>

                  {/* Timetable periods */}
                  {PERIOD_TIMES.map((pt) => {
                    if (pt.num === 0) {
                      return (
                        <div key={`${day.value}-lunch`} className="grid-cell lunch-slot">
                          พักกลางวัน
                        </div>
                      );
                    }

                    const slot = visibleSchedules.find(
                      (s) => s.dayOfWeek === day.value && s.period === pt.num
                    );

                    const isHovered =
                      hoveredCell &&
                      hoveredCell.day === day.value &&
                      hoveredCell.period === pt.num;

                    let slotConflicts: ConflictDetail[] = [];
                    if (slot) {
                      slotConflicts = getConflictsForSlot(slot);
                    }

                    return (
                      <div
                        key={`${day.value}-${pt.num}`}
                        className={`grid-cell ${isHovered ? "drag-over" : ""}`}
                        onDragOver={(e) => handleDragOver(e, day.value, pt.num)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day.value, pt.num)}
                      >
                        {slot ? (
                          (() => {
                            const course = courses.find((c) => c.id === slot.courseId);
                            const teacher = teachers.find((t) => t.id === slot.teacherId);
                            const room = classrooms.find((r) => r.id === slot.classroomId);
                            const group = studentGroups.find((g) => g.id === slot.studentGroupId);
                            const hasConflict = slotConflicts.length > 0;

                            return (
                              <div
                                className={`scheduled-card ${hasConflict ? "has-conflict" : ""}`}
                                draggable
                                onDragStart={(e) => handleCardDragStart(e, slot)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="card-top">
                                  <span className="card-subject">
                                    {course?.name} ({course?.code})
                                  </span>
                                  <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
                                    {hasConflict && (
                                      <div className="warning-icon-wrapper" style={{ position: "relative" }}>
                                        <span className="warning-icon">⚠️</span>
                                        <div className="conflict-tooltip">
                                          <div className="conflict-tooltip-title">
                                            <span>⚠️ การชนกันของตาราง</span>
                                          </div>
                                          {slotConflicts.map((c, i) => (
                                            <div key={i} style={{ marginBottom: "0.2rem" }}>
                                              • {c.message}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <button
                                      className="card-delete"
                                      onClick={(e) => handleDeleteSlot(slot.id, e)}
                                      title="ลบวิชานี้"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <div className="card-details">
                                  {activeView !== "teacher" && (
                                    <span className="detail-badge teacher">
                                      👤 {teacher?.name || "ไม่ระบุครู"}
                                    </span>
                                  )}
                                  {activeView !== "room" && (
                                    <span className="detail-badge room">
                                      🏫 {room?.name || "ไม่ระบุห้อง"}
                                    </span>
                                  )}
                                  {activeView !== "group" && (
                                    <span className="detail-badge group">
                                      👥 {group?.name || "ไม่ระบุชั้น"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Assignment Modal */}
      {isModalOpen && modalData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalData.slotIdToUpdate ? "ย้าย / ปรับตารางสอน" : "กำหนดชั่วโมงสอน"}
              </h3>
              <p className="modal-subtitle">
                {DAYS.find((d) => d.value === modalData.day)?.name} คาบที่ {modalData.period} ({
                  PERIOD_TIMES.find((pt) => pt.num === modalData.period)?.time
                } น.)
              </p>
            </div>

            <form className="modal-form" onSubmit={handleSaveAssignment}>
              <div className="form-group">
                <label className="form-label">วิชาเรียน</label>
                <input
                  type="text"
                  className="select-input"
                  value={`${courses.find((c) => c.id === modalData.courseId)?.name} (${
                    courses.find((c) => c.id === modalData.courseId)?.code
                  })`}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>

              {activeView !== "group" && (
                <div className="form-group">
                  <label className="form-label">กลุ่มนักเรียน (ชั้นเรียน)</label>
                  <select
                    className="select-input"
                    value={modalData.studentGroupId}
                    onChange={(e) =>
                      setModalData({ ...modalData, studentGroupId: e.target.value })
                    }
                    required
                  >
                    {studentGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">ครูผู้สอน</label>
                <select
                  className="select-input"
                  value={modalData.teacherId}
                  onChange={(e) => setModalData({ ...modalData, teacherId: e.target.value })}
                  required
                >
                  <option value="">-- เลือกครูผู้สอน --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ห้องเรียน</label>
                <select
                  className="select-input"
                  value={modalData.classroomId}
                  onChange={(e) => setModalData({ ...modalData, classroomId: e.target.value })}
                  required
                >
                  <option value="">-- เลือกห้องเรียน --</option>
                  {classrooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalData(null);
                    setDraggedSlotId(null);
                  }}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="primary-btn">
                  ตกลง / บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
