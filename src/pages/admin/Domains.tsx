import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { keys } from "../../api/queries";
import type { AdminUser, DomainDTO, ExpertKind, List } from "../../api/types";
import { errorText } from "../../lib/errors";
import { Icon } from "../../components/Icon";
import { Loading, Modal, Switch, useToast } from "../../components/ui";

const KEY_RE = /^[A-Z][A-Z0-9]{1,9}$/;

export function DomainsAdmin() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<"domain" | "system" | null>(null);
  const [experts, setExperts] = useState<DomainDTO | null>(null);
  const list = useQuery({
    queryKey: keys.adminDomains,
    queryFn: () => api.get<DomainDTO[]>("/admin/api/v1/domains"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.adminDomains });
    qc.invalidateQueries({ queryKey: keys.domains });
    qc.invalidateQueries({ queryKey: keys.approvals });
    qc.invalidateQueries({ queryKey: ["feature"] });
  };
  const patch = useMutation({
    mutationFn: ({
      key,
      approvalRequired,
    }: {
      key: string;
      approvalRequired: boolean;
    }) => api.patch(`/admin/api/v1/domains/${key}`, { approvalRequired }),
    onSuccess: refresh,
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });
  const bulk = useMutation({
    mutationFn: (approvalRequired: boolean) =>
      api.put<{ changed: number }>("/admin/api/v1/domains/approval", {
        approvalRequired,
      }),
    onSuccess: (r) => {
      refresh();
      toast({
        kind: "ok",
        title: t("admin.domains.bulkDone", { count: r.changed }),
      });
    },
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });

  const managed = !!list.data?.some((d) => d.source === "backstage");
  return (
    <>
      <h1 className="ftitle" style={{ fontSize: 20 }}>
        {t("admin.domains.title")}
      </h1>
      {list.isLoading && <Loading />}
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="t">
          <thead>
            <tr>
              <th>{t("admin.domains.key")}</th>
              <th>{t("admin.domains.name")}</th>
              <th>{t("admin.domains.systems")}</th>
              <th>{t("admin.domains.experts")}</th>
              <th>{t("admin.domains.approval")}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((d) => (
              <tr key={d.key}>
                <td>
                  <span className="fid">{d.key}</span>
                  {d.source === "backstage" && (
                    <div className="small muted">
                      {t("admin.domains.fromBackstage")}
                    </div>
                  )}
                  {d.deletedInCatalog && (
                    <div className="small err-text" style={{ margin: 0 }}>
                      {t("admin.domains.deletedInCatalog")}
                    </div>
                  )}
                </td>
                <td>{d.name}</td>
                <td>
                  {d.systems.map((s) => (
                    <span
                      key={s.key}
                      className="fid"
                      title={s.name}
                      style={{
                        marginRight: 4,
                        opacity: s.deletedInCatalog ? 0.5 : 1,
                      }}
                    >
                      {s.key}
                    </span>
                  ))}
                </td>
                <td>
                  <button
                    className="btn ghost sm"
                    onClick={() => setExperts(d)}
                  >
                    <Icon name="users" size={14} />
                    {t("admin.domains.expertsCount", {
                      product: d.experts.product.length,
                      technical: d.experts.technical.length,
                    })}
                  </button>
                </td>
                <td>
                  <Switch
                    on={d.approvalRequired}
                    disabled={patch.isPending}
                    onChange={(v) =>
                      patch.mutate({ key: d.key, approvalRequired: v })
                    }
                    label={
                      <span
                        className={`small${d.approvalRequired ? "" : " muted"}`}
                      >
                        {d.approvalRequired
                          ? t("admin.domains.on")
                          : t("admin.domains.off")}
                      </span>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        {!managed && (
          <button className="btn sm" onClick={() => setDialog("domain")}>
            <Icon name="plus" size={15} />
            {t("admin.domains.addDomain")}
          </button>
        )}
        {!managed && (
          <button
            className="btn sm"
            disabled={!list.data?.length}
            onClick={() => setDialog("system")}
          >
            <Icon name="plus" size={15} />
            {t("admin.domains.addSystem")}
          </button>
        )}
        {managed && (
          <span className="small muted">{t("admin.domains.managed")}</span>
        )}
        <span className="spacer" />
        <button
          className="btn ghost sm"
          disabled={bulk.isPending}
          onClick={() => bulk.mutate(false)}
        >
          {t("admin.domains.disableAll")}
        </button>
        <button
          className="btn ghost sm"
          disabled={bulk.isPending}
          onClick={() => bulk.mutate(true)}
        >
          {t("admin.domains.enableAll")}
        </button>
      </div>
      <div className="hint">{t("admin.domains.hint")}</div>
      {experts && (
        <ExpertsModal
          d={experts}
          onClose={() => setExperts(null)}
          onDone={refresh}
        />
      )}
      {dialog === "domain" && (
        <DomainModal onClose={() => setDialog(null)} onDone={refresh} />
      )}
      {dialog === "system" && list.data && (
        <SystemModal
          domains={list.data}
          onClose={() => setDialog(null)}
          onDone={refresh}
        />
      )}
    </>
  );
}

function DomainModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [approval, setApproval] = useState(true);
  const create = useMutation({
    mutationFn: () =>
      api.post("/admin/api/v1/domains", {
        key,
        name,
        approvalRequired: approval,
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  const validKey = KEY_RE.test(key);
  return (
    <Modal
      title={t("admin.domains.addDomain")}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn primary"
            disabled={!validKey || !name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {t("common.create")}
          </button>
        </>
      }
    >
      <div className="two">
        <div className="field">
          <label htmlFor="dm-key">{t("admin.domains.key")}</label>
          <input
            id="dm-key"
            className="inp mono"
            value={key}
            maxLength={10}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="dm-name">{t("admin.domains.name")}</label>
          <input
            id="dm-name"
            className="inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="hint" style={{ marginTop: -8, marginBottom: 12 }}>
        {t("admin.domains.keyHint")}
      </div>
      <Switch
        on={approval}
        onChange={setApproval}
        label={t("admin.domains.approvalRequired")}
      />
      {create.error && (
        <div className="err-text">{errorText(t, create.error)}</div>
      )}
    </Modal>
  );
}

function SystemModal({
  domains,
  onClose,
  onDone,
}: {
  domains: DomainDTO[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [domain, setDomain] = useState(domains[0]?.key ?? "");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.post(`/admin/api/v1/domains/${domain}/systems`, { key, name }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Modal
      title={t("admin.domains.addSystem")}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn primary"
            disabled={!KEY_RE.test(key) || !name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {t("common.create")}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="sm-domain">{t("newFeature.domain")}</label>
        <select
          id="sm-domain"
          className="inp"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        >
          {domains.map((d) => (
            <option key={d.key} value={d.key}>
              {d.key} — {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="sm-key">{t("admin.domains.key")}</label>
          <input
            id="sm-key"
            className="inp mono"
            value={key}
            maxLength={10}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="sm-name">{t("admin.domains.name")}</label>
          <input
            id="sm-name"
            className="inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="hint">{t("admin.domains.keyHint")}</div>
      {create.error && (
        <div className="err-text">{errorText(t, create.error)}</div>
      )}
    </Modal>
  );
}

/** Experts of a domain by kind (HMR.CMN-0002 §5); editable with Backstage too. */
function ExpertsModal({
  d,
  onClose,
  onDone,
}: {
  d: DomainDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const users = useQuery({
    queryKey: keys.adminUsers(""),
    queryFn: () => api.get<List<AdminUser>>("/admin/api/v1/users?limit=200"),
  });
  const [sel, setSel] = useState<Record<ExpertKind, Set<string>>>(() => ({
    product: new Set(d.experts.product.map((u) => u.id)),
    technical: new Set(d.experts.technical.map((u) => u.id)),
  }));
  const toggle = (k: ExpertKind, id: string) =>
    setSel((s) => {
      const n = new Set(s[k]);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return { ...s, [k]: n };
    });
  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/api/v1/domains/${d.key}/experts`, {
        product: [...sel.product],
        technical: [...sel.technical],
      }),
    onSuccess: () => {
      onDone();
      onClose();
    },
  });
  return (
    <Modal
      wide
      title={t("admin.domains.expertsOf", { key: d.key })}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn primary"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      {users.isLoading && <Loading />}
      <table className="t">
        <thead>
          <tr>
            <th>{t("admin.users.user")}</th>
            <th>{t("expert.product")}</th>
            <th>{t("expert.technical")}</th>
          </tr>
        </thead>
        <tbody>
          {users.data?.items.map((u) => (
            <tr key={u.id}>
              <td>
                <b>{u.displayName}</b>{" "}
                <span className="small muted">@{u.username}</span>
              </td>
              {(["product", "technical"] as ExpertKind[]).map((k) => {
                const on = sel[k].has(u.id);
                return (
                  <td key={k}>
                    <button
                      className={`cb${on ? " on" : ""}`}
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${u.username} · ${t(`expert.${k}`)}`}
                      onClick={() => toggle(k, u.id)}
                    >
                      {on && <Icon name="check" size={12} />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hint">{t("admin.domains.expertsHint")}</div>
      {save.error && <div className="err-text">{errorText(t, save.error)}</div>}
    </Modal>
  );
}
