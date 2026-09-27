// Types of the Hammurapi API (hammurapi-core). Keep in sync with the Go DTOs.

export const AREAS = ["product", "design", "arch", "tech", "qa"] as const;
export type Area = (typeof AREAS)[number];
export type Role = "editor" | "approver" | "admin";
export type GateStatus = "draft" | "in_review" | "approved";
export type FeatureStatus = "in_progress" | "handed_off" | "deleted";
export type Tone = "business" | "friendly" | "concise" | "mentor";
export type ChatMode = "general" | "spec";

export interface List<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PublicConfig {
  provider: "github" | "gitlab";
  uploadMaxBytes: number;
  uploadAllowedTypes: string[];
  importMaxBytes: number;
  languages: string[];
  defaultLanguage: string;
  defaultBranch: string;
}

export interface RoleAreas {
  role: Role;
  areas: Area[];
}

export interface Me {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  globalAdmin: boolean;
  roles: RoleAreas[];
  language: string;
  theme: "light" | "dark";
  agentName: string;
  agentTone: Tone;
}

export interface Profile {
  language: string;
  theme: "light" | "dark";
  domains: string[];
  agentName: string;
  agentTone: Tone;
}

export interface SystemDTO {
  key: string;
  name: string;
  lastNumber: number;
}

export interface DomainDTO {
  key: string;
  name: string;
  approvalRequired: boolean;
  createdAt: string;
  systems: SystemDTO[];
}

export interface Gate {
  area: Area;
  status: GateStatus;
  headCommit: string;
  submittedAt: string | null;
  approvedCommit: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface FeatureSummary {
  uniqueId: string;
  domain: string;
  system: string;
  title: string;
  status: FeatureStatus;
  approvalRequired: boolean;
  parent: string | null;
  createdAt: string;
  gates: Gate[];
}

export interface LockInfo {
  userId: string;
  userName: string;
  lockedAt: string;
  expiresAt: string;
}

export interface FeatureRef {
  uniqueId: string;
  title: string;
  status: FeatureStatus;
}

export interface Permissions {
  edit: Area[];
  submit: Area[];
  approve: Area[];
  deleteGate: Area[];
  addGate: Area[];
  handoff: boolean;
  delete: boolean;
}

export interface FeatureCard {
  uniqueId: string;
  domain: string;
  system: string;
  title: string;
  status: FeatureStatus;
  approvalRequired: boolean;
  branch: string;
  pr: { number: number; url: string };
  parent: string | null;
  fixes: FeatureRef[];
  gates: Gate[];
  lock: LockInfo | null;
  createdBy: string;
  createdAt: string;
  handedOffBy: string | null;
  handedOffAt: string | null;
  handedOffWithoutApproval: boolean;
  permissions: Permissions;
}

export interface GateDocument {
  content: string;
  sha: string;
  fix: boolean;
  warnings: string[];
  lock: LockInfo | null;
  readOnly: boolean;
}

export interface DiffLine {
  op: "=" | "+" | "-";
  text: string;
  section?: string;
}

export interface DiffResult {
  base: string;
  baseLabel: "approved" | "default_branch";
  head: string;
  approvedBy: string | null;
  approvedAt: string | null;
  baseUrl: string;
  headUrl: string;
  lines: DiffLine[];
}

export type GateEventType = "created" | "edited" | "submitted" | "approved" | "reset" | "deleted";

export interface HistoryItem {
  id: string;
  type: GateEventType;
  actor: string | null;
  isAgent: boolean;
  commit: string | null;
  commitUrl: string | null;
  createdAt: string;
}

export interface PendingApproval {
  uniqueId: string;
  title: string;
  domain: string;
  system: string;
  area: Area;
  submittedBy: string | null;
  submittedAt: string;
}

export interface AttachmentRef {
  id: string;
  fileName: string;
  mimeType: string;
}

export interface Attachment extends AttachmentRef {
  sizeBytes: number;
  messageId: string | null;
  feature: string | null;
  mode: ChatMode | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  mode: ChatMode;
  feature: string | null;
  area: Area | null;
  content: string;
  isVoice: boolean;
  attachments: AttachmentRef[];
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  globalAdmin: boolean;
  roles: RoleAreas[];
  createdAt: string;
}

export interface RuleFile {
  file: "template" | "fix-template";
  path: string;
  content: string;
  sha: string;
}

export interface RuleChange {
  id: string;
  area: Area;
  file: "template" | "fix-template";
  branch: string;
  prNumber: number;
  prUrl: string;
  comment: string | null;
  status: "open" | "merged" | "withdrawn";
  authorId: string;
  author: string;
  approvedBy: string | null;
  createdAt: string;
  closedAt: string | null;
  lines?: DiffLine[];
}

export interface Issue {
  code: string;
  params?: Record<string, unknown>;
}

export interface ImportFeaturePreview {
  archiveId: string;
  newId: string | null;
  domain: string;
  system: string;
  title: string;
  areas: string[];
  files: number;
  fileNames: string[];
  parent: string | null;
  errors: Issue[];
  warnings: Issue[];
}

export interface ImportRulePreview {
  area: string;
  file: string;
  action: "propose" | "skip";
  reason?: string;
  result?: string;
  prUrl?: string;
}

export interface ImportResult {
  archiveId: string;
  status: "pending" | "skipped" | "imported" | "failed";
  newId: string | null;
  prUrl: string | null;
  gates: number;
  error: string | null;
}

export interface ImportJob {
  id: string;
  status: "validated" | "running" | "done" | "failed" | "cancelled";
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  fileName: string;
  size: number;
  features: ImportFeaturePreview[];
  rules: ImportRulePreview[];
  admins: string[];
  results: ImportResult[];
}
