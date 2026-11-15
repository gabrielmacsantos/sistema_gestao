export type AppNotice = {
  id: string;
  title: string;
  body: string;
  /** Calendar day, "YYYY-MM-DD". */
  date: string;
  /** Reserved for the store links at launch. Not rendered while the app is in testing. */
  actionUrl?: string;
};

/** Newest first; ties keep the catalog order. */
export function sortNotices(notices: readonly AppNotice[]): AppNotice[] {
  return notices
    .map((notice, index) => ({ notice, index }))
    .sort((a, b) => b.notice.date.localeCompare(a.notice.date) || a.index - b.index)
    .map(({ notice }) => notice);
}

/** Ids still unread; read ids that no longer exist in the catalog are ignored. */
export function unreadIds(notices: readonly AppNotice[], readIds: readonly string[]): string[] {
  const read = new Set(readIds);
  return notices.filter((n) => !read.has(n.id)).map((n) => n.id);
}

export function markRead(readIds: readonly string[], ...ids: string[]): string[] {
  return [...new Set([...readIds, ...ids])];
}

/** Parses the stored value defensively: anything that is not a list of strings counts as empty. */
export function parseReadIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export const noticesStorageKey = (userId: string) => `notices-read:${userId}`;

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function formatNoticeDate(date: string): string {
  return dateFormat.format(new Date(`${date}T12:00:00-03:00`));
}
