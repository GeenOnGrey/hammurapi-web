import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError, api } from "../api/client";
import { invalidateFeature, keys, useFeature } from "../api/queries";
import { AREAS, type Area, type FeatureCard, type Gate, type HistoryItem, type List } from "../api/types";
import { useChatContext, useSession } from "../app/session";
import { DocumentPane } from "../editor/DocumentPane";
import { errorText } from "../lib/errors";
import { dateTime, relativeTime, shortSha } from "../lib/format";
import { Icon } from "../components/Icon";
import { Avatar, Empty, Loading, Modal, StatusBadge, useOutside, useToast } from "../components/ui";
import { NewFeatureModal } from "./NewFeature";

export function FeaturePage() {
  const { t } = useTranslation();
  const { uniqueId = "", area: areaParam } = useParams();
  const feature = useFeature(uniqueId);
  const chat = useChatContext();
  const f = feature.data;
  const area = (areaParam && AREAS.includes(areaParam as Area) ? areaParam : f?.gates[0]?.area) as Area | undefined;

  // Opening a feature switches the chat to specification mode for it (CHAT-01).
  useEffect(() => {
    if (f) chat.setFeature({ uniqueId: f.uniqueId, title: f.title }, area ?? null);
  }, [f?.uniqueId, f?.title, area]); // eslint-disable-line react-hooks/exhaustive-deps

  if (feature.isLoading) return <main className="main"><Loading /></main>;
  if (feature.error instanceof ApiError && feature.error.status === 410) return <DeletedFeature error={feature.error} />;
  if (feature.error || !f) {
    return (
      <main className="main">
        <Empty icon="alert" title={t("feature.notFound", { id: uniqueId })}>
          <div className="acts"><Link className="btn sm" to="/">{t("common.home")}</Link></div>
        </Empty>
      </main>
    );
  }
  return <FeatureView f={f} area={area} />;
}

function DeletedFeature({ error }: { error: ApiError }) {
  const { t, i18n } = useTranslation();
  const at = error.details.deletedAt ? dateTime(String(error.details.deletedAt), i18n.language) : "";
  return (
    <main className="main">
      <div className="empty" style={{ padding: "70px 20px" }}>
        <div className="ic"><Icon name="trash" /></div>
        <b>{t("feature.deletedTitle", { id: String(error.details.uniqueId ?? "") })}</b>
        {t("feature.deletedText", { name: String(error.details.deletedBy ?? "—"), at })}
        <div className="acts"><Link className="btn sm" to="/">{t("common.home")}</Link></div>
      </div>
    </main>
  );
}

type Dialog =
  | { kind: "history"; area: Area }
  | { kind: "deleteGate"; area: Area }
  | { kind: "deleteFeature" }
  | { kind: "handoff" }
  | { kind: "fix" }
  | null;

function FeatureView({ f, area }: { f: FeatureCard; area?: Area }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = useSession();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useOutside<HTMLDivElement>(menu, () => setMenu(false));
  const gate = f.gates.find((g) => g.area === area);
  const handedOff = f.status === "handed_off";

  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: Record<string, unknown> }) => api.post(`/api/v1/features/${f.uniqueId}${path}`, body),
    onSuccess: () => invalidateFeature(qc, f.uniqueId),
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });

  const addGate = (a: Area) =>
    act.mutate({ path: "/gates", body: { area: a } }, { onSuccess: () => navigate(`/features/${f.uniqueId}/${a}`) });

  return (
    <main className="main">
      <div className="crumbs">
        <Link to="/" aria-label={t("common.back")}><Icon name="back" size={16} /></Link>
        {f.domain} / {f.system} / <span className="fid">{f.uniqueId}</span>
        {f.parent && <span className="tag-fix">fix</span>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <h1 className="ftitle" style={{ flex: 1 }}>{f.title}</h1>
        {f.permissions.delete && (
          <div style={{ position: "relative" }} ref={menuRef}>
            <button className="iconbtn" aria-label={t("feature.actions")} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              <Icon name="dots" />
            </button>
            {menu && (
              <div className="pop" style={{ right: 0, top: 38 }}>
                <button className="danger" onClick={() => { setMenu(false); setDialog({ kind: "deleteFeature" }); }}>
                  <Icon name="trash" size={16} />{t("feature.deleteFeature")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="meta">
        <span>{t("feature.createdBy", { name: f.createdBy, when: relativeTime(f.createdAt, i18n.language) })}</span>
        <a href={f.pr.url} target="_blank" rel="noreferrer"><Icon name="branch" size={14} />{t("feature.pr", { n: f.pr.number })}</a>
        {f.parent && <span>{t("feature.fixOf")} <Link to={`/features/${f.parent}`}>{f.parent}</Link></span>}
        {f.fixes.length > 0 && (
          <span>{t("feature.fixes")} {f.fixes.map((x, i) => <span key={x.uniqueId}>{i > 0 && ", "}<Link to={`/features/${x.uniqueId}`}>{x.uniqueId}</Link></span>)}</span>
        )}
      </div>

      {handedOff && (
        <div className="banner info" style={{ marginTop: 14 }}>
          <Icon name="check" />
          <span className="grow">
            <b>{t("feature.handedOff", { name: f.handedOffBy ?? "", when: f.handedOffAt ? dateTime(f.handedOffAt, i18n.language) : "" })}</b>{" "}
            {f.handedOffWithoutApproval && t("feature.withoutApproval")} {t("feature.readOnlyFix")}
          </span>
          {has("editor", "product") && <button className="btn sm" onClick={() => setDialog({ kind: "fix" })}>{t("feature.createFix")}</button>}
        </div>
      )}

      <GateStrip f={f} current={area} onDialog={setDialog} onAdd={addGate} busy={act.isPending} />

      {gate && !handedOff && (
        <ActionBar f={f} gate={gate}
          onSubmit={() => act.mutate({ path: `/gates/${gate.area}/submit` }, { onSuccess: () => toast({ kind: "ok", title: t("feature.submitted") }) })}
          onApprove={() => act.mutate({ path: `/gates/${gate.area}/approve` }, { onSuccess: () => toast({ kind: "ok", title: t("feature.approved") }) })}
          onHistory={() => setDialog({ kind: "history", area: gate.area })}
          busy={act.isPending} />
      )}
      {gate && handedOff && (
        <div className="actionbar">
          <span className="grow" />
          <button className="btn sm" onClick={() => setDialog({ kind: "history", area: gate.area })}>{t("feature.history")}</button>
        </div>
      )}

      {area && gate ? <DocumentPane key={`${f.uniqueId}-${area}`} feature={f} area={area} /> : (
        <Empty icon="files" title={t("feature.noGate")} />
      )}

      {dialog?.kind === "history" && <HistoryModal f={f} area={dialog.area} onClose={() => setDialog(null)} />}
      {dialog?.kind === "deleteGate" && <DeleteGateModal f={f} area={dialog.area} onClose={() => setDialog(null)} />}
      {dialog?.kind === "deleteFeature" && <DeleteFeatureModal f={f} onClose={() => setDialog(null)} />}
      {dialog?.kind === "handoff" && <HandoffModal f={f} onClose={() => setDialog(null)} />}
      {dialog?.kind === "fix" && <NewFeatureModal parent={f.uniqueId} onClose={() => setDialog(null)} />}
    </main>
  );
}

// ─── Gate strip ────────────────────────────────────────────────────

function GateStrip({ f, current, onDialog, onAdd, busy }: {
  f: FeatureCard; current?: Area; onDialog: (d: Dialog) => void; onAdd: (a: Area) => void; busy: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuFor, setMenuFor] = useState<Area | null>(null);
  const ref = useOutside<HTMLOListElement>(menuFor !== null, () => setMenuFor(null));
  const byArea = new Map(f.gates.map((g) => [g.area, g]));
  const handedOff = f.status === "handed_off";
  const allApproved = f.gates.every((g) => g.status === "approved");
  let n = 0;

  return (
    <ol className="gates" ref={ref} aria-label={t("feature.gates")}>
      {AREAS.map((a) => {
        const g = byArea.get(a);
        if (!g) {
          if (!f.permissions.addGate.includes(a)) return null;
          return (
            <li key={a} className="add">
              <button className="btn ghost sm" style={{ width: "100%", height: "100%" }} disabled={busy} onClick={() => onAdd(a)}>
                <Icon name="plus" size={14} />{t(`areas.${a}`)}
              </button>
            </li>
          );
        }
        n++;
        return (
          <li key={a} className={`pick${current === a ? " cur" : ""}`} onClick={() => navigate(`/features/${f.uniqueId}/${a}`)}
            aria-current={current === a ? "step" : undefined}>
            <div className="n">{n}</div>
            <div className="a">{t(`areas.${a}`)}</div>
            <StatusBadge status={g.status} approvalRequired={f.approvalRequired} />
            <button className="iconbtn more" aria-label={t("feature.gateActions", { area: t(`areas.${a}`) })}
              onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === a ? null : a); }}>
              <Icon name="dots" size={15} />
            </button>
            {menuFor === a && (
              <div className="pop" style={{ top: 36, right: 0 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setMenuFor(null); onDialog({ kind: "history", area: a }); }}>{t("feature.history")}</button>
                <Link to={`/features/${f.uniqueId}/${a}/diff`} onClick={() => setMenuFor(null)}>{t("feature.changes")}</Link>
                {!handedOff && f.permissions.deleteGate.includes(a) && (
                  <button className="danger" onClick={() => { setMenuFor(null); onDialog({ kind: "deleteGate", area: a }); }}>
                    <Icon name="trash" size={16} />{t("feature.deleteSpec")}
                  </button>
                )}
                {!handedOff && f.gates.length === 1 && f.permissions.delete && (
                  <button className="danger" onClick={() => { setMenuFor(null); onDialog({ kind: "deleteFeature" }); }}>
                    <Icon name="trash" size={16} />{t("feature.deleteFeature")}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
      {/* Final step: same size as a gate; dashed while inactive (design spec §3.9). */}
      {handedOff ? (
        <li className="final done">
          <div className="n">{t("feature.finalStep")}</div>
          <div className="a">{t("feature.handedOffShort")}</div>
          <span className="st handed_off">{t("status.handed_off")}</span>
        </li>
      ) : f.permissions.handoff ? (
        <li className="final">
          <div className="n">{f.approvalRequired ? t("feature.allApproved") : t("feature.approvalOff")}</div>
          <button className="go" onClick={() => onDialog({ kind: "handoff" })}>{t("feature.handoff")}</button>
        </li>
      ) : (
        <li className="final off">
          <div className="n">{t("feature.finalStep")}</div>
          <div className="a">{t("feature.handoff")}</div>
          <span className="small muted">{f.approvalRequired && !allApproved ? t("feature.afterApproval") : t("feature.noHandoffRole")}</span>
        </li>
      )}
    </ol>
  );
}

// ─── Action bar ────────────────────────────────────────────────────

function ActionBar({ f, gate, onSubmit, onApprove, onHistory, busy }: {
  f: FeatureCard; gate: Gate; onSubmit: () => void; onApprove: () => void; onHistory: () => void; busy: boolean;
}) {
  const { t, i18n } = useTranslation();
  const canSubmit = f.permissions.submit.includes(gate.area);
  const canApprove = f.permissions.approve.includes(gate.area);
  let text: React.ReactNode;
  if (!f.approvalRequired) text = t("feature.bar.noApproval");
  else if (gate.status === "in_review") text = t("feature.bar.inReview", { when: gate.submittedAt ? relativeTime(gate.submittedAt, i18n.language) : "" });
  else if (gate.status === "approved") text = t("feature.bar.approved", { name: gate.approvedBy ?? "", when: gate.approvedAt ? relativeTime(gate.approvedAt, i18n.language) : "" });
  else if (gate.approvedCommit) text = t("feature.bar.draftAfterApproval");
  else text = t("feature.bar.draft");
  return (
    <div className="actionbar">
      <StatusBadge status={gate.status} approvalRequired={f.approvalRequired} />
      <span className="grow">{text}</span>
      <Link className="btn sm" to={`/features/${f.uniqueId}/${gate.area}/diff`}>{t("feature.viewChanges")}</Link>
      <button className="btn sm" onClick={onHistory}>{t("feature.history")}</button>
      {canSubmit && <button className="btn primary sm" disabled={busy} onClick={onSubmit}>{t("feature.submit")}</button>}
      {canApprove && <button className="btn ok sm" disabled={busy} onClick={onApprove}><Icon name="check" size={15} />{t("feature.approve")}</button>}
    </div>
  );
}

// ─── Dialogs ───────────────────────────────────────────────────────

function HistoryModal({ f, area, onClose }: { f: FeatureCard; area: Area; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const hist = useQuery({
    queryKey: keys.history(f.uniqueId, area),
    queryFn: () => api.get<List<HistoryItem>>(`/api/v1/features/${f.uniqueId}/gates/${area}/history?limit=100`),
  });
  return (
    <Modal title={t("history.title", { area: t(`areas.${area}`) })} onClose={onClose} wide
      footer={<button className="btn" onClick={onClose}>{t("common.close")}</button>}>
      {hist.isLoading && <Loading />}
      {hist.data?.items.length === 0 && <p className="muted">{t("history.empty")}</p>}
      <div className="hist">
        {hist.data?.items.map((h) => (
          <div className="h" key={h.id}>
            <Avatar small agent={h.isAgent} name={h.isAgent ? "A" : h.actor ?? "?"} />
            <div>
              {h.isAgent ? t("history.byAgent", { name: h.actor ?? "" }) : h.actor ?? t("history.unknown")}: {t(`history.events.${h.type}`)}
              <div className="muted">{relativeTime(h.createdAt, i18n.language)}</div>
            </div>
            {h.commit && h.commitUrl ? <a className="sha" href={h.commitUrl} target="_blank" rel="noreferrer">{shortSha(h.commit)}</a> : <span />}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function DeleteGateModal({ f, area, onClose }: { f: FeatureCard; area: Area; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useMutation({
    mutationFn: () => api.del(`/api/v1/features/${f.uniqueId}/gates/${area}`),
    onSuccess: () => {
      invalidateFeature(qc, f.uniqueId);
      qc.invalidateQueries({ queryKey: keys.approvals });
      onClose();
      navigate(`/features/${f.uniqueId}`);
    },
  });
  return (
    <Modal title={t("deleteGate.title", { area: t(`areas.${area}`) })} onClose={onClose} footer={
      <>
        <button className="btn ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn danger-fill" disabled={del.isPending} onClick={() => del.mutate()}>{t("deleteGate.confirm")}</button>
      </>
    }>
      <p className="t2" style={{ margin: 0 }}>
        {t("deleteGate.text", { folder: `${area}/`, id: f.uniqueId })}
      </p>
      {del.error && <div className="err-text">{errorText(t, del.error)}</div>}
    </Modal>
  );
}

function DeleteFeatureModal({ f, onClose }: { f: FeatureCard; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const del = useMutation({
    mutationFn: () => api.del(`/api/v1/features/${f.uniqueId}`, { confirmUniqueId: confirm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.features() });
      qc.invalidateQueries({ queryKey: keys.feature(f.uniqueId) });
      onClose();
    },
  });
  return (
    <Modal title={t("deleteFeature.title")} onClose={onClose} footer={
      <>
        <button className="btn ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn danger-fill" disabled={confirm !== f.uniqueId || del.isPending} onClick={() => del.mutate()}>
          <Icon name="trash" size={15} />{t("deleteFeature.confirm")}
        </button>
      </>
    }>
      <p className="t2" style={{ margin: "0 0 12px" }}>{t("deleteFeature.text", { pr: f.pr.number, id: f.uniqueId })}</p>
      <div className="field">
        <label htmlFor="del-confirm">{t("deleteFeature.typeId")}</label>
        <input id="del-confirm" className="inp mono" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={f.uniqueId} autoComplete="off" />
      </div>
      {del.error && <div className="err-text">{errorText(t, del.error)}</div>}
    </Modal>
  );
}

function HandoffModal({ f, onClose }: { f: FeatureCard; onClose: () => void }) {
  const { t } = useTranslation();
  const { config } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const go = useMutation({
    mutationFn: () => api.post(`/api/v1/features/${f.uniqueId}/handoff`),
    onSuccess: () => {
      invalidateFeature(qc, f.uniqueId);
      toast({ kind: "ok", title: t("handoff.done") });
      onClose();
    },
  });
  return (
    <Modal title={t("handoff.title", { id: f.uniqueId })} onClose={onClose} footer={
      <>
        <button className="btn ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn primary" disabled={go.isPending} onClick={() => go.mutate()}>{t("feature.handoff")}</button>
      </>
    }>
      <p className="t2" style={{ margin: "0 0 8px" }}>{t("handoff.text", { pr: f.pr.number, branch: config.defaultBranch })}</p>
      {!f.approvalRequired && <div className="banner warn">{t("handoff.withoutApproval")}</div>}
      {go.error && <div className="err-text">{errorText(t, go.error)}</div>}
    </Modal>
  );
}
