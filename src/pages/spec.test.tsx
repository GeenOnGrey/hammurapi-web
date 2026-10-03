import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { highlight, stripFrontMatter } from "./Spec";
import { STAGES } from "../app/Shell";
import { createI18n } from "../lib/i18n";

describe("specification navigator (FTR.HMR.CMN-0005)", () => {
  // SRC-05: a fragment with <script> is shown as text; matches become <mark>.
  it("highlights matches without rendering markup", () => {
    const html = renderToString(
      <p>{highlight("before ‹отмена› <script>alert(1)</script> ‹брони›")}</p>,
    );
    expect(html).toContain("<mark>отмена</mark>");
    expect(html).toContain("<mark>брони</mark>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("strips the YAML front matter for the editor", () => {
    expect(stripFrontMatter("---\nparent: FTR.A.B-0001\n---\n# Title\n")).toBe(
      "# Title\n",
    );
    expect(stripFrontMatter("# No front matter\n")).toBe("# No front matter\n");
  });

  // NAV-01: General, Specification, Discovery, Development, Delivery.
  it("puts Specification before Discovery in the menu", () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      "general",
      "spec",
      "research",
      "development",
      "delivery",
    ]);
    const ru = createI18n("ru").t;
    const en = createI18n("en").t;
    expect(STAGES.map((s) => ru(`stages.${s.key}`))).toEqual([
      "Общее",
      "Спецификация",
      "Исследование",
      "Разработка",
      "Доставка",
    ]);
    expect(STAGES.map((s) => en(`stages.${s.key}`))).toEqual([
      "General",
      "Specification",
      "Discovery",
      "Development",
      "Delivery",
    ]);
  });
});
