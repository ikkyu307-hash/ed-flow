"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import "../scheduler/scheduler.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect to scheduler
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/scheduler");
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      // In offline mock mode, simulate login
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setSuccessMessage("จำลองการเข้าสู่ระบบเรียบร้อย (โหมดออฟไลน์)");
        setTimeout(() => {
          router.push("/scheduler");
        }, 1000);
      }, 800);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;
        
        // If email confirmation is enabled, user needs to check email
        if (data.session) {
          setSuccessMessage("ลงทะเบียนและเข้าสู่ระบบเรียบร้อยแล้ว!");
          setTimeout(() => router.push("/scheduler"), 1500);
        } else {
          setSuccessMessage("ลงทะเบียนสำเร็จ! โปรดตรวจสอบอีเมลของคุณเพื่อยืนยันการสมัครใช้งาน (หรือหากคุณปิดเมนู Email Confirmation ในหน้าตรรกะ Supabase คุณสามารถล็อกอินได้ทันที)");
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setSuccessMessage("เข้าสู่ระบบสำเร็จ!");
          setTimeout(() => router.push("/scheduler"), 1000);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการยืนยันตัวตน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scheduler-container" style={{ justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <div className="modal-content" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem", borderRadius: "20px" }}>
        <div className="modal-header" style={{ textAlign: "center" }}>
          <div className="logo-icon" style={{ margin: "0 auto 1rem", width: "48px", height: "48px", fontSize: "1.5rem" }}>EF</div>
          <h2 className="modal-title" style={{ fontSize: "1.5rem" }}>
            {isSignUp ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบวิชาการ"}
          </h2>
          <p className="modal-subtitle">
            {isSignUp ? "ลงทะเบียนเพื่อสิทธิ์การจัดตารางสอน" : "ระบบจัดการโรงเรียน ed-flow"}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="firebase-banner" style={{ margin: "-0.5rem 0 1.5rem", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.75rem", display: "block", border: "1px solid var(--accent-orange)" }}>
            ⚠️ <strong>โหมดทดลองใช้ (Offline Mock Mode)</strong><br />
            คุณสามารถกดสมัครหรือล็อกอินเพื่อเข้าไปทดลองใช้ระบบจัดตารางเรียนได้โดยไม่ต้องใช้ข้อมูลจริง
          </div>
        )}

        {errorMessage && (
          <div className="firebase-banner" style={{ margin: "-0.5rem 0 1.5rem", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.75rem", display: "block", border: "1px solid var(--accent-red)", background: "rgba(244,63,94,0.1)", color: "#fca5a5" }}>
            ❌ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="firebase-banner online" style={{ margin: "-0.5rem 0 1.5rem", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.75rem", display: "block", border: "1px solid var(--accent-green)" }}>
            ✔️ {successMessage}
          </div>
        )}

        <form className="modal-form" onSubmit={handleAuth}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">ชื่อ-นามสกุลครู / แอดมิน</label>
              <input
                type="text"
                className="select-input"
                placeholder="ชื่อ นามสกุล"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">อีเมลผู้ใช้งาน</label>
            <input
              type="email"
              className="select-input"
              placeholder="example@school.ac.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password"
              className="select-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="primary-btn" style={{ width: "100%", marginTop: "1rem", padding: "0.8rem" }} disabled={loading}>
            {loading ? "กำลังดำเนินการ..." : isSignUp ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {isSignUp ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชีสมาชิก? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={{ background: "none", border: "none", color: "var(--accent-color)", cursor: "pointer", fontWeight: "bold", textDecoration: "underline", fontFamily: "inherit" }}
          >
            {isSignUp ? "เข้าสู่ระบบที่นี่" : "สมัครสมาชิกวิชาการที่นี่"}
          </button>
        </div>
      </div>
    </div>
  );
}
