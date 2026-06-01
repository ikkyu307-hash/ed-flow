import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>EF</div>
          <div className={styles.logoText}>ed-flow</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.95rem" }}>
          <span style={{ color: "#94a3b8" }}>ระบบบริหารจัดการโรงเรียนยุคใหม่</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.badge}>Next-Gen School Portal</div>
        <h1 className={styles.title}>
          ยกระดับการจัดการโรงเรียน ด้วยระบบอัจฉริยะ
        </h1>
        <p className={styles.subtitle}>
          ขับเคลื่อนทุกกระบวนการทางการศึกษาให้ลื่นไหล รวดเร็ว และเป็นระบบ 
          ลดภาระงานครู เพิ่มเวลาดูแลนักเรียนอย่างแท้จริง
        </p>
        <div className={styles.ctaWrapper}>
          <Link href="/scheduler" className={styles.ctaBtn}>
            <span>เข้าสู่ระบบจัดตารางเรียนตารางสอน (Scheduler)</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className={styles.featuresGrid}>
        {/* Timetable Scheduler (Highlight) */}
        <div className={`${styles.featureCard} ${styles.highlight}`}>
          <div className={styles.featureIcon}>📅</div>
          <h3 className={styles.featureTitle} style={{ color: "#a78bfa" }}>
            ระบบจัดตารางสอนลากวาง (Drag-and-Drop)
          </h3>
          <p className={styles.featureDesc}>
            จัดตารางเรียนตารางสอนง่ายดายด้วยการลากวาง 
            พร้อมระบบ AI ตรวจสอบการจองวิชา ครูสอนซ้ำ หรือห้องเรียนชนกันโดยอัตโนมัติแบบเรียลไทม์
          </p>
        </div>

        {/* Attendance Tracker */}
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>✅</div>
          <h3 className={styles.featureTitle}>
            เช็กชื่อเข้าเรียน (Attendance Tracker)
          </h3>
          <p className={styles.featureDesc}>
            เช็กชื่อนักเรียนรายวันหรือรายคาบด้วยอินเทอร์เฟซที่รวดเร็ว 
            สรุปข้อมูลสถิติการมาเรียนขาดลาสาย ส่งตรงถึงครูประจำชั้นและผู้ปกครองทันที
          </p>
        </div>

        {/* Grading Hub */}
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📊</div>
          <h3 className={styles.featureTitle}>
            บันทึกคะแนนและคำนวณเกรด (Grading Hub)
          </h3>
          <p className={styles.featureDesc}>
            บันทึกคะแนนสอบ คะแนนเก็บรายหน่วยการเรียนรู้ 
            ตัดเกรดอัตโนมัติตามเกณฑ์ พร้อมออกสมุดรายงานผลการเรียน (Report Card) ได้ในคลิกเดียว
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 ed-flow. Developed for modern school systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
