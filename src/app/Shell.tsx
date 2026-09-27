import { useState } from "react";
import { Link, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/ui";
import { ChatPanel } from "../chat/ChatPanel";
import { NewFeatureModal } from "../pages/NewFeature";
import { ImportUploadModal } from "../pages/Import";
import { ProfileMenu } from "./ProfileMenu";
import { useChatContext, useSession } from "./session";

export function Shell() {
  const { t } = useTranslation();
  const { me, has, hasRole, profile } = useSession();
  const chat = useChatContext();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [menu, setMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}&domain=all&status=all` : "/");
  };

  return (
    <div className="app">
      <div className="topbar">
        <Link to="/" className="brand">
          <img src="/logo.png" alt="" />
          <span className="hide-m">Hammurapi</span>
        </Link>
        <form className="search" role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("top.search")} aria-label={t("top.search")} />
        </form>
        <div className="top-actions">
          {hasRole("editor") && (
            <button className="btn sm" onClick={() => setImporting(true)}>
              <Icon name="upload" />
              <span className="hide-m">{t("top.import")}</span>
            </button>
          )}
          {has("editor", "product") && (
            <button className="btn primary sm" onClick={() => setCreating(true)}>
              <Icon name="plus" />
              <span className="hide-m">{t("top.newFeature")}</span>
            </button>
          )}
          <button className="avatar" style={menu ? { boxShadow: "0 0 0 2px var(--violet)" } : undefined}
            onClick={() => setMenu((v) => !v)} aria-label={t("profile.title")} aria-expanded={menu}>
            <Avatar name={me.displayName} url={me.avatarUrl} />
          </button>
        </div>
        {menu && <ProfileMenu onClose={() => setMenu(false)} />}
      </div>
      <div className="body">
        <Outlet />
        <ChatPanel />
      </div>
      {!chat.open && (
        <button className="btn primary chat-fab" onClick={() => chat.setOpen(true)}>
          <Icon name="msg" />
          {profile.agentName}
        </button>
      )}
      {creating && <NewFeatureModal onClose={() => setCreating(false)} />}
      {importing && <ImportUploadModal onClose={() => setImporting(false)} />}
    </div>
  );
}
