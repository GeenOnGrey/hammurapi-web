import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, NavLink, Route, Routes } from "react-router-dom";
import { ADMIN_SECTIONS, adminPath } from "./paths";

/** href of a link rendered inside the `admin/*` route at the given URL. */
function hrefAt(url: string, to: string): string {
  const html = renderToString(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="admin/*" element={<NavLink to={to}>x</NavLink>} />
      </Routes>
    </MemoryRouter>,
  );
  return /href="([^"]*)"/.exec(html)?.[1] ?? "";
}

describe("admin navigation", () => {
  // React Router 7 resolves relative links in a splat route against the whole URL:
  // from /admin/users a link "domains" leads to /admin/users/domains, which matched
  // the fallback route, and the admin content disappeared.
  it("a relative link inside admin/* goes under the current section", () => {
    expect(hrefAt("/admin/users", "domains")).toBe("/admin/users/domains");
  });

  it("section links lead to /admin/<section> from any section", () => {
    for (const from of ["/admin", "/admin/users", "/admin/rules", "/admin/users/unknown"]) {
      for (const s of ADMIN_SECTIONS) {
        expect(hrefAt(from, adminPath(s)), `${from} → ${s}`).toBe(`/admin/${s}`);
      }
    }
  });
});
