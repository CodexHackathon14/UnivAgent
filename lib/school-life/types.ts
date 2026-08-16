export type ResponsibilityLevel = "official" | "personal" | "collective";

export type AnswerStatus =
  | "answered"
  | "needs_personal_verification"
  | "needs_collective_review"
  | "insufficient_evidence";

export type GenerationMode =
  | "openai"
  | "verified_demo_fallback"
  | "rule_based_routing";

export interface EvidenceDocument {
  id: string;
  title: string;
  sourceUrl: string;
  publishedAt: string | null;
  updatedAt: string | null;
  effectivePeriod: string;
  department: string;
  location: string;
  excerpt: string;
  verifiedAt: string;
  keywords: readonly string[];
}

export type EvidenceSource = Omit<EvidenceDocument, "keywords">;

export interface AnswerPayload {
  status: AnswerStatus;
  responsibility: ResponsibilityLevel;
  conclusion: string;
  explanation: string;
  verifiedFacts: string[];
  unverifiedFacts: string[];
  nextAction: string;
  sources: EvidenceSource[];
}

export interface AnswerResult {
  data: AnswerPayload;
  meta: {
    generationMode: GenerationMode;
    model: string | null;
    evidenceCount: number;
  };
  warning?: string;
}
