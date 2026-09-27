import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Area, Me, Profile, PublicConfig, Role } from "../api/types";

export interface Session {
  me: Me;
  profile: Profile;
  config: PublicConfig;
  has: (role: Role, area: Area) => boolean;
  hasRole: (role: Role) => boolean;
  isAnyAdmin: boolean;
}

const SessionCtx = createContext<Session | null>(null);

export function SessionProvider({ me, profile, config, children }: { me: Me; profile: Profile; config: PublicConfig; children: ReactNode }) {
  const value = useMemo<Session>(() => {
    const has = (role: Role, area: Area) => me.roles.some((r) => r.role === role && r.areas.includes(area));
    const hasRole = (role: Role) => me.roles.some((r) => r.role === role && r.areas.length > 0);
    return { me, profile, config, has, hasRole, isAnyAdmin: me.globalAdmin || hasRole("admin") };
  }, [me, profile, config]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

// ─── Chat context: which feature/area the chat is about ────────────

export interface ChatContextValue {
  feature: { uniqueId: string; title: string } | null;
  area: Area | null;
  setFeature: (f: { uniqueId: string; title: string } | null, area?: Area | null) => void;
  open: boolean; // mobile overlay
  setOpen: (v: boolean) => void;
  /** Queue a message to send from outside the chat (e.g. "Draft by rules"). */
  outbox: string | null;
  send: (text: string) => void;
  takeOutbox: () => string | null;
}

const ChatCtx = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [feature, setF] = useState<ChatContextValue["feature"]>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [open, setOpen] = useState(false);
  const [outbox, setOutbox] = useState<string | null>(null);
  const value = useMemo<ChatContextValue>(() => ({
    feature, area, open, setOpen, outbox,
    setFeature: (f, a = null) => {
      setF((prev) => (prev?.uniqueId === f?.uniqueId && prev?.title === f?.title ? prev : f));
      setArea(a);
    },
    send: (text) => {
      setOutbox(text);
      setOpen(true);
    },
    takeOutbox: () => {
      const o = outbox;
      if (o !== null) setOutbox(null);
      return o;
    },
  }), [feature, area, open, outbox]);
  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChatContext(): ChatContextValue {
  const c = useContext(ChatCtx);
  if (!c) throw new Error("useChatContext outside ChatProvider");
  return c;
}
