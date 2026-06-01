"use client";

import React, { useState, useEffect } from "react";
import "./scheduler.css";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
  period: number; // 1 to 8
}

interface ConflictDetail {
  type: "teacher" | "room";
  message: string;
  conflictingSlotId: string;
}

// Local Mock Data (fallbacks)
const INITIAL_TEACHERS: Teacher[] = [
  { id: "t1", name: "ครูสมชาย รักเรียน", subject: "คณิตศาสตร์" },
  { id: "t2", name: "ครูสมศรี แสนดี", subject: "วิทยาศาสตร์" },
  { id: "t3", name: "ครูทิพย์วรรณ สอนดี", subject: "ภาษาอังกฤษ" },
  { id: "t4", name: "ครูรัชนี วรรณศิลป์", subject: "ภาษาไทย" },
  { id: "t5", name: "ครูวิชัย พงษ์เพชร", subject: "สังคมศึกษา" },
];

const INITIAL_CLASSROOMS: Classroom[] = [
  { id: "r1", name: "ห้อง 101", type: "ห้องเรียนทั่วไป" },
  { id: "r2", name: "ห้อง 102", type: "ห้องเรียนทั่วไป" },
  { id: "r3", name: "ห้องวิทย์ Lab 1", type: "ห้องทดลองวิทยาศาสตร์" },
  { id: "r4", name: "ห้อง Sound Lab", type: "ห้องปฏิบัติการทางภาษา" },
  { id: "r5", name: "ห้องคอม 3", type: "ห้องคอมพิวเตอร์" },
];

const INITIAL_COURSES: Course[] = [
  { id: "c1", name: "คณิตศาสตร์พื้นฐาน", code: "ค21101", color: "rgba(56, 189, 248, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r1" },
  { id: "c2", name: "วิทยาศาสตร์ทั่วไป", code: "ว21101", color: "rgba(192, 132, 252, 0.15)", defaultTeacherId: "t2", defaultClassroomId: "r3" },
  { id: "c3", name: "ภาษาอังกฤษพื้นฐาน", code: "อ21101", color: "rgba(52, 211, 153, 0.15)", defaultTeacherId: "t3", defaultClassroomId: "r4" },
  { id: "c4", name: "ภาษาไทยเบื้องต้น", code: "ท21101", color: "rgba(251, 146, 60, 0.15)", defaultTeacherId: "t4", defaultClassroomId: "r2" },
  { id: "c5", name: "สังคมศึกษาและการพัฒนา", code: "ส21101", color: "rgba(244, 63, 94, 0.15)", defaultTeacherId: "t5", defaultClassroomId: "r1" },
  { id: "c6", name: "เทคโนโลยีสารสนเทศ", code: "ว21103", color: "rgba(6, 182, 212, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r5" },
];

const INITIAL_STUDENT_GROUPS: StudentGroup[] = [
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
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Teacher Onboarding State
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingSubject, setOnboardingSubject] = useState("คณิตศาสตร์");
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  // Course filter state
  const [showMyCoursesOnly, setShowMyCoursesOnly] = useState<boolean>(false);

  // Master lists
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [classrooms, setClassrooms] = useState<Classroom[]>(INITIAL_CLASSROOMS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(INITIAL_STUDENT_GROUPS);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(INITIAL_SCHEDULES);

  const [activeView, setActiveView] = useState<"group" | "teacher" | "room">("group");
  const [isSettingsMode, setIsSettingsMode] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"teachers" | "courses" | "rooms" | "groups">("teachers");
  
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

  // School Settings CRUD inputs
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("ห้องเรียนทั่วไป");

  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseColor, setCourseColor] = useState("rgba(56, 189, 248, 0.15)");
  const [courseTeacherId, setCourseTeacherId] = useState("");
  const [courseRoomId, setCourseRoomId] = useState("");

  const [groupName, setGroupName] = useState("");

  // Check authentication & onboarding status
  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (!isSupabaseConfigured || !supabase) {
        // Simulating a mock local user
        const mockUser = { id: "mock-admin-id", email: "offline-admin@school.ac.th", user_metadata: { full_name: "ครูแอดมินระบบจำลอง" } };
        setCurrentUser(mockUser);
        
        // Check offline onboarding
        const savedProfile = localStorage.getItem("onboarded_teacher");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          // Add onboarded teacher to lists if not exists
          setTeachers((prev) => {
            if (prev.some((t) => t.id === parsed.id)) return prev;
            return [...prev, parsed];
          });
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
        }
        setAuthLoading(false);
        return;
      }

      // Check real Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // Check if this user exists in the teachers table
      try {
        const { data: teacher, error } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error || !teacher) {
          // Profile doesn't exist, trigger onboarding
          setIsOnboarded(false);
        } else {
          setIsOnboarded(true);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setIsOnboarded(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthAndProfile();
  }, [router]);

  // Fetch initial data from Supabase
  const fetchInitialData = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const [tRes, cRes, coRes, gRes, sRes] = await Promise.all([
        supabase.from("teachers").select("*").order("name"),
        supabase.from("classrooms").select("*").order("name"),
        supabase.from("courses").select("*").order("name"),
        supabase.from("student_groups").select("*").order("name"),
        supabase.from("schedules").select("*"),
      ]);

      if (tRes.data && tRes.data.length > 0) setTeachers(tRes.data as Teacher[]);
      if (cRes.data && cRes.data.length > 0) setClassrooms(cRes.data as Classroom[]);
      
      if (coRes.data && coRes.data.length > 0) {
        setCourses(coRes.data.map((co: any) => ({
          id: co.id,
          code: co.code,
          name: co.name,
          color: co.color,
          defaultTeacherId: co.default_teacher_id,
          defaultClassroomId: co.default_classroom_id,
        })));
      }

      if (gRes.data && gRes.data.length > 0) {
        setStudentGroups(gRes.data.map((g: any) => ({
          id: g.id,
          name: g.name,
        })));
      }

      if (sRes.data) {
        setSchedules(sRes.data.map((s: any) => ({
          id: s.id,
          courseId: s.course_id,
          teacherId: s.teacher_id,
          classroomId: s.classroom_id,
          studentGroupId: s.student_group_id,
          dayOfWeek: s.day_of_week,
          period: s.period,
        })));
      }
    } catch (err) {
      console.error("Error fetching initial Supabase data:", err);
    }
  };

  // Supabase Real-time Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    fetchInitialData();

    const mapSlot = (item: any): ScheduleSlot => ({
      id: item.id,
      courseId: item.course_id,
      teacherId: item.teacher_id,
      classroomId: item.classroom_id,
      studentGroupId: item.student_group_id,
      dayOfWeek: item.day_of_week,
      period: item.period,
    });

    // Subscriptions
    const schedulesChannel = supabase
      .channel("schedules-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setSchedules((prev) => prev.some((s) => s.id === payload.new.id) ? prev : [...prev, mapSlot(payload.new)]);
        } else if (payload.eventType === "UPDATE") {
          setSchedules((prev) => prev.map((s) => (s.id === payload.new.id ? mapSlot(payload.new) : s)));
        } else if (payload.eventType === "DELETE") {
          setSchedules((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const teachersChannel = supabase
      .channel("teachers-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, () => fetchInitialData())
      .subscribe();

    const classroomsChannel = supabase
      .channel("classrooms-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "classrooms" }, () => fetchInitialData())
      .subscribe();

    const coursesChannel = supabase
      .channel("courses-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => fetchInitialData())
      .subscribe();

    const groupsChannel = supabase
      .channel("groups-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_groups" }, () => fetchInitialData())
      .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
      supabase.removeChannel(teachersChannel);
      supabase.removeChannel(classroomsChannel);
      supabase.removeChannel(coursesChannel);
      supabase.removeChannel(groupsChannel);
    };
  }, []);

  // Seeding Initial Data
  const handleSeedDatabase = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    
    setIsSeeding(true);
    try {
      await supabase.from("teachers").upsert(
        INITIAL_TEACHERS.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))
      );
      await supabase.from("classrooms").upsert(
        INITIAL_CLASSROOMS.map((r) => ({ id: r.id, name: r.name, type: r.type }))
      );
      await supabase.from("courses").upsert(
        INITIAL_COURSES.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          color: c.color,
          default_teacher_id: c.defaultTeacherId,
          default_classroom_id: c.defaultClassroomId,
        }))
      );
      await supabase.from("student_groups").upsert(
        INITIAL_STUDENT_GROUPS.map((g) => ({ id: g.id, name: g.name }))
      );
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
      
      alert("นำเข้าข้อมูลวิชาและครูตั้งต้นขึ้นสู่ Supabase สำเร็จแล้ว!");
      await fetchInitialData();
    } catch (err: any) {
      console.error("Seeding error:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Onboarding Submit
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName || !onboardingSubject) return;

    setSavingOnboarding(true);
    const teacherId = currentUser?.id || "mock-admin-id";
    const newTeacher: Teacher = {
      id: teacherId,
      name: onboardingName,
      subject: onboardingSubject
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("teachers").upsert([
          {
            id: teacherId,
            name: onboardingName,
            subject: onboardingSubject
          }
        ]);
        if (error) throw error;
      } else {
        // Offline Mock mode Onboarding
        localStorage.setItem("onboarded_teacher", JSON.stringify(newTeacher));
      }

      setTeachers((prev) => {
        if (prev.some((t) => t.id === teacherId)) {
          return prev.map((t) => (t.id === teacherId ? newTeacher : t));
        }
        return [...prev, newTeacher];
      });

      setIsOnboarded(true);
      if (isSupabaseConfigured && supabase) {
        await fetchInitialData();
      }
      alert("บันทึกข้อมูลครูและปลดล็อกระบบเรียบร้อย!");
    } catch (err: any) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลครู: " + err.message);
    } finally {
      setSavingOnboarding(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (confirm("ต้องการออกจากระบบเข้าสู่หน้าหลัก?")) {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem("onboarded_teacher");
      router.push("/login");
    }
  };

  // Timetable Print Command
  const handlePrint = () => {
    window.print();
  };

  // Settings CRUD - Add Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherSubject) return;

    const newId = `t-${Date.now()}`;
    const newT = { id: newId, name: teacherName, subject: teacherSubject };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("teachers").insert([newT]);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setTeachers((prev) => [...prev, newT]);
    }
    setTeacherName("");
    setTeacherSubject("");
  };

  // Settings CRUD - Delete Teacher
  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("ลบคุณครูรายนี้จากระบบ? (วิชาและตารางสอนที่ผูกจะหลุดออก)")) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setSchedules((prev) => prev.filter((s) => s.teacherId !== id));
    }
  };

  // Settings CRUD - Add Classroom
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName) return;

    const newId = `r-${Date.now()}`;
    const newR = { id: newId, name: roomName, type: roomType };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("classrooms").insert([newR]);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setClassrooms((prev) => [...prev, newR]);
    }
    setRoomName("");
  };

  // Settings CRUD - Delete Classroom
  const handleDeleteClassroom = async (id: string) => {
    if (!confirm("ลบห้องเรียนนี้ออกจากระบบ?")) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("classrooms").delete().eq("id", id);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setClassrooms((prev) => prev.filter((r) => r.id !== id));
      setSchedules((prev) => prev.filter((s) => s.classroomId !== id));
    }
  };

  // Settings CRUD - Add Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName) return;

    const newId = `c-${Date.now()}`;
    const newC = {
      id: newId,
      code: courseCode,
      name: courseName,
      color: courseColor,
      defaultTeacherId: courseTeacherId,
      defaultClassroomId: courseRoomId,
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("courses").insert([{
        id: newId,
        code: courseCode,
        name: courseName,
        color: courseColor,
        default_teacher_id: courseTeacherId || null,
        default_classroom_id: courseRoomId || null,
      }]);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setCourses((prev) => [...prev, newC]);
    }
    setCourseCode("");
    setCourseName("");
    setCourseTeacherId("");
    setCourseRoomId("");
  };

  // Settings CRUD - Delete Course
  const handleDeleteCourse = async (id: string) => {
    if (!confirm("ต้องการลบวิชานี้ออกจากระบบ?")) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSchedules((prev) => prev.filter((s) => s.courseId !== id));
    }
  };

  // Settings CRUD - Add Student Group
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) return;

    const newId = `g-${Date.now()}`;
    const newG = { id: newId, name: groupName };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("student_groups").insert([newG]);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setStudentGroups((prev) => [...prev, newG]);
    }
    setGroupName("");
  };

  // Settings CRUD - Delete Group
  const handleDeleteGroup = async (id: string) => {
    if (!confirm("ต้องการลบชั้นเรียนนี้ออกจากระบบ? (ตารางของชั้นเรียนทั้งหมดจะถูกลบด้วย)")) return;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("student_groups").delete().eq("id", id);
      if (error) alert("ล้มเหลว: " + error.message);
    } else {
      setStudentGroups((prev) => prev.filter((g) => g.id !== id));
      setSchedules((prev) => prev.filter((s) => s.studentGroupId !== id));
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

  // Drag and Drop handlers
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

  // Save Assignment
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
      } catch (err: any) {
        alert("ไม่สามารถบันทึกได้: " + err.message);
      }
    } else {
      if (slotIdToUpdate) {
        setSchedules((prev) => prev.map((s) => (s.id === slotIdToUpdate ? newSlot : s)));
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
      } catch (err: any) {
        alert("ล้มเหลว: " + err.message);
      }
    } else {
      setSchedules((prev) => prev.filter((s) => s.id !== slotId));
    }
  };

  // Clear all
  const handleClearAllSchedules = async () => {
    if (!confirm("คุณต้องการล้างข้อมูลตารางเรียนทั้งหมดใช่หรือไม่?")) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("schedules").delete().neq("id", "0");
        if (error) throw error;
        setSchedules([]);
      } catch (err: any) {
        alert("ล้มเหลว: " + err.message);
      }
    } else {
      setSchedules([]);
    }
  };

  // Filter active schedules
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
  
  // Filter draggable courses based on "Show only my courses"
  const getFilteredCourses = () => {
    if (showMyCoursesOnly && currentUser) {
      const myId = currentUser.id || "mock-admin-id";
      return courses.filter((c) => c.defaultTeacherId === myId);
    }
    return courses;
  };

  const visibleCourses = getFilteredCourses();

  // Active conflicts list
  const allConflictsList = schedules
    .map((s) => ({ slot: s, conflicts: getConflictsForSlot(s) }))
    .filter((item) => item.conflicts.length > 0);

  // Authentication Loading screen
  if (authLoading) {
    return (
      <div className="scheduler-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="logo-icon" style={{ margin: "0 auto 1.5rem", width: "64px", height: "64px", fontSize: "1.75rem", animation: "pulseHazard 2s infinite" }}>EF</div>
          <h2>กำลังยืนยันสิทธิ์เข้าใช้ระบบวิชาการ...</h2>
        </div>
      </div>
    );
  }

  // ONBOARDING SCREEN INTERFACE
  if (!isOnboarded) {
    return (
      <div className="scheduler-container" style={{ justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="modal-content" style={{ width: "100%", maxWidth: "440px", padding: "2.5rem", borderRadius: "20px" }}>
          <div className="modal-header" style={{ textAlign: "center" }}>
            <div className="logo-icon" style={{ margin: "0 auto 1rem", width: "48px", height: "48px", fontSize: "1.5rem" }}>EF</div>
            <h2 className="modal-title" style={{ fontSize: "1.5rem" }}>
              ตั้งค่าคุณครูแรกเข้า
            </h2>
            <p className="modal-subtitle">
              ระบุประวัติบุคลากรของคุณก่อนเข้าจัดการระบบวิชาการ
            </p>
          </div>

          <form className="modal-form" onSubmit={handleOnboardingSubmit}>
            <div className="form-group">
              <label className="form-label">ชื่อ - นามสกุลจริงของคุณครู</label>
              <input
                type="text"
                className="select-input"
                placeholder="เช่น ครูสมพงษ์ ใจเย็น"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">วิชาเอกที่รับผิดชอบหลัก</label>
              <select
                className="select-input"
                value={onboardingSubject}
                onChange={(e) => setOnboardingSubject(e.target.value)}
                required
              >
                <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                <option value="วิทยาศาสตร์">วิทยาศาสตร์</option>
                <option value="ภาษาอังกฤษ">ภาษาอังกฤษ</option>
                <option value="ภาษาไทย">ภาษาไทย</option>
                <option value="สังคมศึกษา">สังคมศึกษา</option>
                <option value="คอมพิวเตอร์/เทคโนโลยี">คอมพิวเตอร์/เทคโนโลยี</option>
                <option value="แนะแนว/กิจกรรม">แนะแนว/กิจกรรม</option>
              </select>
            </div>

            <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              ℹ️ <strong>รายละเอียดสิทธิ์</strong><br />
              ชื่อและวิชาของคุณจะถูกบันทึกเข้ารายชื่อครูหลักของโรงเรียน เพื่อใช้สำหรับการผูกรายวิชาเรียนและแสดงผลตารางสอนส่วนบุคคล
            </div>

            <button 
              type="submit" 
              className="primary-btn" 
              style={{ width: "100%", marginTop: "1.5rem", padding: "0.8rem" }} 
              disabled={savingOnboarding}
            >
              {savingOnboarding ? "กำลังบันทึกข้อมูล..." : "✓ บันทึกข้อมูลและเริ่มใช้งาน"}
            </button>
            
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={handleSignOut}
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.8rem", border: "none", color: "var(--accent-red)" }}
            >
              ยกเลิก / ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="scheduler-container">
      {/* Sidebar */}
      <aside className="scheduler-sidebar">
        <div className="logo-section">
          <div className="logo-icon">EF</div>
          <div className="logo-text">ed-flow Scheduler</div>
        </div>

        {/* View Controls & Settings Navigation */}
        {!isSettingsMode ? (
          <>
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
                      <option key={g.id} value={g.id}>{g.name}</option>
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
                      <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                    ))}
                  </select>
                  
                  <label className="sidebar-title" style={{ marginTop: "0.5rem" }}>
                    จัดตารางให้กลุ่มเรียน:
                  </label>
                  <select
                    className="select-input"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {studentGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
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
                      <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                    ))}
                  </select>

                  <label className="sidebar-title" style={{ marginTop: "0.5rem" }}>
                    จัดตารางให้กลุ่มเรียน:
                  </label>
                  <select
                    className="select-input"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {studentGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Draggable Subjects */}
            <div className="sidebar-section" style={{ flexGrow: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="sidebar-title">วิชาเรียน (Drag to Timetable)</label>
              </div>
              
              {/* Filter checkbox: Show only my subjects */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0.2rem 0 0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  id="myCoursesFilter"
                  checked={showMyCoursesOnly}
                  onChange={(e) => setShowMyCoursesOnly(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="myCoursesFilter" style={{ cursor: "pointer", fontWeight: "bold" }}>
                  แสดงเฉพาะวิชาที่ฉันสอน 🧑‍🏫
                </label>
              </div>

              <div className="draggable-list">
                {visibleCourses.length > 0 ? (
                  visibleCourses.map((course) => (
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
                  ))
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "1rem", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                    ไม่มีวิชาที่ระบุตัวคุณครูท่านนี้เป็นผู้สอนหลัก
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Workload Statistics tracker */}
            <div className="sidebar-section">
              <label className="sidebar-title">ภาระชั่วโมงสอนครู (สัปดาห์นี้)</label>
              <div className="workload-tracker">
                {teachers.slice(0, 4).map((t) => {
                  const assignedCount = schedules.filter((s) => s.teacherId === t.id).length;
                  const targetLoad = 12; // Standard workload goal
                  const pct = Math.min((assignedCount / targetLoad) * 100, 100);
                  
                  let stateClass = "normal";
                  if (assignedCount >= targetLoad) stateClass = "danger";
                  else if (assignedCount >= targetLoad - 3) stateClass = "warning";

                  return (
                    <div className="workload-item" key={t.id}>
                      <div className="workload-header-info">
                        <span className="workload-name">{t.name.split(" ")[0]}</span>
                        <span className="workload-count">{assignedCount} / {targetLoad} คาบ</span>
                      </div>
                      <div className="workload-bar-bg">
                        <div 
                          className={`workload-bar-fill ${stateClass}`} 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Sidebar Settings Navigation Toggles */
          <div className="sidebar-section" style={{ flexGrow: 1 }}>
            <label className="sidebar-title">จัดการข้อมูลโรงเรียน</label>
            <div className="draggable-list" style={{ marginTop: "0.5rem" }}>
              <button 
                className={`view-btn ${activeSettingsTab === "teachers" ? "active" : ""}`} 
                onClick={() => setActiveSettingsTab("teachers")}
                style={{ width: "100%", justifyContent: "flex-start", display: "flex", padding: "0.75rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: activeSettingsTab === "teachers" ? "var(--accent-color)" : "var(--bg-card)", color: activeSettingsTab === "teachers" ? "#fff" : "var(--text-primary)" }}
              >
                👤 จัดการคุณครู ({teachers.length})
              </button>
              <button 
                className={`view-btn ${activeSettingsTab === "courses" ? "active" : ""}`} 
                onClick={() => setActiveSettingsTab("courses")}
                style={{ width: "100%", justifyContent: "flex-start", display: "flex", padding: "0.75rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: activeSettingsTab === "courses" ? "var(--accent-color)" : "var(--bg-card)", color: activeSettingsTab === "courses" ? "#fff" : "var(--text-primary)" }}
              >
                📚 จัดการวิชาเรียน ({courses.length})
              </button>
              <button 
                className={`view-btn ${activeSettingsTab === "rooms" ? "active" : ""}`} 
                onClick={() => setActiveSettingsTab("rooms")}
                style={{ width: "100%", justifyContent: "flex-start", display: "flex", padding: "0.75rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: activeSettingsTab === "rooms" ? "var(--accent-color)" : "var(--bg-card)", color: activeSettingsTab === "rooms" ? "#fff" : "var(--text-primary)" }}
              >
                🏫 จัดการห้องเรียน ({classrooms.length})
              </button>
              <button 
                className={`view-btn ${activeSettingsTab === "groups" ? "active" : ""}`} 
                onClick={() => setActiveSettingsTab("groups")}
                style={{ width: "100%", justifyContent: "flex-start", display: "flex", padding: "0.75rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: activeSettingsTab === "groups" ? "var(--accent-color)" : "var(--bg-card)", color: activeSettingsTab === "groups" ? "#fff" : "var(--text-primary)" }}
              >
                👥 จัดการชั้นเรียน/ห้อง ({studentGroups.length})
              </button>
            </div>
            
            <button 
              className="secondary-btn" 
              onClick={() => setIsSettingsMode(false)}
              style={{ marginTop: "auto", display: "block", textAlign: "center" }}
            >
              ← กลับไปจัดตารางเรียน
            </button>
          </div>
        )}

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
                  <span className="conflict-sidebar-item-desc">{course?.name} ({group?.name})</span>
                  <span className="conflict-sidebar-item-meta">
                    {dayObj?.name} คาบที่ {item.slot.period} - {item.conflicts.map((c) => c.message).join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* Main Board */}
      <main className="scheduler-main">
        {/* Supabase Connection Status Bar */}
        {isSupabaseConfigured ? (
          <div className="firebase-banner online">
            <span>🟢 เชื่อมต่อระบบคลาวด์ Supabase (คุณครู: {teachers.find(t => t.id === currentUser?.id)?.name || currentUser?.email})</span>
            <button 
              className="firebase-banner-btn" 
              onClick={handleSeedDatabase}
              disabled={isSeeding}
            >
              {isSeeding ? "กำลังส่งเข้าฐานข้อมูล..." : "⚡ อัปโหลดข้อมูลจำลองเข้าคลาวด์"}
            </button>
          </div>
        ) : (
          <div className="firebase-banner">
            <span>⚠️ โหมดออฟไลน์ (Local Mock Mode) - กรุณาเชื่อมคีย์ `.env.local` เพื่อเขียนฐานข้อมูลจริง</span>
          </div>
        )}

        {/* Header */}
        <header className="scheduler-header">
          <div className="header-title-section">
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {isSettingsMode ? "ตั้งค่าข้อมูลวิชาการโรงเรียน" : "จัดตารางเรียนตารางสอน"}
            </h1>
            <span className="header-subtitle">
              {isSettingsMode ? "เพิ่ม ลบ หรือแก้ไขข้อมูลคุณครู วิชาเรียน และสถานที่สำหรับจัดระบบตารางเรียน" : "ลากวิชาทางซ้ายวางลงบนตารางเพื่อจัดชั่วโมงสอนวิชาการ"}
            </span>
          </div>

          <div className="action-controls">
            <button
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            {!isSettingsMode ? (
              <>
                <button className="secondary-btn" onClick={handlePrint} title="พิมพ์ตารางกระดาษ">
                  🖨️ พิมพ์ตาราง
                </button>
                <button 
                  className="secondary-btn" 
                  onClick={() => setIsSettingsMode(true)}
                  title="ตั้งค่าคุณครู วิชา ห้องเรียน"
                >
                  ⚙️ ตั้งค่าระบบวิชาการ
                </button>
                <button className="secondary-btn" onClick={handleClearAllSchedules}>
                  ล้างตารางทั้งหมด
                </button>
              </>
            ) : (
              <button className="primary-btn" onClick={() => setIsSettingsMode(false)}>
                ✓ เสร็จสิ้นการตั้งค่า
              </button>
            )}

            <button className="secondary-btn" onClick={handleSignOut} style={{ borderColor: "rgba(244, 63, 94, 0.4)", color: "#fca5a5" }}>
              ออกจากระบบ 🚪
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="scheduler-content">
          {!isSettingsMode ? (
            /* TIMETABLE VIEW */
            <div className="timetable-card">
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  {activeView === "group" && `ตารางเรียน: ${studentGroups.find(g => g.id === selectedGroupId)?.name || "ชั้นเรียน"}`}
                  {activeView === "teacher" && `ตารางสอน: ${teachers.find(t => t.id === selectedTeacherId)?.name || "ตารางสอนครู"}`}
                  {activeView === "room" && `ตารางใช้ห้อง: ${classrooms.find(r => r.id === selectedRoomId)?.name || "ตารางห้องเรียน"}`}
                </h2>
                
                {/* Visual View Filters inside grid */}
                <div className="view-controls">
                  <button className={`view-btn ${activeView === "group" ? "active" : ""}`} onClick={() => setActiveView("group")}>ตารางห้องเรียน</button>
                  <button className={`view-btn ${activeView === "teacher" ? "active" : ""}`} onClick={() => setActiveView("teacher")}>ตารางรายครู</button>
                  <button className={`view-btn ${activeView === "room" ? "active" : ""}`} onClick={() => setActiveView("room")}>ตารางรายห้อง</button>
                </div>
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

                      const isHovered = hoveredCell && hoveredCell.day === day.value && hoveredCell.period === pt.num;

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
                                    <span className="card-subject">{course?.name} ({course?.code})</span>
                                    <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
                                      {hasConflict && (
                                        <div className="warning-icon-wrapper" style={{ position: "relative" }}>
                                          <span className="warning-icon">⚠️</span>
                                          <div className="conflict-tooltip">
                                            <div className="conflict-tooltip-title">
                                              <span>⚠️ การชนกันของตาราง</span>
                                            </div>
                                            {slotConflicts.map((c, i) => (
                                              <div key={i} style={{ marginBottom: "0.2rem" }}>• {c.message}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <button className="card-delete" onClick={(e) => handleDeleteSlot(slot.id, e)} title="ลบวิชานี้">✕</button>
                                    </div>
                                  </div>

                                  <div className="card-details">
                                    {activeView !== "teacher" && <span className="detail-badge teacher">👤 {teacher?.name || "ไม่ระบุครู"}</span>}
                                    {activeView !== "room" && <span className="detail-badge room">🏫 {room?.name || "ไม่ระบุห้อง"}</span>}
                                    {activeView !== "group" && <span className="detail-badge group">👥 {group?.name || "ไม่ระบุชั้น"}</span>}
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
          ) : (
            /* CONFIGURATION SETTINGS PANEL */
            <div className="timetable-card settings-section-container">
              {/* TAB 1: TEACHER MANAGEMENT */}
              {activeSettingsTab === "teachers" && (
                <div className="settings-grid">
                  <form className="settings-card" onSubmit={handleAddTeacher}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>➕ เพิ่มข้อมูลครูผู้สอน</h3>
                    <div className="form-group">
                      <label className="form-label">ชื่อ - นามสกุลครู</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ครูวิภา วิริยะ"
                        value={teacherName} 
                        onChange={(e) => setTeacherName(e.target.value)} 
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">สาขาวิชาที่สอน</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ฟิสิกส์, เคมี, แนะแนว"
                        value={teacherSubject} 
                        onChange={(e) => setTeacherSubject(e.target.value)} 
                        required
                      />
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: "0.75rem" }}>บันทึกคุณครู</button>
                  </form>

                  <div className="settings-card" style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>👥 บุคลากรทั้งหมดในระบบ ({teachers.length} คน)</h3>
                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>ชื่อคุณครู</th>
                            <th>วิชาการที่สอน</th>
                            <th style={{ width: "80px", textAlign: "center" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((t) => (
                            <tr key={t.id}>
                              <td><strong>{t.name}</strong></td>
                              <td><span style={{ background: "rgba(255,255,255,0.05)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>{t.subject}</span></td>
                              <td style={{ textAlign: "center" }}>
                                <button className="icon-btn delete" onClick={() => handleDeleteTeacher(t.id)} title="ลบครู">🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COURSE MANAGEMENT */}
              {activeSettingsTab === "courses" && (
                <div className="settings-grid">
                  <form className="settings-card" onSubmit={handleAddCourse}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>➕ เพิ่มวิชาเรียนใหม่</h3>
                    <div className="form-group">
                      <label className="form-label">รหัสวิชา</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ว32201"
                        value={courseCode} 
                        onChange={(e) => setCourseCode(e.target.value)} 
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ชื่อวิชาเรียน</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ฟิสิกส์พื้นฐาน"
                        value={courseName} 
                        onChange={(e) => setCourseName(e.target.value)} 
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ครูผู้สอนเริ่มต้น (Default)</label>
                      <select 
                        className="select-input" 
                        value={courseTeacherId} 
                        onChange={(e) => setCourseTeacherId(e.target.value)}
                      >
                        <option value="">-- เลือกครูผู้สอนเริ่มต้น --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ห้องเรียนเริ่มต้น (Default)</label>
                      <select 
                        className="select-input" 
                        value={courseRoomId} 
                        onChange={(e) => setCourseRoomId(e.target.value)}
                      >
                        <option value="">-- เลือกห้องเรียนเริ่มต้น --</option>
                        {classrooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: "0.75rem" }}>บันทึกวิชาเรียน</button>
                  </form>

                  <div className="settings-card" style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>📚 วิชาเรียนทั้งหมดในหลักสูตร ({courses.length} วิชา)</h3>
                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>รหัสวิชา</th>
                            <th>ชื่อวิชา</th>
                            <th>ครูเริ่มต้น</th>
                            <th>ห้องเริ่มต้น</th>
                            <th style={{ width: "80px", textAlign: "center" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((c) => {
                            const teacher = teachers.find(t => t.id === c.defaultTeacherId);
                            const room = classrooms.find(r => r.id === c.defaultClassroomId);
                            return (
                              <tr key={c.id}>
                                <td><code>{c.code}</code></td>
                                <td><strong>{c.name}</strong></td>
                                <td style={{ color: "var(--accent-purple)" }}>{teacher ? teacher.name.split(" ")[0] : "ไม่ได้ระบุ"}</td>
                                <td style={{ color: "var(--accent-green)" }}>{room ? room.name : "ไม่ได้ระบุ"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <button className="icon-btn delete" onClick={() => handleDeleteCourse(c.id)} title="ลบวิชา">🗑️</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CLASSROOM MANAGEMENT */}
              {activeSettingsTab === "rooms" && (
                <div className="settings-grid">
                  <form className="settings-card" onSubmit={handleAddClassroom}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>➕ เพิ่มห้องเรียนใหม่</h3>
                    <div className="form-group">
                      <label className="form-label">ชื่อห้องเรียน</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ห้อง 305, Lab วิทย์ 2"
                        value={roomName} 
                        onChange={(e) => setRoomName(e.target.value)} 
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ประเภทห้องเรียน</label>
                      <select 
                        className="select-input" 
                        value={roomType} 
                        onChange={(e) => setRoomType(e.target.value)}
                      >
                        <option value="ห้องเรียนทั่วไป">ห้องเรียนทั่วไป</option>
                        <option value="ห้องทดลองวิทยาศาสตร์">ห้องทดลองวิทยาศาสตร์</option>
                        <option value="ห้องปฏิบัติการทางภาษา">ห้องปฏิบัติการทางภาษา</option>
                        <option value="ห้องคอมพิวเตอร์">ห้องคอมพิวเตอร์</option>
                        <option value="หอประชุม/ยิม">หอประชุม/ยิม</option>
                      </select>
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: "0.75rem" }}>บันทึกห้องเรียน</button>
                  </form>

                  <div className="settings-card" style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>🏫 สถานที่/ห้องเรียนทั้งหมด ({classrooms.length} ห้อง)</h3>
                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>ชื่อห้องเรียน</th>
                            <th>ประเภทห้องเรียน</th>
                            <th style={{ width: "80px", textAlign: "center" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classrooms.map((r) => (
                            <tr key={r.id}>
                              <td><strong>{r.name}</strong></td>
                              <td><span style={{ color: "var(--accent-green)" }}>{r.type}</span></td>
                              <td style={{ textAlign: "center" }}>
                                <button className="icon-btn delete" onClick={() => handleDeleteClassroom(r.id)} title="ลบห้อง">🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GROUP MANAGEMENT */}
              {activeSettingsTab === "groups" && (
                <div className="settings-grid">
                  <form className="settings-card" onSubmit={handleAddGroup}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>➕ เพิ่มชั้นเรียน/กลุ่มเรียน</h3>
                    <div className="form-group">
                      <label className="form-label">ชื่อระดับชั้น / กลุ่ม</label>
                      <input 
                        type="text" 
                        className="select-input" 
                        placeholder="เช่น ชั้น ม.3/1"
                        value={groupName} 
                        onChange={(e) => setGroupName(e.target.value)} 
                        required
                      />
                    </div>
                    <button type="submit" className="primary-btn" style={{ padding: "0.75rem" }}>บันทึกชั้นเรียน</button>
                  </form>

                  <div className="settings-card" style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>👥 ชั้นเรียน/กลุ่มเรียนทั้งหมด ({studentGroups.length} กลุ่ม)</h3>
                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>ชื่อชั้นเรียน (Student Group)</th>
                            <th style={{ width: "80px", textAlign: "center" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentGroups.map((g) => (
                            <tr key={g.id}>
                              <td><strong>{g.name}</strong></td>
                              <td style={{ textAlign: "center" }}>
                                <button className="icon-btn delete" onClick={() => handleDeleteGroup(g.id)} title="ลบชั้นเรียน">🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Timetable Drop Assignment Modal */}
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
                  value={`${courses.find((c) => c.id === modalData.courseId)?.name || "วิชา"} (${
                    courses.find((c) => c.id === modalData.courseId)?.code || "รหัส"
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
                    onChange={(e) => setModalData({ ...modalData, studentGroupId: e.target.value })}
                    required
                  >
                    {studentGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
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
                    <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
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
                    <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
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
                <button type="submit" className="primary-btn">ตกลง / บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
