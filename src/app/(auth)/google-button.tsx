"use client";

import { Loader2 } from "lucide-react";
import { Roboto } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { LOGIN_ERRORS, loginErrorMessage } from "@/lib/login-errors";
import { cn } from "@/lib/utils";

/** Still on this page this long after the click: the trip to Google stalled (connection lost). */
const STALLED_MS = 15_000;

// Google's sign-in button guidelines ask for Roboto Medium; next/font self-hosts it at build time.
const roboto = Roboto({ weight: "500", subsets: ["latin"], display: "swap" });

/**
 * "Continuar com o Google", following Google's branding (colors, "G" mark and wording are fixed by
 * the guidelines, so they are not design tokens). The whole login is a full-page redirect through
 * /api/auth/google; errors come back as /login?erro=<code> and show here, quietly.
 */
export function GoogleButton({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(() => loginErrorMessage(error));
  const stalled = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Shown once: a reload or a shared link should not repeat it.
    if (error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("erro");
      history.replaceState(null, "", url);
    }
    // Coming back with the browser's Back button restores the page from cache, spinner included.
    const reset = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      clearTimeout(stalled.current);
      setLoading(false);
    };
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      clearTimeout(stalled.current);
    };
  }, [error]);

  // A plain link: the login is a full-page trip to Google and back, not an in-app navigation.
  function start(e: React.MouseEvent<HTMLAnchorElement>) {
    if (loading) return e.preventDefault();
    if (!navigator.onLine) {
      e.preventDefault();
      setMessage(LOGIN_ERRORS.rede);
      return;
    }
    setMessage(null);
    setLoading(true);
    // Once Google answers, this page is gone and the timer with it.
    stalled.current = setTimeout(() => {
      setLoading(false);
      setMessage(LOGIN_ERRORS.rede);
    }, STALLED_MS);
  }

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <p
          role="alert"
          className="rounded-lg border border-warning/40 bg-warning-container px-3 py-2.5 text-body-sm text-on-surface"
        >
          {message}
        </p>
      )}
      <a
        href="/api/auth/google"
        onClick={start}
        aria-disabled={loading}
        aria-busy={loading}
        className={cn(
          roboto.className,
          "flex h-11 w-full items-center justify-center gap-3 rounded-full border px-4 text-[14px] leading-5 transition-colors",
          "border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f20]",
          "aria-disabled:cursor-wait aria-disabled:opacity-80",
        )}
      >
        {loading ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <GoogleMark />}
        {loading ? "Conectando ao Google…" : "Continuar com o Google"}
      </a>
    </div>
  );
}

/** Google's "G", unmodified. */
function GoogleMark() {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
