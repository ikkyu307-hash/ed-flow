-- ed-flow Supabase (PostgreSQL) Database Schema
-- คัดลอกโค้ดนี้ไปรันในหน้า SQL Editor ของ Supabase Console (https://supabase.com) เพื่อสร้างตาราง

-- 1. Create Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create Classrooms Table
CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    default_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    default_classroom_id TEXT REFERENCES classrooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Create Student Groups Table
CREATE TABLE IF NOT EXISTS student_groups (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Create Schedules Table (Main timetable slot data)
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    classroom_id TEXT REFERENCES classrooms(id) ON DELETE CASCADE,
    student_group_id TEXT REFERENCES student_groups(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    period INT NOT NULL CHECK (period BETWEEN 1 AND 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Enable Realtime Replication for the tables
-- สิ่งนี้จำเป็นสำหรับการอัปเดตแบบลากวางข้ามหน้าจอเบราว์เซอร์ทันทีโดยไม่ต้องรีเฟรช
alter publication supabase_realtime add table schedules;
alter publication supabase_realtime add table teachers;
alter publication supabase_realtime add table classrooms;
alter publication supabase_realtime add table courses;
alter publication supabase_realtime add table student_groups;

-- 7. Disable Row Level Security (RLS) on all tables
-- This ensures the client-side CRUD operations and onboarding submit can interact with the tables without policies blocking them.
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
