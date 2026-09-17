"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icon };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const I = Icon[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`navlink ${isActive(pathname, item.href) ? "navlink-on" : ""}`}
          >
            <I className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const I = Icon[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tab ${isActive(pathname, item.href) ? "tab-on" : ""}`}
          >
            <I className="h-[22px] w-[22px]" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
