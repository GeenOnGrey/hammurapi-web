import { useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../../app/session";
import { Icon } from "../../components/Icon";
import { Empty } from "../../components/ui";
import { UsersAdmin } from "./Users";
import { DomainsAdmin } from "./Domains";
import { RulesAdmin } from "./Rules";
import { SettingsAdmin } from "./Settings";
import { ServicesAdmin } from "./Services";
import { CycleAdmin } from "./Cycle";
import { DeployAdmin } from "./Deploy";
import { MetricSourcesAdmin } from "./MetricSources";
import {
  AgentConnectionsAdmin,
  AgentMCPAdmin,
  AgentModelsAdmin,
  AgentSkillsAdmin,
  AgentUsageAdmin,
} from "./Agent";
import { adminPath } from "./paths";

/** Section access (product spec §17): users and settings — global admin;
 * domains — any admin; rules — area admins (global admin reads); the agent
 * (FTR.HMR.CMN-0004) — global admin. */
export function AdminPage() {
  const { t } = useTranslation();
  const { me, isAnyAdmin } = useSession();
  // The Agent group is open on its own pages; a click folds or unfolds it.
  const onAgent = useLocation().pathname.startsWith("/admin/agent/");
  const [toggled, setToggled] = useState<boolean | null>(null);
  const agentOpen = toggled ?? onAgent;
  const setAgentOpen = (f: (v: boolean) => boolean) => setToggled(f(agentOpen));
  if (!isAnyAdmin) {
    return (
      <main className="main">
        <Empty icon="lock" title={t("admin.noAccess")} />
      </main>
    );
  }
  const global = me.globalAdmin;
  return (
    <div className="admin" style={{ overflow: "hidden" }}>
      <nav className="side" aria-label={t("admin.title")}>
        <div className="lab">{t("admin.title")}</div>
        {global && (
          <NavLink to={adminPath("users")}>
            <Icon name="users" />
            {t("admin.users.title")}
          </NavLink>
        )}
        <NavLink to={adminPath("domains")}>
          <Icon name="grid" />
          {t("admin.domains.title")}
        </NavLink>
        <NavLink to={adminPath("services")}>
          <Icon name="server" />
          {t("admin.services.title")}
        </NavLink>
        <NavLink to={adminPath("rules")}>
          <Icon name="book" />
          {t("admin.rules.title")}
        </NavLink>
        {global && (
          <NavLink to={adminPath("cycle")}>
            <Icon name="refresh" />
            {t("admin.cycle.title")}
          </NavLink>
        )}
        {global && (
          <NavLink to={adminPath("deploy")}>
            <Icon name="rocket" />
            {t("admin.deploy.title")}
          </NavLink>
        )}
        {global && (
          <NavLink to={adminPath("metrics")}>
            <Icon name="target" />
            {t("admin.metrics.title")}
          </NavLink>
        )}
        {global && (
          <NavLink to={adminPath("settings")}>
            <Icon name="wrench" />
            {t("admin.settings.title")}
          </NavLink>
        )}
        {global && (
          <>
            <button type="button" className="sidegroup" aria-expanded={agentOpen} onClick={() => setAgentOpen((v) => !v)}>
              <Icon name="cpu" />
              {t("admin.agent.title")}
              <span className={`chev${agentOpen ? " open" : ""}`} aria-hidden>›</span>
            </button>
            {agentOpen && (
              <>
              <NavLink className="sub" to={adminPath("agent/connections")}>
                {t("admin.agent.connections.title")}
              </NavLink>
              <NavLink className="sub" to={adminPath("agent/models")}>
                {t("admin.agent.models.title")}
              </NavLink>
              <NavLink className="sub" to={adminPath("agent/skills")}>
                {t("admin.agent.skills.title")}
              </NavLink>
              <NavLink className="sub" to={adminPath("agent/mcp")}>
                {t("admin.agent.mcp.title")}
              </NavLink>
              <NavLink className="sub" to={adminPath("agent/usage")}>
                {t("admin.agent.usage.title")}
              </NavLink>
              </>
            )}
          </>
        )}
      </nav>
      <main className="main">
        <Routes>
          <Route
            index
            element={
              <Navigate to={adminPath(global ? "users" : "domains")} replace />
            }
          />
          {global && <Route path="users" element={<UsersAdmin />} />}
          <Route path="domains" element={<DomainsAdmin />} />
          <Route path="services" element={<ServicesAdmin />} />
          <Route path="rules" element={<RulesAdmin />} />
          {global && <Route path="cycle" element={<CycleAdmin />} />}
          {global && <Route path="deploy" element={<DeployAdmin />} />}
          {global && <Route path="metrics" element={<MetricSourcesAdmin />} />}
          {global && <Route path="settings" element={<SettingsAdmin />} />}
          {global && (
            <Route
              path="agent/connections"
              element={<AgentConnectionsAdmin />}
            />
          )}
          {global && (
            <Route path="agent/models" element={<AgentModelsAdmin />} />
          )}
          {global && (
            <Route path="agent/skills" element={<AgentSkillsAdmin />} />
          )}
          {global && <Route path="agent/mcp" element={<AgentMCPAdmin />} />}
          {global && <Route path="agent/usage" element={<AgentUsageAdmin />} />}
          {/* Unknown or unavailable section — the first available one (not ".": in a
              splat route it resolves to the current URL itself). */}
          <Route
            path="*"
            element={
              <Navigate to={adminPath(global ? "users" : "domains")} replace />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
