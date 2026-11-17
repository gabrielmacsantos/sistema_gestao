"use client";

import { useEffect, useLayoutEffect, useRef, type ComponentPropsWithoutRef, type KeyboardEvent } from "react";
import { nextTabIndex, tabScrollLeft } from "@/lib/sliding-tabs";
import { cn } from "@/lib/utils";

type Position = { left: number; width: number };

/**
 * Moves the indicator under the chosen option (the one marked data-active="true"): translateX + width, from
 * offsetLeft/offsetWidth, as in the transitions.dev recipe. Skips the work when it is already there, so a resize
 * callback never cuts a glide short.
 */
function placePill(bar: HTMLElement, last: { current: Position | null }, animate: boolean) {
  const pill = bar.querySelector<HTMLElement>(".t-tabs-pill");
  const tab = bar.querySelector<HTMLElement>('.t-tab[data-active="true"]');
  if (!pill || !tab || tab.offsetWidth === 0) return; // hidden: the resize observer places it when it shows
  const at = { left: tab.offsetLeft, width: tab.offsetWidth };
  if (last.current && last.current.left === at.left && last.current.width === at.width) return;
  const move = () => {
    pill.style.transform = `translateX(${at.left}px)`;
    pill.style.width = `${at.width}px`;
  };
  if (animate) {
    move();
  } else {
    const kept = pill.style.transition;
    pill.style.transition = "none";
    move();
    void pill.offsetWidth; // flush, so the jump is not animated
    pill.style.transition = kept;
  }
  last.current = at;
  bar.dataset.ready = "";
  // A bar that does not fit scrolls by itself (not the page) to keep the chosen option in view.
  if (bar.scrollWidth > bar.clientWidth) {
    const left = tabScrollLeft({ scrollLeft: bar.scrollLeft, clientWidth: bar.clientWidth, tabLeft: at.left, tabWidth: at.width });
    if (left !== bar.scrollLeft) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      bar.scrollTo({ left, behavior: animate && !reduced ? "smooth" : "auto" });
    }
  }
}

type Props = Omit<ComponentPropsWithoutRef<"div">, "role"> & {
  /**
   * "tabs": switches a panel (buttons with role="tab"); "radio": picks a value (native radios, which already
   * handle the arrow keys); "nav": links that change the address (aria-current), rendered as a <nav>.
   */
  kind?: "tabs" | "radio" | "nav";
  /** The options share the bar's width equally (short bars, such as Despesa/Receita). */
  fill?: boolean;
};

/**
 * The one segmented control of the app (transitions.dev "Tabs sliding"): its children are the options, each with
 * className "t-tab" and data-active; the indicator glides to the active one. The children keep their own semantics
 * (button role="tab" with aria-selected, Link with aria-current, label with a radio input). Colors, sizes and the
 * reduced-motion rule live in globals.css (.t-tabs).
 */
export function SlidingTabs({ kind = "tabs", fill = false, className, children, onKeyDown, ...rest }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const last = useRef<Position | null>(null);

  // After every render: the first time the indicator just appears, afterwards it glides to the chosen option.
  useLayoutEffect(() => {
    if (bar.current) placePill(bar.current, last, last.current !== null);
  });

  // Sizes change when a label grows, a font loads late or the screen turns: place it again, without gliding.
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => placePill(el, last, false));
    el.querySelectorAll(".t-tab").forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, []);

  // Arrows, Home and End move between tabs and choose the one that gets focus (native radios do it themselves).
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || kind !== "tabs" || event.altKey || event.ctrlKey || event.metaKey) return;
    const tab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    if (!tab) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const next = nextTabIndex(event.key, tabs.indexOf(tab), tabs.length);
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  }

  const Tag = kind === "nav" ? "nav" : "div";
  return (
    <Tag
      ref={bar}
      role={kind === "tabs" ? "tablist" : undefined}
      data-kind={kind}
      className={cn("t-tabs text-label-md", fill && "t-tabs--fill", className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <span className="t-tabs-pill" aria-hidden="true" />
      {children}
    </Tag>
  );
}
