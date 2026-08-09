import type { z } from "zod";
import type {
  activityEventSchema,
  artifactSchema,
  callLedgerSchema,
  diagnosticsSchema,
  documentSchema,
  humanRequestSchema,
  liveActivityEventSchema,
  liveViewSchema,
  profileSchema,
  runSchema,
  runStatusSchema,
  settingsSchema,
} from "./schemas";

export type RunStatus = z.infer<typeof runStatusSchema>;
export type Run = z.infer<typeof runSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type LiveActivityEvent = z.infer<typeof liveActivityEventSchema>;
export type HumanRequest = z.infer<typeof humanRequestSchema>;
export type LiveView = z.infer<typeof liveViewSchema>;
export type CallLedger = z.infer<typeof callLedgerSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
export type Diagnostics = z.infer<typeof diagnosticsSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type CandidateProfile = z.infer<typeof profileSchema>;
export type CandidateDocument = z.infer<typeof documentSchema>;
