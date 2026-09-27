import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../../app/session";
import { Icon } from "../../components/Icon";
import { Empty } from "../../components/ui";
import { UsersAdmin } from "./Users";
import { DomainsAdmin } from "./Domains";
import { RulesAdmin } from "./Rules";
import { SettingsAdmin } from "./Settings";

/** Section access (product spec §17): users and settings — global admin;
 * domains — any admin; rules — area admins (global admin reads). */
export function AdminPage() {
  const { t } = useTranslation();
  const { me, isAnyAdmin } = useSession();
  if (!isAnyAdmin) {
    return <main className="main"><Empty icon="lock" title={t("admin.noAccess")} /></main>;
  }
  const global = me.globalAdmin;
  return (
    <div className="admin" style={{ overflow: "hidden" }}>
      <nav className="side" aria-label={t("admin.title")}>
        <div className="lab">{t("admin.title")}</div>
        {global && <NavLink to="users"><Icon name="users" />{t("admin.users.title")}</NavLink>}
        <NavLink to="domains"><Icon name="grid" />{t("admin.domains.title")}</NavLink>
        <NavLink to="rules"><Icon name="book" />{t("admin.rules.title")}</NavLink>
        {global && <NavLink to="settings"><Icon name="wrench" />{t("admin.settings.title")}</NavLink>}
      </nav>
      <main className="main">
        <Routes>
          <Route index element={<Navigate to={global ? "users" : "domains"} replace />} />
          {global && <Route path="users" element={<UsersAdmin />} />}
          <Route path="domains" element={<DomainsAdmin />} />
          <Route path="rules" element={<RulesAdmin />} />
          {global && <Route path="settings" element={<SettingsAdmin />} />}
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </main>
    </div>
  );
}
