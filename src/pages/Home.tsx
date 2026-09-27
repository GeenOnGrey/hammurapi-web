import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApprovals, useDomains, useFeatures } from "../api/queries";
import { AREAS, type FeatureSummary } from "../api/types";
import { useChatContext, useSession } from "../app/session";
import { duration } from "../lib/format";
import { Icon } from "../components/Icon";
import { Empty, Loading } from "../components/ui";
import { NewFeatureModal } from "./NewFeature";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { hasRole, has } = useSession();
  const chat = useChatContext();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const domain = params.get("domain") ?? "mine";
  const status = params.get("status") ?? "in_progress";
  const q = params.get("q") ?? "";
  const isApprover = hasRole("approver");
  const approvals = useApprovals(isApprover);
  const domains = useDomains();
  const features = useFeatures({ domain, status, q });

  // On the home page the chat answers general questions.
  useEffect(() => chat.setFeature(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  const groups = useMemo(() => {
    const m = new Map<string, FeatureSummary[]>();
    for (const f of features.data?.items ?? []) {
      const k = `${f.domain} / ${f.system}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [features.data]);

  return (
    <main className="main">
      {isApprover && (
        <section className={`approvals${approvals.data?.items.length === 0 ? " empty-ok" : ""}`} aria-labelledby="approvals-h">
          <div className="head">
            <h2 className="sec" id="approvals-h" style={{ margin: 0 }}>
              {t("home.awaiting")}
              {!!approvals.data?.items.length && <span className="count">{approvals.data.items.length}</span>}
            </h2>
          </div>
          {approvals.isLoading && <Loading />}
          {approvals.data?.items.length === 0 && (
            <div className="empty">
              <div className="ic"><Icon name="check" /></div>
              <b>{t("home.allApproved")}</b>
              {t("home.allApprovedHint")}
            </div>
          )}
          {approvals.data?.items.map((a) => (
            <Link key={`${a.uniqueId}-${a.area}`} className="it" to={`/features/${a.uniqueId}/${a.area}`}>
              <span><span className="fid">{a.uniqueId}</span></span>
              <span>{a.title}</span>
              <span className="small t2">{t(`areas.${a.area}`)}</span>
              <span className="small t2">{a.submittedBy ?? ""}</span>
              <span className="small muted"><Icon name="clock" size={14} /> {duration(a.submittedAt, i18n.language)}</span>
            </Link>
          ))}
        </section>
      )}

      <div className="filters">
        <div className="chips" role="group" aria-label={t("home.domains")}>
          <span className="lbl">{t("home.domains")}</span>
          {["mine", "all"].map((d) => (
            <button key={d} className={`chip${domain === d ? " on" : ""}`} onClick={() => setFilter("domain", d)}>{t(`home.domain.${d}`)}</button>
          ))}
          {domains.data?.map((d) => (
            <button key={d.key} className={`chip${domain === d.key ? " on" : ""}`} onClick={() => setFilter("domain", d.key)} title={d.name}>{d.key}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label={t("home.status")}>
          <span className="lbl">{t("home.status")}</span>
          {["in_progress", "handed_off", "all"].map((s) => (
            <button key={s} className={`chip${status === s ? " on" : ""}`} onClick={() => setFilter("status", s)}>{t(`home.statusFilter.${s}`)}</button>
          ))}
        </div>
        {q && (
          <span className="chip on">
            {t("home.searching", { q })}
            <button className="iconbtn" style={{ width: 18, height: 18 }} aria-label={t("common.clear")}
              onClick={() => { const n = new URLSearchParams(params); n.delete("q"); setParams(n); }}>
              <Icon name="x" size={12} />
            </button>
          </span>
        )}
      </div>

      {features.isLoading && <Loading />}
      {features.data?.items.length === 0 && (
        <Empty icon="grid" title={domain === "mine" && status === "in_progress" && !q ? t("home.emptyMine") : t("home.emptyFiltered")}>
          {t("home.emptyHint")}
          <div className="acts">
            <button className="btn sm" onClick={() => { const n = new URLSearchParams(); n.set("domain", "all"); setParams(n); }}>{t("home.showAll")}</button>
            {has("editor", "product") && (
              <button className="btn primary sm" onClick={() => setCreating(true)}><Icon name="plus" />{t("top.newFeature")}</button>
            )}
          </div>
        </Empty>
      )}
      {groups.map(([group, items]) => (
        <section key={group}>
          <h3 className="group-h">{group}</h3>
          {items.map((f) => <FeatureRow key={f.uniqueId} f={f} />)}
        </section>
      ))}
      {creating && <NewFeatureModal onClose={() => setCreating(false)} />}
    </main>
  );
}

function FeatureRow({ f }: { f: FeatureSummary }) {
  const { t } = useTranslation();
  // The row shows the first gate that is not approved: that is where the work is.
  const current = f.gates.find((g) => g.status !== "approved") ?? f.gates[f.gates.length - 1];
  let summary: React.ReactNode = null;
  if (f.status === "handed_off") summary = <span className="st handed_off">{t("status.handed_off")}</span>;
  else if (current) {
    const cls = f.approvalRequired ? current.status : "none";
    const status = f.approvalRequired ? t(`status.${current.status}`) : t("status.none");
    summary = <span className={`st ${cls}`}>{t("home.gateStatus", { area: t(`areas.${current.area}`), status })}</span>;
  }
  const byArea = new Map(f.gates.map((g) => [g.area, g]));
  return (
    <Link className="frow" to={`/features/${f.uniqueId}`}>
      <span><span className="fid">{f.uniqueId}</span></span>
      <span className="title"><span>{f.title}</span>{f.parent && <span className="tag-fix">fix</span>}</span>
      <span>{summary}</span>
      <span className="minigates" aria-hidden="true">
        {AREAS.filter((a) => byArea.has(a)).map((a) => <i key={a} className={f.approvalRequired ? byArea.get(a)!.status : "draft"} />)}
      </span>
    </Link>
  );
}
