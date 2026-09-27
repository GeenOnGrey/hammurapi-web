import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, qs } from "../../api/client";
import { keys } from "../../api/queries";
import { AREAS, type AdminUser, type Area, type List, type Role, type RoleAreas } from "../../api/types";
import { errorText } from "../../lib/errors";
import { Icon } from "../../components/Icon";
import { Loading, Switch, useToast } from "../../components/ui";

const ROLES: Role[] = ["editor", "approver", "admin"];

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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 440px)", gap: 24, alignItems: "start" }}>
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
  if (!u.globalAdmin && u.roles.length === 0) return <span className="small muted">{t("roles.readerOnly")}</span>;
  return (
    <>
      {u.globalAdmin && <span className="rolechip global"><b>{t("roles.globalAdmin")}</b></span>}
      {u.roles.map((r) => (
        <span key={r.role} className="rolechip"><b>{t(`roles.${r.role}`)}</b> {r.areas.map((a) => t(`areas.${a}`)).join(", ")}</span>
      ))}
    </>
  );
}

function RoleEditor({ user, onDone }: { user: AdminUser; onDone: (u: AdminUser) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [global, setGlobal] = useState(user.globalAdmin);
  const [grid, setGrid] = useState<Record<Role, Set<Area>>>(() => fromRoles(user.roles));
  useEffect(() => setGrid(fromRoles(user.roles)), [user]);

  const toggle = (r: Role, a: Area) => setGrid((g) => {
    const next = { ...g, [r]: new Set(g[r]) };
    if (next[r].has(a)) next[r].delete(a);
    else next[r].add(a);
    return next;
  });

  const save = useMutation({
    mutationFn: () => {
      const roles: RoleAreas[] = ROLES.map((r) => ({ role: r, areas: AREAS.filter((a) => grid[r].has(a)) })).filter((r) => r.areas.length > 0);
      return api.put(`/admin/api/v1/users/${user.id}/roles`, { globalAdmin: global, roles }).then(() => roles);
    },
    onSuccess: (roles) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: keys.me });
      toast({ kind: "ok", title: t("admin.users.saved") });
      onDone({ ...user, globalAdmin: global, roles });
    },
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });

  return (
    <div className="card">
      <h2 className="sec">{t("admin.users.rolesOf", { name: user.displayName })}</h2>
      <div style={{ marginBottom: 12 }}>
        <Switch on={global} onChange={setGlobal} label={<>{t("roles.globalAdmin")} <span className="small muted">{t("admin.users.globalHint")}</span></>} />
      </div>
      <div className="areas" role="grid">
        <div />
        {AREAS.map((a) => <div key={a}>{t(`areasShort.${a}`)}</div>)}
        {ROLES.map((r) => (
          <RoleRow key={r} role={r} grid={grid} toggle={toggle} />
        ))}
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn ghost sm" onClick={() => { setGlobal(user.globalAdmin); setGrid(fromRoles(user.roles)); }}>{t("common.cancel")}</button>
        <button className="btn primary sm" disabled={save.isPending} onClick={() => save.mutate()}>{t("admin.users.save")}</button>
      </div>
    </div>
  );
}

function RoleRow({ role, grid, toggle }: { role: Role; grid: Record<Role, Set<Area>>; toggle: (r: Role, a: Area) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <div>{t(`roles.${role}Row`)}</div>
      {AREAS.map((a) => {
        const on = grid[role].has(a);
        return (
          <div key={a}>
            <button className={`cb${on ? " on" : ""}`} role="checkbox" aria-checked={on}
              aria-label={`${t(`roles.${role}`)} · ${t(`areas.${a}`)}`} onClick={() => toggle(role, a)}>
              {on && <Icon name="check" size={12} />}
            </button>
          </div>
        );
      })}
    </>
  );
}

function fromRoles(roles: RoleAreas[]): Record<Role, Set<Area>> {
  const g: Record<Role, Set<Area>> = { editor: new Set(), approver: new Set(), admin: new Set() };
  for (const r of roles) r.areas.forEach((a) => g[r.role].add(a));
  return g;
}
