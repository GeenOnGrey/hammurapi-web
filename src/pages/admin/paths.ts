/** Admin sections; links use absolute paths: React Router 7 resolves relative
 * links in the `admin/*` splat route against the whole URL, so "domains" from
 * /admin/users would lead to /admin/users/domains. */
export const ADMIN_SECTIONS = ["users", "domains", "services", "rules", "cycle", "deploy", "metrics", "settings"] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const adminPath = (s: AdminSection) => `/admin/${s}`;
