// Types of the Hammurapi API (hammurapi-core). Keep in sync with the Go DTOs.

export const AREAS = ["product", "design", "arch", "tech", "qa"] as const;
export type Area = (typeof AREAS)[number];
export type ExpertKind = "product" | "technical";
export type GateStatus = "draft" | "in_review" | "approved";
export type FeaturePhase = "spec" | "codegen" | "validation" | "in_release" | "released" | "rolled_back" | "deleted";
export type Autonomy = "plan" | "pr" | "autonomous";
export type IssueType = "idea" | "problem";
export type IssueStatus = "new" | "discovery" | "verification" | "accepted" | "resolved" | "rejected" | "merged";
export type ReleaseStatus = "merging" | "deploying" | "enabling_flags" | "evaluating" | "awaiting_confirmation" | "succeeded" | "rolling_back" | "rolled_back";
/** Who approves an area: product and design — product experts, the rest — technical. */
export const approverKind = (a: Area): ExpertKind => (a === "product" || a === "design" ? "product" : "technical");
/** Generated gates are written by the agent (PLT.HMR-0002 R12–R14). */
export const isGenerated = (a: Area) => a === "tech" || a === "qa";
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

export interface ExpertDomains {
  domain: string;
  kinds: ExpertKind[];
}

export interface Me {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  globalAdmin: boolean;
  areaAdmin: Area[];
  experts: ExpertDomains[];
  ownedServices: string[];
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
  source: "manual" | "backstage";
  deletedInCatalog: boolean;
}

export interface ExpertUser {
  id: string;
  username: string;
  displayName: string;
}

export interface DomainDTO {
  key: string;
  name: string;
  approvalRequired: boolean;
  source: "manual" | "backstage";
  deletedInCatalog: boolean;
  createdAt: string;
  systems: SystemDTO[];
  experts: { product: ExpertUser[]; technical: ExpertUser[] };
}

export interface Gate {
  area: Area;
  status: GateStatus;
  generated: boolean;
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
  phase: FeaturePhase;
  approvalRequired: boolean;
  isProblem: boolean;
  imported: boolean;
  parent: string | null;
  issues: string[];
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
  phase: FeaturePhase;
}

export interface Permissions {
  edit: Area[];
  submit: Area[];
  approve: Area[];
  deleteGate: Area[];
  addGate: Area[];
  regenerate: boolean;
  codegen: boolean;
  delete: boolean;
  setFlag: boolean;
}

export interface Measure {
  source: string;
  query: string;
  target: string;
  window: string;
}

export interface FeatureCard {
  uniqueId: string;
  domain: string;
  system: string;
  title: string;
  phase: FeaturePhase;
  approvalRequired: boolean;
  isProblem: boolean;
  imported: boolean;
  branch: string;
  pr: { number: number; url: string };
  parent: string | null;
  fixes: FeatureRef[];
  issues: string[];
  services: { key: string; repo: string; autonomy: Autonomy }[];
  release: string | null;
  metric: Measure | null;
  flagKey: string | null;
  gates: Gate[];
  pendingGates: Area[];
  lock: LockInfo | null;
  workflow: { kind: string; state: string; step: string | null; lastError: string | null } | null;
  tokensIn: number;
  tokensOut: number;
  createdBy: string;
  createdAt: string;
  permissions: Permissions;
}

export interface GateDocument {
  content: string;
  sha: string;
  fix: boolean;
  generated: boolean;
  warnings: string[];
  unnumberedRequirements: string[];
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

export type GateEventType = "created" | "edited" | "submitted" | "approved" | "reset" | "deleted" | "generated";

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

export type ContextType = "issue" | "feature" | "release";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  mode: ChatMode;
  context: { type: ContextType; key: string; area: Area | null } | null;
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
  areaAdmin: Area[];
  experts: ExpertDomains[];
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

// ─── PLT.HMR-0002: the closed cycle ──────────────────────────────────

export interface Activity {
  id: string;
  type: string;
  actor: string | null;
  isAgent: boolean;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface IssueDTO {
  key: string;
  domain: string;
  type: IssueType;
  title: string;
  description: string;
  source: string;
  status: IssueStatus;
  author: string | null;
  mergedInto: string | null;
  rejectReason: string | null;
  rolledBackRelease: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCard extends IssueDTO {
  movedFrom: string[];
  features: string[];
  releases: string[];
  mergedFrom: string[];
  attachments: AttachmentRef[];
  activity: Activity[];
  tokensIn: number;
  tokensOut: number;
  permissions: { verify: boolean; reopen: boolean; discover: boolean };
}

export interface DiscoveryView {
  content?: string;
  value?: string | null;
  measure?: Measure | null;
  measureCheckedAt?: string | null;
  similar?: { key: string; title: string; kind: "issue" | "feature" }[];
  systems?: string[];
  services?: string[];
  problemTarget?: string | null;
  revision?: number;
  updatedAt?: string;
  complete: boolean;
  missing: string[];
  workflow: { state: string; lastError: string | null; updatedAt: string; nextRunAt: string | null } | null;
}

export interface Revision {
  revision: number;
  content: string;
  isAgent: boolean;
  actor: string | null;
  createdAt: string;
}

export interface ServiceDTO {
  key: string;
  name: string;
  system: string | null;
  domain: string | null;
  repo: string;
  ownerRef: string;
  owners: string[];
  autonomy: Autonomy;
  deployOverride: Record<string, { workflow?: string; ref?: string; params?: Record<string, string> }> | null;
  overrideFromCatalog: boolean;
  source: "manual" | "backstage";
  catalogRef: string | null;
  deletedInCatalog: boolean;
}

export interface TaskDTO {
  id: string;
  type: "implement" | "address_review" | "update_pr" | "revert" | "ci_setup";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  service: string;
  result: { plan?: string; summary?: string; prNumber?: number } | null;
  progress: string | null;
  error: string | null;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PRDTO {
  id: string;
  repo: string;
  number: number;
  url: string;
  title: string;
  branch: string;
  kind: "spec" | "service" | "revert";
  service: string | null;
  byAgent: boolean;
  state: "open" | "merged" | "closed";
  review: "none" | "required" | "changes_requested" | "approved" | "not_required";
  headSha: string;
  ciStatus: string | null;
  mergeSha: string | null;
  mergedAt: string | null;
  requirements: string[];
  createdAt: string;
}

export interface RequirementRow {
  id: string;
  text: string;
  services: string[];
  testCases: { id: string; level: string; title: string }[];
  prs: { service: string | null; number: number; url: string; byAgent: boolean; state: string }[];
}

export interface ServiceImpl {
  service: string;
  repo: string;
  autonomy: Autonomy;
  tasks: TaskDTO[];
  pr: PRDTO | null;
  plan: string | null;
}

export interface Implementation {
  phase: FeaturePhase;
  workflow: { state: string; step: string; lastError: string | null } | null;
  services: ServiceImpl[];
  matrix: RequirementRow[];
  humanPrs: PRDTO[];
  tokensIn: number;
  tokensOut: number;
  canStart: boolean;
}

export interface DeployRun {
  id: string;
  environment: "stage" | "production";
  service: string;
  ref: string;
  status: "triggered" | "started" | "success" | "failure" | "timeout";
  signal: "pipeline" | "tag" | "manual" | null;
  version: string | null;
  runUrl: string | null;
  error: string | null;
  markedBy: string | null;
  isRollback: boolean;
  createdAt: string;
  finishedAt: string | null;
}

export interface Signature {
  side: ExpertKind;
  user: string;
  comment: string | null;
  signedAt: string;
}

export interface TestRow {
  id: string;
  level: string;
  title: string;
  requirements: string[];
  status: "passed" | "failed" | "skipped" | "missing";
  environment: string;
}

export interface ValidationSummary {
  phase: FeaturePhase;
  state: string;
  lastError: string | null;
  ciComplete: boolean;
  tests: TestRow[];
  coverage: { requirements: number; withTests: number; withPrs: number; passed: number };
  matrix: RequirementRow[];
  discrepancies: { id: string; requirement: string; service: string | null; prUrl: string | null; description: string; foundAt: string }[];
  reviews: { service: string; pr: number; url: string; review: string; ci: string; byAgent: boolean; required: boolean; passed: boolean }[];
  stage: { enabled: boolean; configured: boolean; deploys: DeployRun[] };
  signatures: Signature[];
  permissions: { signProduct: boolean; signTechnical: boolean; return: boolean; markStage: boolean };
}

export interface ReleaseDTO {
  key: string;
  feature: string;
  featureTitle: string;
  domain: string;
  status: ReleaseStatus;
  plan: { order: string[] };
  metricResult: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  rollbackReason: string | null;
  rolledBackBy: string | null;
  rolledBackAt: string | null;
  blockedReason: string | null;
  createdAt: string;
}

export interface ReleaseCard extends ReleaseDTO {
  issues: string[];
  prs: PRDTO[];
  deploys: DeployRun[];
  step: string;
  blocked: boolean;
  currentService: string | null;
  flagKey: string | null;
  flagState: "on" | "off" | null;
  flagsEnabled: boolean;
  metric: Measure | null;
  rollback: { state: string; step: string; lastError: string | null } | null;
  activity: Activity[];
  tasks: TaskDTO[];
  tokensIn: number;
  tokensOut: number;
  permissions: { editPlan: boolean; startMerge: boolean; markDeploy: boolean; retry: boolean; markFlag: boolean; confirm: boolean; rollback: boolean };
}

export type FocusAction =
  | "verify_discovery" | "approve_gate" | "sign_validation" | "start_merge" | "mark_deploy"
  | "retry_or_rollback" | "mark_flag" | "confirm_release" | "resolve_blocked";

export interface FocusItem {
  kind: ContextType;
  key: string;
  title: string;
  action: FocusAction;
  waitingSince: string;
  hint?: string | null;
}

export interface Focus {
  research: FocusItem[];
  development: FocusItem[];
  release: FocusItem[];
}

export interface OverviewCard {
  key: string;
  title: string;
  type?: IssueType;
  status: string;
  feature?: string;
  issues: string[];
  step?: string | null;
  done: number;
  total: number;
  blocked: boolean;
  domain: string;
}

export interface Overview {
  issues: OverviewCard[];
  features: OverviewCard[];
  releases: OverviewCard[];
}

export interface CodegenPlan {
  services: { service: string; repo: string; autonomy: Autonomy; requirements: string[] }[];
}

export interface CatalogSettings {
  enabled: boolean;
  catalogRepo: string;
  catalogGlob: string;
  serviceFilePath: string;
  serviceRepos: string[];
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface CatalogError {
  kind: string;
  name: string;
  catalogRef: string;
  reason: string;
  seenAt: string;
}

export type DeployType = "github-actions" | "gitlab-ci" | "webhook";

export interface DeployConfig {
  type: DeployType;
  workflow?: string;
  ref?: string;
  url?: string;
  auth: "bot" | "secret";
  params: Record<string, string> | null;
  timeoutMinutes: number;
}

export interface DeploySettings {
  environment: "stage" | "production";
  configured: boolean;
  settings?: DeployConfig;
  activeSecrets?: number;
  updatedAt?: string;
  secret?: string;
}

export interface MetricSource {
  name: string;
  type: "clickhouse" | "prometheus";
  endpoint: string;
  username: string | null;
  secretRef: string;
  limits: { maxExecutionSeconds: number; maxResultRows: number; maxRangeDays: number };
}

export interface CycleSettings {
  attachmentRetentionDays: number;
  featureFlags: { enabled: boolean; activeSecrets: number };
  stage: { enabled: boolean };
  runnerExecutor: string;
}
