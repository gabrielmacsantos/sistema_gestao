import Link from "next/link";
import { LogOut, Plus, Wallet } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { ValuesToggle } from "@/components/values-toggle";
import { getCurrentUser } from "@/server/auth";
import { logoutAction } from "../(auth)/actions";
import { BottomNav, MenuSheet, PageTrail, SideNav } from "./nav";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh md:pl-20 lg:pl-(--spacing-rail)">
      {/* Command rail: icon dock on tablets, full rail (260px) on desktop. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col justify-between overflow-y-auto border-r border-hairline bg-surface-container-lowest p-4 md:flex lg:w-(--spacing-rail)">
        <div className="flex flex-col gap-6">
          <Link href="/dashboard" className="flex items-center justify-center gap-3 px-1 pt-1 lg:justify-start">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
              <Wallet className="size-5" aria-hidden />
            </span>
            <span className="hidden min-w-0 flex-col lg:flex">
              <span className="truncate font-display text-headline-sm font-bold tracking-tight text-primary">
                Minhas Finanças
              </span>
              <span className="truncate text-label-sm text-secondary">Fluxo de caixa pessoal</span>
            </span>
          </Link>

          <Link
            href="/lancamentos/novo"
            title="Novo gasto"
            className={buttonClass("primary", "md", "w-full px-0 lg:px-4")}
          >
            <Plus className="size-5 shrink-0" aria-hidden />
            <span className="hidden lg:inline">Novo gasto</span>
          </Link>

          <SideNav />
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-4">
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="flex w-full items-center justify-center gap-3 rounded-lg py-2 text-label-lg text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface lg:justify-start lg:px-3"
            >
              <LogOut className="size-5 shrink-0" aria-hidden />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </form>
          <div
            className="flex items-center justify-center gap-3 overflow-hidden rounded-xl border border-hairline bg-surface p-1.5 lg:justify-start lg:p-3"
            title={user.name}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-md font-bold text-primary ring-1 ring-primary/20">
              {initials(user.name)}
            </span>
            <span className="hidden min-w-0 flex-col lg:flex">
              <span className="truncate text-label-md font-semibold text-on-surface">{user.name}</span>
              <span className="truncate text-label-sm font-normal text-secondary">{user.email}</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Tier 2: frosted sticky header. */}
        <header className="sticky top-0 z-20 border-b border-hairline bg-surface-container-lowest/82 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-margin md:px-margin-tablet lg:px-margin-desktop">
            {/* Same header as index.html: logo and name until lg (two lines below 360px rather than cut),
                then the "Visão geral › Página" trail. */}
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-container text-on-primary-container shadow-sm">
                <Wallet className="size-5" aria-hidden />
              </span>
              <span className="truncate font-display text-[18px] leading-6 font-bold tracking-[-0.01em] text-primary max-[359px]:text-[16px] max-[359px]:leading-[18px] max-[359px]:whitespace-normal">
                Minhas Finanças
              </span>
            </Link>
            <PageTrail />

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell userId={user.id} />
              <ValuesToggle />
              <ThemeToggle />
              <span className="md:hidden">
                <MenuSheet account={user.name} />
              </span>
              <span className="hidden md:block">
                <Link href="/lancamentos/novo" className={buttonClass("primary", "sm")}>
                  <Plus className="size-[18px]" aria-hidden /> Novo gasto
                </Link>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-margin pt-6 pb-28 md:px-margin-tablet md:pb-10 lg:px-margin-desktop">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
