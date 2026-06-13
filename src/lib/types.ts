// Shared domain types for ed-flow

export interface Teacher {
  id: string;
  name: string;
  subject: string;
}

export interface Classroom {
  id: string;
  name: string;
  type: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  defaultTeacherId: string;
  defaultClassroomId: string;
}

export interface StudentGroup {
  id: string;
  name: string;
}

export interface ScheduleSlot {
  id: string;
  courseId: string;
  teacherId: string;
  classroomId: string;
  studentGroupId: string;
  dayOfWeek: number; // 1 = Monday ... 5 = Friday
  period: number; // 1 - 8
}

export interface Student {
  id: string;
  studentCode: string; // รหัสนักเรียน
  name: string;
  studentGroupId: string; // ชั้นเรียน / ห้อง
}

export type AttendanceStatus = "present" | "late" | "absent" | "leave";

export interface AttendanceSession {
  id: string;
  token: string; // unique token used for the QR code
  teacherId: string;
  studentGroupId: string;
  courseId: string | null;
  classroomId: string | null;
  date: string; // YYYY-MM-DD
  period: number | null;
  createdAt: string; // ISO timestamp
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  source: "manual" | "qr";
  markedAt: string; // ISO timestamp
}

export interface StatusMeta {
  value: AttendanceStatus;
  label: string;
  short: string;
  emoji: string;
  color: string;
}

export const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present: { value: "present", label: "มาเรียน", short: "มา", emoji: "✅", color: "var(--accent-green)" },
  late: { value: "late", label: "มาสาย", short: "สาย", emoji: "⏰", color: "var(--accent-orange)" },
  leave: { value: "leave", label: "ลา", short: "ลา", emoji: "📝", color: "var(--accent-purple)" },
  absent: { value: "absent", label: "ขาดเรียน", short: "ขาด", emoji: "❌", color: "var(--accent-red)" },
};

export const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "leave", "absent"];
