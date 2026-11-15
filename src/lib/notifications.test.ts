import { describe, expect, it } from "vitest";
import { NOTICES } from "./notices-data";
import {
  formatNoticeDate,
  markRead,
  noticesStorageKey,
  parseReadIds,
  sortNotices,
  unreadIds,
  type AppNotice,
} from "./notifications";

const n = (id: string, date: string): AppNotice => ({ id, title: id, body: "", date });

describe("notifications", () => {
  it("sorts newest first and keeps catalog order on ties", () => {
    const sorted = sortNotices([n("a", "2026-01-01"), n("b", "2026-03-01"), n("c", "2026-03-01")]);
    expect(sorted.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the catalog", () => {
    const list = [n("a", "2026-01-01"), n("b", "2026-03-01")];
    sortNotices(list);
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("lists unread ids and ignores read ids that left the catalog", () => {
    const list = [n("a", "2026-01-01"), n("b", "2026-02-01")];
    expect(unreadIds(list, ["a", "gone"])).toEqual(["b"]);
    expect(unreadIds(list, [])).toEqual(["a", "b"]);
  });

  it("marks one or all as read without duplicates", () => {
    expect(markRead(["a"], "b")).toEqual(["a", "b"]);
    expect(markRead(["a"], "a", "b", "b")).toEqual(["a", "b"]);
  });

  it("parses stored ids defensively", () => {
    expect(parseReadIds(null)).toEqual([]);
    expect(parseReadIds("not json")).toEqual([]);
    expect(parseReadIds('{"a":1}')).toEqual([]);
    expect(parseReadIds('["a",1,"b"]')).toEqual(["a", "b"]);
  });

  it("keys the read state by user", () => {
    expect(noticesStorageKey("u1")).not.toBe(noticesStorageKey("u2"));
  });

  it("formats the date in São Paulo regardless of the host timezone", () => {
    expect(formatNoticeDate("2026-11-15")).toContain("15");
    expect(formatNoticeDate("2026-11-15")).toContain("2026");
  });

  it("ships a catalog with unique ids and no active actionUrl", () => {
    expect(new Set(NOTICES.map((x) => x.id)).size).toBe(NOTICES.length);
    expect(NOTICES.every((x) => !x.actionUrl)).toBe(true);
  });
});
