// Unified data-access layer for ed-flow.
// Works in two modes:
//   1. Supabase mode  - when NEXT_PUBLIC_SUPABASE_* env vars are configured.
//   2. Local mock mode - persisted to localStorage so the app is fully usable
//      offline (and testable without a database).

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Classroom,
  Course,
  ScheduleSlot,
  Student,
  StudentGroup,
  Teacher,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock seed data (mirrors the defaults used by the Scheduler page)
// ---------------------------------------------------------------------------

export const INITIAL_TEACHERS: Teacher[] = [
  { id: "t1", name: "ครูสมชาย รักเรียน", subject: "คณิตศาสตร์" },
  { id: "t2", name: "ครูสมศรี แสนดี", subject: "วิทยาศาสตร์" },
  { id: "t3", name: "ครูทิพย์วรรณ สอนดี", subject: "ภาษาอังกฤษ" },
  { id: "t4", name: "ครูรัชนี วรรณศิลป์", subject: "ภาษาไทย" },
  { id: "t5", name: "ครูวิชัย พงษ์เพชร", subject: "สังคมศึกษา" },
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  { id: "r1", name: "ห้อง 101", type: "ห้องเรียนทั่วไป" },
  { id: "r2", name: "ห้อง 102", type: "ห้องเรียนทั่วไป" },
  { id: "r3", name: "ห้องวิทย์ Lab 1", type: "ห้องทดลองวิทยาศาสตร์" },
  { id: "r4", name: "ห้อง Sound Lab", type: "ห้องปฏิบัติการทางภาษา" },
  { id: "r5", name: "ห้องคอม 3", type: "ห้องคอมพิวเตอร์" },
];

export const INITIAL_COURSES: Course[] = [
  { id: "c1", name: "คณิตศาสตร์พื้นฐาน", code: "ค21101", color: "rgba(56, 189, 248, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r1" },
  { id: "c2", name: "วิทยาศาสตร์ทั่วไป", code: "ว21101", color: "rgba(192, 132, 252, 0.15)", defaultTeacherId: "t2", defaultClassroomId: "r3" },
  { id: "c3", name: "ภาษาอังกฤษพื้นฐาน", code: "อ21101", color: "rgba(52, 211, 153, 0.15)", defaultTeacherId: "t3", defaultClassroomId: "r4" },
  { id: "c4", name: "ภาษาไทยเบื้องต้น", code: "ท21101", color: "rgba(251, 146, 60, 0.15)", defaultTeacherId: "t4", defaultClassroomId: "r2" },
  { id: "c5", name: "สังคมศึกษาและการพัฒนา", code: "ส21101", color: "rgba(244, 63, 94, 0.15)", defaultTeacherId: "t5", defaultClassroomId: "r1" },
  { id: "c6", name: "เทคโนโลยีสารสนเทศ", code: "ว21103", color: "rgba(6, 182, 212, 0.15)", defaultTeacherId: "t1", defaultClassroomId: "r5" },
];

export const INITIAL_STUDENT_GROUPS: StudentGroup[] = [
  { id: "g1", name: "ชั้น ม.1/1 (Grade 7/1)" },
  { id: "g2", name: "ชั้น ม.1/2 (Grade 7/2)" },
  { id: "g3", name: "ชั้น ม.2/1 (Grade 8/1)" },
];

export const INITIAL_SCHEDULES: ScheduleSlot[] = [
  { id: "s1", courseId: "c1", teacherId: "t1", classroomId: "r1", studentGroupId: "g1", dayOfWeek: 1, period: 1 },
  { id: "s2", courseId: "c2", teacherId: "t2", classroomId: "r3", studentGroupId: "g1", dayOfWeek: 1, period: 2 },
  { id: "s3", courseId: "c3", teacherId: "t3", classroomId: "r4", studentGroupId: "g1", dayOfWeek: 1, period: 4 },
  { id: "s4", courseId: "c6", teacherId: "t1", classroomId: "r5", studentGroupId: "g2", dayOfWeek: 1, period: 1 },
  { id: "s5", courseId: "c4", teacherId: "t4", classroomId: "r2", studentGroupId: "g2", dayOfWeek: 1, period: 2 },
  { id: "s6", courseId: "c3", teacherId: "t3", classroomId: "r4", studentGroupId: "g3", dayOfWeek: 1, period: 4 },
];

const THAI_FIRST = ["ณัฐ", "ปวีณ", "ธนกร", "ศุภ'", "กิตติ", "ชนาภา", "พิมพ์", "อารยา", "ภูริ", "วรินทร์", "เจน", "นภัส"];
const THAI_LAST = ["ใจดี", "ศรีสุข", "วงศ์ทอง", "พงษ์ไพร", "บุญมา", "แก้วมณี", "รุ่งเรือง", "ทองคำ"];

function buildMockStudents(): Student[] {
  const out: Student[] = [];
  const counts: Record<string, number> = { g1: 8, g2: 7, g3: 6 };
  INITIAL_STUDENT_GROUPS.forEach((g, gi) => {
    const n = counts[g.id] ?? 6;
    for (let i = 0; i < n; i++) {
      const first = THAI_FIRST[(gi * 5 + i) % THAI_FIRST.length];
      const last = THAI_LAST[(gi * 3 + i) % THAI_LAST.length];
      const num = String(i + 1).padStart(2, "0");
      out.push({
        id: `${g.id}-st${num}`,
        studentCode: `${10000 + gi * 100 + i + 1}`,
        name: `เด็ก${first} ${last}`,
        studentGroupId: g.id,
      });
    }
  });
  return out;
}

export const INITIAL_STUDENTS: Student[] = buildMockStudents();

// ---------------------------------------------------------------------------
// localStorage helpers (mock mode)
// ---------------------------------------------------------------------------

const LS_STUDENTS = "edflow_students";
const LS_SESSIONS = "edflow_sessions";
const LS_RECORDS = "edflow_records";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

function mockStudents(): Student[] {
  if (typeof window === "undefined") return INITIAL_STUDENTS;
  const existing = window.localStorage.getItem(LS_STUDENTS);
  if (!existing) {
    writeLS(LS_STUDENTS, INITIAL_STUDENTS);
    return INITIAL_STUDENTS;
  }
  return readLS<Student[]>(LS_STUDENTS, INITIAL_STUDENTS);
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function genToken(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Row mappers (Supabase snake_case -> camelCase)
// ---------------------------------------------------------------------------

interface StudentRow { id: string; student_code: string; name: string; student_group_id: string }
interface SessionRow {
  id: string; token: string; teacher_id: string; student_group_id: string;
  course_id: string | null; classroom_id: string | null; date: string;
  period: number | null; created_at: string;
}
interface RecordRow {
  id: string; session_id: string; student_id: string; status: AttendanceStatus;
  source: "manual" | "qr"; marked_at: string;
}

const mapStudent = (r: StudentRow): Student => ({
  id: r.id, studentCode: r.student_code, name: r.name, studentGroupId: r.student_group_id,
});
const mapSession = (r: SessionRow): AttendanceSession => ({
  id: r.id, token: r.token, teacherId: r.teacher_id, studentGroupId: r.student_group_id,
  courseId: r.course_id, classroomId: r.classroom_id, date: r.date,
  period: r.period, createdAt: r.created_at,
});
const mapRecord = (r: RecordRow): AttendanceRecord => ({
  id: r.id, sessionId: r.session_id, studentId: r.student_id, status: r.status,
  source: r.source, markedAt: r.marked_at,
});

// ---------------------------------------------------------------------------
// Master data (teachers / classrooms / courses / groups / schedules)
// ---------------------------------------------------------------------------

export async function getTeachers(): Promise<Teacher[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("teachers").select("*").order("name");
    if (data && data.length) return data as Teacher[];
  }
  return INITIAL_TEACHERS;
}

export async function getClassrooms(): Promise<Classroom[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("classrooms").select("*").order("name");
    if (data && data.length) return data as Classroom[];
  }
  return INITIAL_CLASSROOMS;
}

export async function getCourses(): Promise<Course[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("courses").select("*").order("name");
    if (data && data.length) {
      return (data as Array<Record<string, string>>).map((c) => ({
        id: c.id, code: c.code, name: c.name, color: c.color,
        defaultTeacherId: c.default_teacher_id, defaultClassroomId: c.default_classroom_id,
      }));
    }
  }
  return INITIAL_COURSES;
}

export async function getStudentGroups(): Promise<StudentGroup[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("student_groups").select("*").order("name");
    if (data && data.length) return (data as StudentGroup[]);
  }
  return INITIAL_STUDENT_GROUPS;
}

export async function getSchedules(): Promise<ScheduleSlot[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("schedules").select("*");
    if (data) {
      return (data as Array<Record<string, string | number>>).map((s) => ({
        id: String(s.id), courseId: String(s.course_id), teacherId: String(s.teacher_id),
        classroomId: String(s.classroom_id), studentGroupId: String(s.student_group_id),
        dayOfWeek: Number(s.day_of_week), period: Number(s.period),
      }));
    }
  }
  return INITIAL_SCHEDULES;
}

// ---------------------------------------------------------------------------
// Current teacher
// ---------------------------------------------------------------------------

export async function getCurrentTeacher(): Promise<Teacher | null> {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("teachers").select("*").eq("id", user.id).single();
    if (data) return data as Teacher;
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    return { id: user.id, name: meta.full_name || user.email || "ครู", subject: "" };
  }
  // Mock mode
  const saved = readLS<Teacher | null>("onboarded_teacher", null);
  if (saved) return saved;
  return { id: "mock-admin-id", name: "ครูแอดมินระบบจำลอง", subject: "ทุกวิชา" };
}

// ---------------------------------------------------------------------------
// Teaching classes (the rooms / groups the teacher teaches)
// ---------------------------------------------------------------------------

export interface TeachingClass {
  group: StudentGroup;
  courseNames: string[];
  classroomNames: string[];
  studentCount: number;
}

export async function getMyClasses(teacherId: string): Promise<TeachingClass[]> {
  const [groups, courses, classrooms, schedules, students] = await Promise.all([
    getStudentGroups(), getCourses(), getClassrooms(), getSchedules(), getStudents(),
  ]);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const roomById = new Map(classrooms.map((r) => [r.id, r]));
  const studentCountByGroup = new Map<string, number>();
  students.forEach((s) => {
    studentCountByGroup.set(s.studentGroupId, (studentCountByGroup.get(s.studentGroupId) ?? 0) + 1);
  });

  const mySlots = schedules.filter((s) => s.teacherId === teacherId);
  // Fallback: a teacher with no assigned slots (e.g. fresh account / mock admin)
  // can still take attendance for every class.
  const slots = mySlots.length > 0 ? mySlots : schedules;
  const onlyMine = mySlots.length > 0;

  const byGroup = new Map<string, { courses: Set<string>; rooms: Set<string> }>();
  slots.forEach((s) => {
    if (!byGroup.has(s.studentGroupId)) byGroup.set(s.studentGroupId, { courses: new Set(), rooms: new Set() });
    const entry = byGroup.get(s.studentGroupId)!;
    const c = courseById.get(s.courseId);
    const r = roomById.get(s.classroomId);
    if (c) entry.courses.add(c.name);
    if (r) entry.rooms.add(r.name);
  });

  const groupIds = onlyMine ? Array.from(byGroup.keys()) : groups.map((g) => g.id);

  return groupIds
    .map((gid) => {
      const group = groups.find((g) => g.id === gid);
      if (!group) return null;
      const entry = byGroup.get(gid);
      return {
        group,
        courseNames: entry ? Array.from(entry.courses) : [],
        classroomNames: entry ? Array.from(entry.rooms) : [],
        studentCount: studentCountByGroup.get(gid) ?? 0,
      } as TeachingClass;
    })
    .filter((x): x is TeachingClass => x !== null)
    .sort((a, b) => a.group.name.localeCompare(b.group.name, "th"));
}

// ---------------------------------------------------------------------------
// Students CRUD
// ---------------------------------------------------------------------------

export async function getStudents(groupId?: string): Promise<Student[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("students").select("*");
    if (groupId) query = query.eq("student_group_id", groupId);
    const { data } = await query.order("student_code");
    return ((data ?? []) as StudentRow[]).map(mapStudent);
  }
  const all = mockStudents();
  const filtered = groupId ? all.filter((s) => s.studentGroupId === groupId) : all;
  return [...filtered].sort((a, b) => a.studentCode.localeCompare(b.studentCode));
}

export async function addStudent(input: Omit<Student, "id">): Promise<Student> {
  const student: Student = { id: genId("st"), ...input };
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").insert([{
      id: student.id, student_code: student.studentCode, name: student.name,
      student_group_id: student.studentGroupId,
    }]);
    if (error) throw new Error(error.message);
    return student;
  }
  const all = mockStudents();
  all.push(student);
  writeLS(LS_STUDENTS, all);
  return student;
}

export async function updateStudent(student: Student): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").update({
      student_code: student.studentCode, name: student.name,
      student_group_id: student.studentGroupId,
    }).eq("id", student.id);
    if (error) throw new Error(error.message);
    return;
  }
  const all = mockStudents().map((s) => (s.id === student.id ? student : s));
  writeLS(LS_STUDENTS, all);
}

export async function deleteStudent(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  writeLS(LS_STUDENTS, mockStudents().filter((s) => s.id !== id));
}

// ---------------------------------------------------------------------------
// Attendance sessions
// ---------------------------------------------------------------------------

function mockSessions(): AttendanceSession[] {
  return readLS<AttendanceSession[]>(LS_SESSIONS, []);
}

export async function createSession(input: {
  teacherId: string;
  studentGroupId: string;
  courseId?: string | null;
  classroomId?: string | null;
  date: string;
  period?: number | null;
}): Promise<AttendanceSession> {
  const session: AttendanceSession = {
    id: genId("sess"),
    token: genToken(),
    teacherId: input.teacherId,
    studentGroupId: input.studentGroupId,
    courseId: input.courseId ?? null,
    classroomId: input.classroomId ?? null,
    date: input.date,
    period: input.period ?? null,
    createdAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("attendance_sessions").insert([{
      id: session.id, token: session.token, teacher_id: session.teacherId,
      student_group_id: session.studentGroupId, course_id: session.courseId,
      classroom_id: session.classroomId, date: session.date, period: session.period,
    }]);
    if (error) throw new Error(error.message);
    return session;
  }
  const all = mockSessions();
  all.push(session);
  writeLS(LS_SESSIONS, all);
  return session;
}

export async function getSession(id: string): Promise<AttendanceSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_sessions").select("*").eq("id", id).single();
    return data ? mapSession(data as SessionRow) : null;
  }
  return mockSessions().find((s) => s.id === id) ?? null;
}

export async function getSessionByToken(token: string): Promise<AttendanceSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_sessions").select("*").eq("token", token).single();
    return data ? mapSession(data as SessionRow) : null;
  }
  return mockSessions().find((s) => s.token === token) ?? null;
}

export async function getSessionsForGroup(groupId: string): Promise<AttendanceSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_sessions").select("*")
      .eq("student_group_id", groupId).order("created_at", { ascending: false });
    return ((data ?? []) as SessionRow[]).map(mapSession);
  }
  return mockSessions()
    .filter((s) => s.studentGroupId === groupId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllSessions(): Promise<AttendanceSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_sessions").select("*").order("date", { ascending: false });
    return ((data ?? []) as SessionRow[]).map(mapSession);
  }
  return mockSessions().sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// Attendance records
// ---------------------------------------------------------------------------

function mockRecords(): AttendanceRecord[] {
  return readLS<AttendanceRecord[]>(LS_RECORDS, []);
}

export async function getRecords(sessionId: string): Promise<AttendanceRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_records").select("*").eq("session_id", sessionId);
    return ((data ?? []) as RecordRow[]).map(mapRecord);
  }
  return mockRecords().filter((r) => r.sessionId === sessionId);
}

export async function getAllRecords(): Promise<AttendanceRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("attendance_records").select("*");
    return ((data ?? []) as RecordRow[]).map(mapRecord);
  }
  return mockRecords();
}

export async function setRecord(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  source: "manual" | "qr" = "manual",
): Promise<void> {
  const markedAt = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    // Remove any existing record for this (session, student) then insert.
    await supabase.from("attendance_records").delete()
      .eq("session_id", sessionId).eq("student_id", studentId);
    const { error } = await supabase.from("attendance_records").insert([{
      id: genId("rec"), session_id: sessionId, student_id: studentId,
      status, source, marked_at: markedAt,
    }]);
    if (error) throw new Error(error.message);
    return;
  }
  const all = mockRecords().filter((r) => !(r.sessionId === sessionId && r.studentId === studentId));
  all.push({ id: genId("rec"), sessionId, studentId, status, source, markedAt });
  writeLS(LS_RECORDS, all);
}
