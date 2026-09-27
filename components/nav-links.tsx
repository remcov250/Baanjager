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

// The last tab stands for several pages; it lights up on any of them.
export function MoreTab({ label, href, covers }: { label: string; href: string; covers: string[] }) {
  const pathname = usePathname();
  const on = covers.some((path) => isActive(pathname, path));
  return (
    <Link href={href} className={`tab ${on ? "tab-on" : ""}`} aria-current={on ? "page" : undefined}>
      <Icon.more className="h-[22px] w-[22px]" />
      {label}
    </Link>
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
