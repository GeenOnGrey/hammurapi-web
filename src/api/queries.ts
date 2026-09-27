import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, qs } from "./client";
import type {
  Area, DomainDTO, FeatureCard, FeatureSummary, GateDocument, List, Me, PendingApproval, Profile, PublicConfig,
} from "./types";

// Query keys in one place so SSE handlers can invalidate precisely.
export const keys = {
  config: ["config"] as const,
  me: ["me"] as const,
  profile: ["profile"] as const,
  domains: ["domains"] as const,
  approvals: ["approvals"] as const,
  features: (f?: object) => (f ? (["features", f] as const) : (["features"] as const)),
  feature: (id: string) => ["feature", id] as const,
  document: (id: string, area: string) => ["document", id, area] as const,
  history: (id: string, area: string) => ["history", id, area] as const,
  diff: (id: string, area: string) => ["diff", id, area] as const,
  chat: ["chat"] as const,
  attachments: ["attachments"] as const,
  importJob: (id: string) => ["import", id] as const,
  adminUsers: (q: string) => ["admin", "users", q] as const,
  adminDomains: ["admin", "domains"] as const,
  rules: (area: string) => ["admin", "rules", area] as const,
  ruleChanges: (area: string) => ["admin", "ruleChanges", area] as const,
  settings: ["admin", "settings"] as const,
};

export const useConfig = () =>
  useQuery({ queryKey: keys.config, queryFn: () => api.get<PublicConfig>("/api/v1/config"), staleTime: Infinity });

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api.get<Me>("/api/v1/auth/me"), retry: false, staleTime: 60_000 });

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: () => api.get<Profile>("/api/v1/profile") });

export const useDomains = () =>
  useQuery({ queryKey: keys.domains, queryFn: () => api.get<DomainDTO[]>("/api/v1/domains"), staleTime: 60_000 });

export const useApprovals = (enabled: boolean) =>
  useQuery({
    queryKey: keys.approvals,
    queryFn: () => api.get<List<PendingApproval>>("/api/v1/approvals?limit=100"),
    enabled,
  });

export interface FeatureFilter {
  domain: string;
  status: string;
  q: string;
}

export const useFeatures = (f: FeatureFilter) =>
  useQuery({
    queryKey: keys.features(f),
    queryFn: () => api.get<List<FeatureSummary>>(`/api/v1/features${qs({ ...f, limit: 200 })}`),
  });

export const useFeature = (id: string) =>
  useQuery({ queryKey: keys.feature(id), queryFn: () => api.get<FeatureCard>(`/api/v1/features/${id}`), retry: false });

export const useDocument = (id: string, area: Area | undefined) =>
  useQuery({
    queryKey: keys.document(id, area ?? ""),
    queryFn: () => api.get<GateDocument>(`/api/v1/features/${id}/gates/${area}/document`),
    enabled: !!area,
  });

export function invalidateFeature(qc: QueryClient, id: string) {
  qc.invalidateQueries({ queryKey: keys.feature(id) });
  qc.invalidateQueries({ queryKey: ["history", id] });
  qc.invalidateQueries({ queryKey: ["diff", id] });
  qc.invalidateQueries({ queryKey: keys.features() });
}

export const useQC = useQueryClient;
