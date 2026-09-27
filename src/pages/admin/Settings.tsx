import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { keys } from "../../api/queries";
import { errorText } from "../../lib/errors";
import { Loading, useToast } from "../../components/ui";

interface Settings {
  attachmentRetentionDays: number;
}

export function SettingsAdmin() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: keys.settings, queryFn: () => api.get<Settings>("/admin/api/v1/settings") });
  const [days, setDays] = useState("");
  useEffect(() => {
    if (settings.data) setDays(String(settings.data.attachmentRetentionDays));
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () => api.patch<Settings>("/admin/api/v1/settings", { attachmentRetentionDays: Number(days) }),
    onSuccess: (s) => {
      qc.setQueryData(keys.settings, s);
      toast({ kind: "ok", title: t("admin.settings.saved") });
    },
    onError: (e) => toast({ kind: "error", title: errorText(t, e) }),
  });
  if (settings.isLoading) return <Loading />;
  const n = Number(days);
  const valid = Number.isInteger(n) && n >= 1 && n <= 3650;
  return (
    <>
      <h1 className="ftitle" style={{ fontSize: 20 }}>{t("admin.settings.title")}</h1>
      <div className="card" style={{ maxWidth: 480, marginTop: 12 }}>
        <div className="field">
          <label htmlFor="ret">{t("admin.settings.retention")}</label>
          <div className="row">
            <input id="ret" className="inp" type="number" min={1} max={3650} style={{ maxWidth: 140 }} value={days} onChange={(e) => setDays(e.target.value)} />
            <span className="t2">{t("admin.settings.days", { count: valid ? n : 0 })}</span>
          </div>
          <div className="hint">{t("admin.settings.retentionHint")}</div>
        </div>
        <button className="btn primary sm" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{t("common.save")}</button>
      </div>
    </>
  );
}
