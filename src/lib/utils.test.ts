import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("lets later classes override conflicting ones and keeps design tokens apart", () => {
    expect(cn("p-5 h-11", "p-0 h-9")).toBe("p-0 h-9");
    expect(cn("inline-flex", "hidden md:inline-flex")).toBe("hidden md:inline-flex");
    expect(cn("text-body-md text-on-surface", "text-label-sm")).toBe("text-on-surface text-label-sm");
    expect(cn("text-on-surface", "text-success")).toBe("text-success");
  });
});
