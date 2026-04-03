"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AdminSidebarProps {
  employee: {
    id:   string;
    name: string;
    role: string;
  };
}

const NAV = [
  {
    href:  "/admin/queue",
    label: "Task queue",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 6h7M4 8.5h5M4 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/admin/tasks",
    label: "All tasks",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="9" y="1" width="5" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="1" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="8" y="9" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    href:  "/admin/vendors",
    label: "Vendors",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 4.5h11M2 4.5l1 8h9l1-8M5.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href:  "/admin/users",
    label: "Users",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2 13c0-2.8 2.5-4.5 5.5-4.5S13 10.2 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/admin/employees",
    label: "Employees",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="10.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M1 12.5c0-2.2 2-3.5 4.5-3.5S10 10.3 10 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M11.5 9.5c1.5.4 2.5 1.5 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/admin/prices",
    label: "Price refs",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 10l3-3 2 2 3-3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="1.5" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    href:  "/admin/pricing-rules",
    label: "Token Pricing",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 4.5v1M7.5 9.5v1M5.5 6.5a2 2 0 0 1 4 0c0 1.5-2 2-2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/admin/pioneer-tasks",
    label: "Pioneer Tasks",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1.5l1.5 3.5H13l-3 2.5 1 4-3.5-2-3.5 2 1-4-3-2.5h4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { href: "/admin/knowledge", label: "Knowledge Base", icon: "..." },
];

function roleLabel(role: string) {
  if (role === "ADMIN")        return "Admin";
  if (role === "SENIOR_AGENT") return "Senior agent";
  return "Agent";
}

export default function AdminSidebar({ employee }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-[210px] shrink-0 h-full border-r"
      style={{ background: "#111827", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          style={{ background: "var(--kb-navy)" }}
        >
          KB
        </div>
        <div>
          <div className="text-white font-semibold text-[13px] leading-tight">K-Bridge</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Admin portal
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-100"
              style={{
                color:      active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                fontWeight: active ? 500 : 400,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Employee footer */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
        >
          {employee.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-white truncate">{employee.name}</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {roleLabel(employee.role)}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="opacity-40 hover:opacity-70 transition-opacity"
          title="Sign out"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
