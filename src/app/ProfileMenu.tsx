import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { keys, useDomains } from "../api/queries";
import type { Profile, Tone } from "../api/types";
import { LANGUAGES, LANGUAGE_NAMES, setDocumentLanguage } from "../lib/i18n";
import { errorText } from "../lib/errors";
import { Icon } from "../components/Icon";
import { Avatar, Modal, useOutside, useToast } from "../components/ui";
import { useSession } from "./session";

const TONES: Tone[] = ["business", "friendly", "concise", "mentor"];

export function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { me, profile, isAnyAdmin } = useSession();
  const domains = useDomains();
  const qc = useQueryClient();
  const toast = useToast();
  const [agentName, setAgentName] = useState(profile.agentName);
  const [feedback, setFeedback] = useState(false);
  const close = useCallback(() => !feedback && onClose(), [feedback, onClose]);
  const ref = useOutside<HTMLDivElement>(true, close);

  const patch = useMutation({
    mutationFn: (p: Partial<Profile>) => api.patch<Profile>("/api/v1/profile", p),
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p);
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.features() });
    },
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });

  const setLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setDocumentLanguage(lng);
    patch.mutate({ language: lng });
  };

  const toggleDomain = (key: string) => {
    const set = new Set(profile.domains);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    patch.mutate({ domains: [...set] });
  };

  const logout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      qc.clear();
      window.location.href = "/login";
    }
  };

  const roleSummary = me.roles.map((r) => `${t(`roles.${r.role}`)}: ${r.areas.map((a) => t(`areas.${a}`)).join(", ")}`).join("; ");

  return (
    <div className="menu" ref={ref} role="dialog" aria-label={t("profile.title")}>
      <div className="sec">
        <div className="line" style={{ justifyContent: "flex-start", gap: 10 }}>
          <Avatar name={me.displayName} url={me.avatarUrl} />
          <div>
            <b>{me.displayName}</b>
            <div className="small muted">
              {me.globalAdmin && <>{t("roles.globalAdmin")}{roleSummary ? "; " : ""}</>}
              {roleSummary || (!me.globalAdmin && t("roles.readerOnly"))}
            </div>
          </div>
        </div>
      </div>
      <div className="sec">
        <div className="lab">{t("profile.language")}</div>
        <div className="chips">
          {LANGUAGES.map((l) => (
            <button key={l} className={`chip${profile.language === l ? " on" : ""}`} lang={l} onClick={() => setLanguage(l)}>
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
        <div className="line" style={{ marginTop: 12 }}>
          <span>{t("profile.theme")}</span>
          <span className="mini-seg">
            {(["light", "dark"] as const).map((th) => (
              <button key={th} className={profile.theme === th ? "on" : ""} onClick={() => patch.mutate({ theme: th })}>
                {t(`profile.themes.${th}`)}
              </button>
            ))}
          </span>
        </div>
      </div>
      <div className="sec">
        <div className="lab">{t("profile.myDomains")}</div>
        <div className="chips">
          {domains.data?.map((d) => (
            <button key={d.key} className={`chip${profile.domains.includes(d.key) ? " on" : ""}`} onClick={() => toggleDomain(d.key)} title={d.name}>
              {d.key}
            </button>
          ))}
          {domains.data?.length === 0 && <span className="small muted">{t("profile.noDomains")}</span>}
        </div>
      </div>
      <div className="sec">
        <div className="lab">{t("profile.agent")}</div>
        <div className="field" style={{ marginBottom: 10 }}>
          <input className="inp" value={agentName} maxLength={40} aria-label={t("profile.agentName")}
            onChange={(e) => setAgentName(e.target.value)}
            onBlur={() => agentName.trim() && agentName !== profile.agentName && patch.mutate({ agentName: agentName.trim() })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
        </div>
        <div className="chips">
          {TONES.map((tone) => (
            <button key={tone} className={`chip${profile.agentTone === tone ? " on" : ""}`} onClick={() => patch.mutate({ agentTone: tone })}>
              {t(`tones.${tone}`)}
            </button>
          ))}
        </div>
        <div className="hint">{t("profile.toneHint")}</div>
      </div>
      {isAnyAdmin && (
        <div className="sec">
          <Link className="action" to="/admin" onClick={onClose}><Icon name="wrench" />{t("profile.admin")}</Link>
        </div>
      )}
      <div className="sec">
        <button className="action" onClick={() => setFeedback(true)}><Icon name="msg" />{t("profile.feedback")}</button>
      </div>
      <div className="sec">
        <button className="action danger" onClick={logout}><Icon name="out" />{t("profile.logout")}</button>
      </div>
      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}
    </div>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const send = useMutation({ mutationFn: () => api.post<{ url: string }>("/api/v1/feedback", { text }) });
  return (
    <Modal title={t("feedback.title")} onClose={onClose} footer={send.data ? (
      <button className="btn primary" onClick={onClose}>{t("common.close")}</button>
    ) : (
      <>
        <button className="btn ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn primary" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>{t("feedback.send")}</button>
      </>
    )}>
      {send.data ? (
        <p>{t("feedback.sent")} <a href={send.data.url} target="_blank" rel="noreferrer">{send.data.url}</a></p>
      ) : (
        <>
          <p className="t2" style={{ marginTop: 0 }}>{t("feedback.hint")}</p>
          <textarea className="inp" rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label={t("feedback.title")} />
          {send.error && <div className="err-text">{errorText(t, send.error)}</div>}
        </>
      )}
    </Modal>
  );
}
