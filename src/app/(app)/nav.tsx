"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  CalendarSync,
  ScanLine,
  PiggyBank,
  Tags,
  X,
  type LucideIcon,
} from "lucide-react";
import { currentMonth, isValidMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { logoutAction } from "../(auth)/actions";

type NavItem = { href: string; label: string; icon: LucideIcon; mobile: boolean };

const items: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard, mobile: true },
  { href: "/lancamentos", label: "Lançamentos", icon: ReceiptText, mobile: true },
  { href: "/fixos", label: "Gastos fixos", icon: CalendarSync, mobile: true },
  { href: "/importar", label: "Importar", icon: ScanLine, mobile: false },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank, mobile: true },
  { href: "/categorias", label: "Categorias", icon: Tags, mobile: false },
];

/** Links keep the month being viewed (?mes=) unless it is the current one, as in index.html. */
function useNavHref() {
  const mes = useSearchParams().get("mes");
  const keep = isValidMonth(mes) && mes !== currentMonth();
  return (href: string) => (keep ? `${href}?mes=${mes}` : href);
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Left command rail links. Icon-only between md and lg (tablet dock), labelled from lg. */
export function SideNav() {
  const isActive = useIsActive();
  const navHref = useNavHref();
  return (
    <nav className="flex flex-col gap-1" aria-label="Principal">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={navHref(href)}
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
  const navHref = useNavHref();
  const links = items.filter((i) => i.mobile);
  const renderLink = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href);
    return (
      <li key={href}>
        <Link
          href={navHref(href)}
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

/** 36px icon button with a 46px touch area, like .icon-btn in index.html. */
export const iconButton =
  "relative flex size-9 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors after:absolute after:-inset-[5px] hover:bg-surface-container-low hover:text-on-surface";

/** "Mais opções" on phones: a sheet with every page and Sair, as the menu sheet in index.html. */
export function MenuSheet({ account }: { account: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isActive = useIsActive();
  const navHref = useNavHref();
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        className={iconButton}
        aria-label="Mais opções"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Menu className="size-[18px]" aria-hidden />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="menu-title"
        // A tap on the dimmed area (the dialog element itself) closes it; Esc closes it natively.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-full rounded-t-[20px] border border-hairline bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-scrim backdrop:backdrop-blur-[2px] motion-safe:open:animate-[sheet-up_.2s] sm:inset-0 sm:m-auto sm:h-fit sm:max-w-[520px] sm:rounded-[20px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-6 py-4">
          <h2 id="menu-title" className="text-headline-sm text-on-surface">
            Menu
          </h2>
          <button type="button" className={iconButton} aria-label="Fechar" onClick={close}>
            <X className="size-[18px]" aria-hidden />
          </button>
        </div>
        <nav aria-label="Menu" className="px-6 pb-[max(16px,env(safe-area-inset-bottom))]">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={navHref(href)}
              onClick={close}
              aria-current={isActive(href) ? "page" : undefined}
              className="flex items-center gap-3 border-b border-surface-container-low px-1 py-3.5 text-body-md font-semibold aria-[current=page]:text-primary"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button type="submit" className="flex w-full min-w-0 items-center gap-3 px-1 py-3.5 text-left text-body-md font-semibold">
              <LogOut className="size-5 shrink-0" aria-hidden />
              <span className="truncate">Sair ({account})</span>
            </button>
          </form>
        </nav>
      </dialog>
    </>
  );
}
