"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  Plus,
  ReceiptText,
  CalendarSync,
  ScanLine,
  PiggyBank,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; mobile: boolean };

const items: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard, mobile: true },
  { href: "/lancamentos", label: "Lançamentos", icon: ReceiptText, mobile: true },
  { href: "/fixos", label: "Gastos fixos", icon: CalendarSync, mobile: true },
  { href: "/importar", label: "Importar", icon: ScanLine, mobile: false },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank, mobile: true },
  { href: "/categorias", label: "Categorias", icon: Tags, mobile: false },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Left command rail links. Icon-only between md and lg (tablet dock), labelled from lg. */
export function SideNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1" aria-label="Principal">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-3 rounded-lg py-2.5 text-label-lg transition-colors lg:justify-start lg:px-3",
              active
                ? "bg-surface-container-high text-primary"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface",
            )}
          >
            <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            <span className="hidden truncate lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** "Visão geral › Página" trail shown in the desktop header. */
export function PageTrail() {
  const isActive = useIsActive();
  const current = items.find((i) => isActive(i.href))?.label ?? "Painel";
  return (
    <div className="hidden items-center gap-2 text-label-md text-secondary lg:flex">
      <span>Visão geral</span>
      <ChevronRight className="size-4 text-outline-variant" aria-hidden />
      <span className="font-semibold text-primary">{current}</span>
    </div>
  );
}

export function BottomNav() {
  const isActive = useIsActive();
  const links = items.filter((i) => i.mobile);
  const renderLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 text-label-sm",
            active ? "text-primary" : "text-secondary",
          )}
        >
          <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
          {label.split(" ")[0]}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-container-lowest/90 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5 items-end px-1">
        {links.slice(0, 2).map(renderLink)}
        <li className="flex justify-center">
          <Link
            href="/lancamentos/novo"
            aria-label="Novo lançamento"
            className="-mt-5 mb-1 flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md ring-4 ring-surface-container-lowest transition-transform active:scale-95"
          >
            <Plus className="size-6" aria-hidden />
          </Link>
        </li>
        {links.slice(2, 4).map(renderLink)}
      </ul>
    </nav>
  );
}
