"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/daily", icon: "📝", label: "บันทึก" },
  { href: "/summary", icon: "📊", label: "สรุป" },
];

interface Props {
  isAdmin?: boolean;
}

export function NavBar({ isAdmin }: Props) {
  const pathname = usePathname();

  const tabs = isAdmin
    ? [...TABS, { href: "/admin", icon: "⚙️", label: "Admin" }]
    : TABS;

  return (
    <nav className="bottom-nav">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="nav-item no-underline"
            style={{ color: active ? "#3b82f6" : "#3b4f6f" }}
          >
            <span className="text-xl mb-[2px]">{t.icon}</span>
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
