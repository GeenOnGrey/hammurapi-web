import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, qs } from "../../api/client";
import { keys } from "../../api/queries";
import { AREAS, type AdminUser, type Area, type List } from "../../api/types";
import { errorText } from "../../lib/errors";
import { Icon } from "../../components/Icon";
import { Loading, Switch, useToast } from "../../components/ui";

export function UsersAdmin() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const users = useQuery({
    queryKey: keys.adminUsers(q),
    queryFn: () => api.get<List<AdminUser>>(`/admin/api/v1/users${qs({ q, limit: 200 })}`),
  });
  return (
    <>
      <h1 className="ftitle" style={{ fontSize: 20 }}>{t("admin.users.title")}</h1>
      <label className="search" style={{ maxWidth: 320, margin: "10px 0 16px" }}>
        <Icon name="search" />
        <input placeholder={t("admin.users.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {/* The editor column appears with a selected user; until then the table takes the full width. */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(0, 1fr) minmax(0, 440px)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <div style={{ overflowX: "auto" }}>
          {users.isLoading && <Loading />}
          <table className="t">
            <thead><tr><th>{t("admin.users.user")}</th><th>{t("admin.users.roles")}</th></tr></thead>
            <tbody>
              {users.data?.items.map((u) => (
                <tr key={u.id} className={`clickable${selected?.id === u.id ? " sel" : ""}`} onClick={() => setSelected(u)}>
                  <td><b>{u.displayName}</b><div className="small muted">@{u.username}</div></td>
                  <td><RoleChips u={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && <RoleEditor key={selected.id} user={selected} onDone={(u) => setSelected(u)} />}
      </div>
    </>
  );
}

function RoleChips({ u }: { u: AdminUser }) {
  const { t } = useTranslation();
  if (!u.globalAdmin && u.areaAdmin.length === 0 && u.experts.length === 0) return <span className="small muted">{t("roles.readerOnly")}</span>;
  return (
    <>
      {u.globalAdmin && <span className="rolechip global"><b>{t("roles.globalAdmin")}</b></span>}
      {u.areaAdmin.length > 0 && <span className="rolechip"><b>{t("roles.admin")}</b> {u.areaAdmin.map((a) => t(`areas.${a}`)).join(", ")}</span>}
      {u.experts.map((e) => (
        <span key={e.domain} className="rolechip"><b>{e.domain}</b> {e.kinds.map((k) => t(`expert.${k}`)).join(", ")}</span>
      ))}
    </>
  );
}

function RoleEditor({ user, onDone }: { user: AdminUser; onDone: (u: AdminUser) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [global, setGlobal] = useState(user.globalAdmin);
  const [areas, setAreas] = useState<Set<Area>>(() => new Set(user.areaAdmin));
  useEffect(() => setAreas(new Set(user.areaAdmin)), [user]);
  const toggle = (a: Area) => setAreas((s) => {
    const n = new Set(s);
    if (n.has(a)) n.delete(a);
    else n.add(a);
    return n;
  });
  const save = useMutation({
    mutationFn: () => {
      const areaAdmin = AREAS.filter((a) => areas.has(a));
      return api.put(`/admin/api/v1/users/${user.id}/roles`, { globalAdmin: global, areaAdmin }).then(() => areaAdmin);
    },
    onSuccess: (areaAdmin) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: keys.me });
      toast({ kind: "ok", title: t("admin.users.saved") });
      onDone({ ...user, globalAdmin: global, areaAdmin });
    },
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });
  return (
    <div className="card">
      <h2 className="sec">{t("admin.users.rolesOf", { name: user.displayName })}</h2>
      <div style={{ marginBottom: 12 }}>
        <Switch on={global} onChange={setGlobal} label={<>{t("roles.globalAdmin")} <span className="small muted">{t("admin.users.globalHint")}</span></>} />
      </div>
      <div className="small t2" style={{ marginBottom: 6 }}>{t("roles.admin")}</div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {AREAS.map((a) => {
          const on = areas.has(a);
          return (
            <button key={a} className={`chip${on ? " on" : ""}`} role="checkbox" aria-checked={on} onClick={() => toggle(a)}>
              {on && <Icon name="check" size={12} />} {t(`areas.${a}`)}
            </button>
          );
        })}
      </div>
      <div className="hint" style={{ marginTop: 10 }}>{t("admin.users.expertsHint")}</div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn ghost sm" onClick={() => { setGlobal(user.globalAdmin); setAreas(new Set(user.areaAdmin)); }}>{t("common.cancel")}</button>
        <button className="btn primary sm" disabled={save.isPending} onClick={() => save.mutate()}>{t("admin.users.save")}</button>
      </div>
    </div>
  );
}
