"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signOut } from "next-auth/react";

interface SidebarProps {
  user: {
    id?:   string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const NAV_ITEMS = [
  {
    href:  "/dashboard",
    label: "Dashboard",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
        <rect x="9" y="1" width="5" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
        <rect x="1" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.9"/>
        <rect x="8" y="9" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href:  "/tasks",
    label: "My tasks",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 6h7M4 8.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/recurring",
    label: "Recurring",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 7.5A5.5 5.5 0 1 1 3.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M2 11V7.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href:  "/tasks?filter=history",
    label: "History",
    matchPath: "/tasks",
    matchParam: "history",
    badge: "12 mo",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const BOTTOM_NAV = [
  {
    href:  "/tokens",
    label: "Add tokens",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 4.5v6M4.5 7.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/account",
    label: "Account",
    icon:  (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2 13c0-2.8 2.5-4.5 5.5-4.5S13 10.2 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  function isActive(item: typeof NAV_ITEMS[number]) {
    // History item: active only when on /tasks with filter=history
    if (item.matchParam) {
      return pathname === item.matchPath && searchParams.get("filter") === item.matchParam;
    }
    // My Tasks item: active on /tasks but NOT when filter=history
    if (item.href === "/tasks") {
      return pathname === "/tasks" && searchParams.get("filter") !== "history";
    }
    // All other items: exact match or subpath
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside
      className="flex flex-col w-[210px] shrink-0 h-full"
      style={{ background: "var(--kb-navy)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex-shrink-0">
          <Image
            src="/logo.png"
            alt="K-Bridge"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="text-white font-semibold text-[14px] leading-tight">K-Bridge</div>
          <div className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
            Camp Humphreys
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-100"
              style={{
                color:      active ? "#fff" : "rgba(255,255,255,0.60)",
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                fontWeight: active ? 500 : 400,
                borderLeft: active ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-2" style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "6px 4px" }} />

        {BOTTOM_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-100"
              style={{
                color:      active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                fontWeight: active ? 500 : 400,
                borderLeft: active ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
        >
          {getInitials(user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-white truncate">{user.name ?? user.email}</div>
          <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>SOFA member</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="p-1 rounded transition-opacity opacity-40 hover:opacity-80"
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
