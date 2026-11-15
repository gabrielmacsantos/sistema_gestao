"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { NOTICES } from "@/lib/notices-data";
import {
  formatNoticeDate,
  markRead,
  noticesStorageKey,
  parseReadIds,
  sortNotices,
  unreadIds,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

// Read state lives in localStorage, one key per user. If storage is blocked (private mode) the
// choice is kept in memory for the session only.
const EVENT = "notices-change";
const memory = new Map<string, string>();

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function readRaw(key: string): string {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? "[]";
  } catch {
    return memory.get(key) ?? "[]";
  }
}

function writeIds(key: string, ids: string[]) {
  const raw = JSON.stringify(ids);
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Private mode: kept in memory only.
  }
  window.dispatchEvent(new Event(EVENT));
}

const notices = sortNotices(NOTICES);

export function NotificationBell({ userId }: { userId: string }) {
  const key = noticesStorageKey(userId);
  // null on the server and during hydration: no badge until the saved state is known.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const readIds = parseReadIds(raw);
  const unread = raw === null ? [] : unreadIds(notices, readIds);
  const count = unread.length;

  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = count > 0 ? `Notificações, ${count} ${count === 1 ? "não lida" : "não lidas"}` : "Notificações";

  return (
    <div ref={root} className="md:relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="relative flex size-9 items-center justify-center rounded-lg border border-hairline text-secondary transition-colors after:absolute after:-inset-[6px] hover:bg-surface-container-low hover:text-on-surface"
      >
        <Bell className="size-[18px]" aria-hidden />
        {count > 0 && (
          // key restarts the entry animation each time the count changes.
          <span
            key={count}
            aria-hidden
            className="t-badge absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] leading-none font-bold text-on-error ring-2 ring-surface-container-lowest"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notificações"
          className="absolute inset-x-3 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-hairline bg-surface-container-lowest text-on-surface shadow-xl motion-safe:animate-[sheet-up_.2s] md:inset-x-auto md:right-0 md:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <h2 className="text-headline-sm text-on-surface">Novidades</h2>
            {count > 0 && (
              <button
                type="button"
                onClick={() => writeIds(key, markRead(readIds, ...unread))}
                className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-label-md font-semibold text-primary hover:bg-surface-container-low"
              >
                <CheckCheck className="size-4" aria-hidden /> Marcar todas como lidas
              </button>
            )}
          </div>

          {notices.length === 0 ? (
            <p className="px-4 py-8 text-center text-body-md text-secondary">Nenhum aviso por enquanto.</p>
          ) : (
            <ul className="max-h-[min(60dvh,420px)] overflow-y-auto">
              {notices.map((notice) => {
                const isUnread = unread.includes(notice.id);
                return (
                  <li key={notice.id} className="flex gap-3 border-b border-surface-container-low px-4 py-3 last:border-b-0">
                    <span
                      aria-hidden
                      className={cn("mt-2 size-2 shrink-0 rounded-full", isUnread ? "bg-error" : "bg-transparent")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className={cn("text-body-md text-on-surface", isUnread ? "font-semibold" : "font-medium")}>
                          {notice.title}
                          {isUnread && <span className="sr-only"> (não lida)</span>}
                        </h3>
                        <time dateTime={notice.date} className="shrink-0 text-label-sm text-secondary">
                          {formatNoticeDate(notice.date)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-body-sm text-secondary">{notice.body}</p>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => writeIds(key, markRead(readIds, notice.id))}
                          className="mt-1 flex min-h-9 items-center gap-1.5 rounded-lg text-label-md font-semibold text-primary"
                        >
                          <Check className="size-4" aria-hidden /> Marcar como lida
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
