import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import { keys, useConfig, useMe, useProfile } from "../api/queries";
import { connectEvents, disconnectEvents, onEvent, onReconnect } from "../lib/sse";
import { setDocumentLanguage } from "../lib/i18n";
import { Loading } from "../components/ui";
import { ChatProvider, SessionProvider } from "./session";
import { Shell } from "./Shell";
import { LoginPage } from "../pages/Login";
import { HomePage } from "../pages/Home";
import { DiffPage } from "../pages/Diff";
import { ImportPage } from "../pages/Import";

// The editor (Milkdown) is heavy: load it only on screens that edit documents.
const FeaturePage = lazy(() => import("../pages/Feature").then((m) => ({ default: m.FeaturePage })));
const AdminPage = lazy(() => import("../pages/admin/Admin").then((m) => ({ default: m.AdminPage })));

export function App() {
  const config = useConfig();
  const me = useMe();
  const location = useLocation();

  if (config.isLoading || me.isLoading) return <Loading />;
  const unauthenticated = me.error instanceof ApiError && me.error.status === 401;
  if (unauthenticated || location.pathname === "/login") {
    if (!unauthenticated && me.data) return <Navigate to="/" replace />;
    return config.data ? <LoginPage config={config.data} /> : <Loading />;
  }
  if (!me.data || !config.data) return <Loading />;
  return <Authenticated />;
}

function Authenticated() {
  const me = useMe();
  const config = useConfig();
  const profile = useProfile();
  const qc = useQueryClient();
  const { i18n } = useTranslation();

  // Interface language after sign-in comes from the profile.
  const lang = profile.data?.language;
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
      setDocumentLanguage(lang);
    }
  }, [lang, i18n]);

  const theme = profile.data?.theme;
  useEffect(() => {
    if (!theme) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("hmr-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  // Server-sent events keep lists and cards fresh without reloads.
  useEffect(() => {
    connectEvents();
    const offs = [
      onEvent("approvals.changed", () => qc.invalidateQueries({ queryKey: keys.approvals })),
      onEvent("gate.updated", (d: { uniqueId: string }) => {
        qc.invalidateQueries({ queryKey: keys.feature(d.uniqueId) });
        qc.invalidateQueries({ queryKey: ["history", d.uniqueId] });
        qc.invalidateQueries({ queryKey: ["diff", d.uniqueId] });
        qc.invalidateQueries({ queryKey: keys.features() });
        qc.invalidateQueries({ queryKey: keys.approvals });
      }),
      onEvent("feature.handed_off", (d: { uniqueId: string }) => {
        qc.invalidateQueries({ queryKey: keys.feature(d.uniqueId) });
        qc.invalidateQueries({ queryKey: keys.features() });
      }),
      onEvent("feature.deleted", (d: { uniqueId: string }) => {
        qc.invalidateQueries({ queryKey: keys.feature(d.uniqueId) });
        qc.invalidateQueries({ queryKey: keys.features() });
      }),
      onReconnect(() => qc.invalidateQueries()),
    ];
    return () => {
      offs.forEach((off) => off());
      disconnectEvents();
    };
  }, [qc]);

  if (profile.isLoading) return <Loading />;
  if (!profile.data || !me.data || !config.data) return <Loading />;
  return (
    <SessionProvider me={me.data} profile={profile.data} config={config.data}>
      <ChatProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="features/:uniqueId" element={<Suspense fallback={<Loading />}><FeaturePage /></Suspense>} />
            <Route path="features/:uniqueId/:area" element={<Suspense fallback={<Loading />}><FeaturePage /></Suspense>} />
            <Route path="features/:uniqueId/:area/diff" element={<DiffPage />} />
            <Route path="imports/:id" element={<ImportPage />} />
            <Route path="admin/*" element={<Suspense fallback={<Loading />}><AdminPage /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ChatProvider>
    </SessionProvider>
  );
}
