import { describe, expect, it } from "vitest";
import { duration, initials, relativeTime } from "./format";
import { frontMatterValue, joinFrontMatter, normalizeEnding, protectPlaceholders, restorePlaceholders, splitFrontMatter } from "./markdown";
import { hunks } from "../pages/Diff";

describe("format", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("relative time follows the interface language", () => {
    expect(relativeTime("2026-09-25T10:00:00Z", "en", now)).toBe("2 hours ago");
    expect(relativeTime("2026-09-25T10:00:00Z", "ru", now)).toBe("2 часа назад");
    expect(relativeTime("2026-09-25T07:00:00Z", "ru", now)).toBe("5 часов назад");
    expect(relativeTime("2026-09-24T12:00:00Z", "de", now)).toBe("gestern");
  });
  it("durations for the approvals queue", () => {
    expect(duration("2026-09-23T12:00:00Z", "en", now)).toBe("2 days");
    expect(duration("2026-09-25T11:20:00Z", "ru", now)).toBe("40 минут");
  });
  it("initials", () => {
    expect(initials("Anna K.")).toBe("AK");
    expect(initials("eugene")).toBe("EU");
  });
});

describe("front matter", () => {
  const doc = "---\nparent: PAY.INV-0009\n---\n\n# Fix: refund\n\nBody\n";
  it("splits and joins without loss", () => {
    const s = splitFrontMatter(doc);
    expect(s.body).toBe("# Fix: refund\n\nBody\n");
    expect(frontMatterValue(s.front, "parent")).toBe("PAY.INV-0009");
    expect(joinFrontMatter(s.front, s.body)).toBe(doc);
  });
  it("leaves documents without front matter alone", () => {
    const s = splitFrontMatter("# Title\n");
    expect(s.front).toBeNull();
    expect(joinFrontMatter(s.front, s.body)).toBe("# Title\n");
  });
  it("normalizes the ending", () => {
    expect(normalizeEnding("a\n\n\n")).toBe("a\n");
    expect(normalizeEnding("a")).toBe("a\n");
  });
});

describe("diff hunks", () => {
  it("groups by section with context and gaps", () => {
    const lines = [
      { op: "=" as const, text: "# T", section: "T" },
      { op: "=" as const, text: "## Welcome", section: "Welcome" },
      { op: "-" as const, text: "Five steps", section: "Welcome" },
      { op: "+" as const, text: "Three steps", section: "Welcome" },
      ...Array.from({ length: 10 }, (_, i) => ({ op: "=" as const, text: `line ${i}`, section: "Welcome" })),
      { op: "+" as const, text: "tail", section: "States" },
    ];
    const h = hunks(lines);
    expect(h.map((b) => b.section)).toEqual(["T", "Welcome", "States"]);
    expect(h[1].lines).toContain(null); // gap between distant changes
  });
});

describe("template placeholders", () => {
  it("escapes placeholders outside code and restores them", () => {
    const md = "# Product: <feature title>\n\nUse `<b>` here\n\n```\n<div>\n```\n";
    const p = protectPlaceholders(md);
    expect(p).toContain("# Product: \\<feature title>");
    expect(p).toContain("`<b>`");
    expect(p).toContain("\n<div>\n");
    expect(restorePlaceholders(p)).toBe(md);
  });
});
