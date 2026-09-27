import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { keys, useDomains } from "../api/queries";
import type { FeatureSummary, List } from "../api/types";
import { errorText } from "../lib/errors";
import { Modal, Switch } from "../components/ui";

/** New feature, or a fix of a handed-off feature (then domain/system are the parent's). */
export function NewFeatureModal({ onClose, parent: initialParent }: { onClose: () => void; parent?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const domains = useDomains();
  const [domain, setDomain] = useState("");
  const [system, setSystem] = useState("");
  const [title, setTitle] = useState("");
  const [isFix, setIsFix] = useState(!!initialParent);
  const [parent, setParent] = useState(initialParent ?? "");

  const handedOff = useQuery({
    queryKey: ["features", "handed_off_all"],
    queryFn: () => api.get<List<FeatureSummary>>("/api/v1/features?domain=all&status=handed_off&limit=200"),
    enabled: isFix,
  });

  const d = domains.data?.find((x) => x.key === domain) ?? domains.data?.[0];
  const s = d?.systems.find((x) => x.key === system) ?? d?.systems[0];
  const parentFeature = handedOff.data?.items.find((f) => f.uniqueId === parent);

  const preview = useMemo(() => {
    const dd = isFix ? domains.data?.find((x) => x.key === parentFeature?.domain) : d;
    const ss = isFix ? dd?.systems.find((x) => x.key === parentFeature?.system) : s;
    if (!dd || !ss) return null;
    return `${dd.key}.${ss.key}-${String(ss.lastNumber + 1).padStart(4, "0")}`;
  }, [isFix, d, s, parentFeature, domains.data]);

  const create = useMutation({
    mutationFn: () => api.post<{ uniqueId: string }>("/api/v1/features", isFix
      ? { title, parent }
      : { domain: d?.key, system: s?.key, title }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: keys.features() });
      qc.invalidateQueries({ queryKey: keys.domains });
      onClose();
      navigate(`/features/${r.uniqueId}/product`);
    },
  });

  const valid = title.trim() && (isFix ? !!parent : !!(d && s));
  return (
    <Modal title={t("newFeature.title")} onClose={onClose} footer={
      <>
        <button className="btn ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn primary" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? t("newFeature.creating") : isFix ? t("newFeature.createFix") : t("newFeature.create")}
        </button>
      </>
    }>
      <form onSubmit={(e) => { e.preventDefault(); if (valid) create.mutate(); }}>
        {!isFix && (
          <div className="two">
            <div className="field">
              <label htmlFor="nf-domain">{t("newFeature.domain")}</label>
              <select id="nf-domain" className="inp" value={d?.key ?? ""} onChange={(e) => { setDomain(e.target.value); setSystem(""); }}>
                {domains.data?.map((x) => <option key={x.key} value={x.key}>{x.key} — {x.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nf-system">{t("newFeature.system")}</label>
              <select id="nf-system" className="inp" value={s?.key ?? ""} onChange={(e) => setSystem(e.target.value)} disabled={!d?.systems.length}>
                {d?.systems.map((x) => <option key={x.key} value={x.key}>{x.key} — {x.name}</option>)}
              </select>
            </div>
          </div>
        )}
        {domains.data?.length === 0 && <div className="banner warn">{t("newFeature.noDictionary")}</div>}
        <div className="field">
          <label htmlFor="nf-title">{t("newFeature.name")}</label>
          <input id="nf-title" className="inp" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Switch on={isFix} onChange={setIsFix} label={t("newFeature.isFix")} />
        </div>
        {isFix && (
          <div className="field">
            <label htmlFor="nf-parent">{t("newFeature.parent")}</label>
            <select id="nf-parent" className="inp" value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">{t("newFeature.chooseParent")}</option>
              {handedOff.data?.items.map((f) => <option key={f.uniqueId} value={f.uniqueId}>{f.uniqueId} {f.title}</option>)}
            </select>
            <div className="hint">{t("newFeature.parentHint")}</div>
          </div>
        )}
        {preview && (
          <div className="preview-id">
            {t("newFeature.preview", { id: preview })}
          </div>
        )}
        {create.error && <div className="err-text">{errorText(t, create.error)}</div>}
      </form>
    </Modal>
  );
}
