"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import "./app-shell.css";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  primary?: boolean; // shown in the mobile bottom bar
}

const NAV: NavItem[] = [
  { href: "/", label: "หน้าหลัก", icon: "🏠" },
  { href: "/scheduler", label: "ตารางสอน", icon: "📅" },
  { href: "/attendance", label: "เช็คชื่อ", icon: "✅", primary: true },
  { href: "/students", label: "นักเรียน", icon: "🧑‍🎓", primary: true },
  { href: "/reports", label: "รายงาน", icon: "📊", primary: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (!confirm("ต้องการออกจากระบบ?")) return;
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("onboarded_teacher");
    }
    router.push("/login");
  };

  return (
    <div className="ed-shell">
      {/* Top header */}
      <header className="ed-header">
        <button
          className="ed-icon-btn"
          aria-label="เปิดเมนู"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
        <Link href="/" className="ed-brand">
          <span className="ed-brand-mark">EF</span>
          <span className="ed-brand-text">ed-flow</span>
        </Link>
        <div className="ed-header-titles">
          {title && <span className="ed-header-title">{title}</span>}
          {subtitle && <span className="ed-header-sub">{subtitle}</span>}
        </div>
      </header>

      {/* Slide menu (drawer) */}
      <div
        className={`ed-drawer-backdrop ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`ed-drawer ${menuOpen ? "open" : ""}`}>
        <div className="ed-drawer-head">
          <span className="ed-brand-mark">EF</span>
          <div>
            <div className="ed-drawer-title">ed-flow</div>
            <div className="ed-drawer-sub">ระบบบริหารโรงเรียน</div>
          </div>
          <button
            className="ed-icon-btn ed-drawer-close"
            aria-label="ปิดเมนู"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="ed-drawer-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`ed-nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="ed-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button className="ed-signout" onClick={handleSignOut}>
          <span>🚪</span> ออกจากระบบ
        </button>
      </aside>

      {/* Page content */}
      <main className="ed-main">{children}</main>

      {/* Mobile bottom navigation (3 main menus) */}
      <nav className="ed-bottom-nav">
        {NAV.filter((n) => n.primary).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`ed-bottom-item ${isActive(pathname, item.href) ? "active" : ""}`}
          >
            <span className="ed-bottom-icon">{item.icon}</span>
            <span className="ed-bottom-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
