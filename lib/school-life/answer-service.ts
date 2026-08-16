import { findOfficialEvidence } from "./evidence";
import type {
  AnswerPayload,
  AnswerResult,
  EvidenceDocument,
  EvidenceSource,
  ResponsibilityLevel,
} from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";

interface GenerateAnswerInput {
  question: string;
  conditions: string[];
}

interface ModelAnswer {
  status: "answered" | "insufficient_evidence";
  conclusion: string;
  explanation: string;
  verifiedFacts: string[];
  unverifiedFacts: string[];
  sourceIds: string[];
}

function toEvidenceSource(source: EvidenceDocument): EvidenceSource {
  return {
    id: source.id,
    title: source.title,
    sourceUrl: source.sourceUrl,
    publishedAt: source.publishedAt,
    updatedAt: source.updatedAt,
    effectivePeriod: source.effectivePeriod,
    department: source.department,
    location: source.location,
    excerpt: source.excerpt,
    verifiedAt: source.verifiedAt,
  };
}

function detectResponsibility(question: string): ResponsibilityLevel {
  const normalized = question.toLocaleLowerCase("ko-KR").replaceAll(/\s+/g, "");

  if (["정원", "분반", "마감", "찼", "자리"].some((word) => normalized.includes(word))) {
    return "collective";
  }

  if (["klas", "21학점", "표시", "내학점", "제학점"].some((word) => normalized.includes(word))) {
    return "personal";
  }

  return "official";
}

function buildRoutedAnswer(
  responsibility: Exclude<ResponsibilityLevel, "official">,
): AnswerResult {
  if (responsibility === "personal") {
    const data: AnswerPayload = {
      status: "needs_personal_verification",
      responsibility,
      conclusion: "공식 기준과 개인 KLAS 표시가 달라 담당 부서 확인이 필요합니다.",
      explanation:
        "공식 자료만으로 개인 계정의 학점 상한 표시 원인을 확정할 수 없습니다. 개인 상태는 공식 답과 분리해 확인해야 합니다.",
      verifiedFacts: ["공식 기준상 조건부 최대학점 추가 신청제도가 존재합니다."],
      unverifiedFacts: ["해당 학생 계정에 21학점으로 표시된 원인", "개인별 제도 적용 여부"],
      nextAction: "개인정보를 노출하지 않고 교육지원팀 확인용 데모 요청을 만듭니다.",
      sources: findOfficialEvidence("수강신청 최대 학점 평점 3.5").map(
        toEvidenceSource,
      ),
    };

    return {
      data,
      meta: {
        generationMode: "rule_based_routing",
        model: null,
        evidenceCount: data.sources.length,
      },
    };
  }

  const data: AnswerPayload = {
    status: "needs_collective_review",
    responsibility,
    conclusion: "필수과목 정원 부족은 개인 확인이 아니라 집단 수요 검토가 필요한 사안입니다.",
    explanation:
      "학교의 기존 공식 문서만으로 새 분반 증설을 확정할 수 없습니다. 인증된 수요와 학생회 검토, 학교 결정이 필요합니다.",
    verifiedFacts: [],
    unverifiedFacts: ["현재 동일 문제 학생 수", "증설 가능 여부", "KLAS 반영 일정"],
    nextAction: "합성 인증 수요를 사용하는 집단 사안 데모 단계로 전환합니다.",
    sources: [],
  };

  return {
    data,
    meta: {
      generationMode: "rule_based_routing",
      model: null,
      evidenceCount: 0,
    },
  };
}

function buildInsufficientEvidenceAnswer(): AnswerResult {
  return {
    data: {
      status: "insufficient_evidence",
      responsibility: "official",
      conclusion: "현재 허용된 광운대학교 공식 자료에서 답을 확인하지 못했습니다.",
      explanation:
        "근거가 없는 상태에서 답을 추측하지 않았습니다. 질문 범위를 수강신청 학점, KLAS 표시 또는 필수과목 정원으로 좁혀 주세요.",
      verifiedFacts: [],
      unverifiedFacts: ["질문에 직접 답하는 공식 기준"],
      nextAction: "질문을 구체화하거나 담당 부서의 공식 안내를 추가로 확인합니다.",
      sources: [],
    },
    meta: {
      generationMode: "verified_demo_fallback",
      model: null,
      evidenceCount: 0,
    },
  };
}

function buildVerifiedFallback(
  evidence: EvidenceDocument[],
  warning?: string,
): AnswerResult {
  return {
    data: {
      status: "answered",
      responsibility: "official",
      conclusion: "조건을 모두 충족하면 이번 학기 최대 22학점까지 신청할 수 있습니다.",
      explanation:
        "2017학년도 이후 입학생의 기본 상한 19학점에, 직전학기 평량평균 3.5 이상 조건으로 추가 3학점을 적용한 결과입니다. 복학 처리가 완료되어야 수강신청 프로그램에 접속할 수 있습니다.",
      verifiedFacts: [
        "2017학년도 이후 입학생의 기본 수강신청 상한은 19학점입니다.",
        "직전학기 평량평균 3.5 이상이면 차기 학기에 3학점을 추가 신청할 수 있습니다.",
      ],
      unverifiedFacts: ["개인 KLAS 계정에 조건부 추가학점이 실제 적용됐는지 여부"],
      nextAction: "KLAS 표시가 다르면 개인 상태를 담당 부서에 확인합니다.",
      sources: evidence.map(toEvidenceSource),
    },
    meta: {
      generationMode: "verified_demo_fallback",
      model: null,
      evidenceCount: evidence.length,
    },
    ...(warning ? { warning } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseModelAnswer(value: string, allowedSourceIds: Set<string>): ModelAnswer | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const status = parsed.status;
  const sourceIds = parsed.sourceIds;

  if (
    (status !== "answered" && status !== "insufficient_evidence") ||
    typeof parsed.conclusion !== "string" ||
    typeof parsed.explanation !== "string" ||
    !isStringArray(parsed.verifiedFacts) ||
    !isStringArray(parsed.unverifiedFacts) ||
    !isStringArray(sourceIds) ||
    sourceIds.some((sourceId) => !allowedSourceIds.has(sourceId)) ||
    (status === "answered" && sourceIds.length === 0)
  ) {
    return null;
  }

  return {
    status,
    conclusion: parsed.conclusion,
    explanation: parsed.explanation,
    verifiedFacts: parsed.verifiedFacts,
    unverifiedFacts: parsed.unverifiedFacts,
    sourceIds,
  };
}

async function requestOpenAiAnswer(
  input: GenerateAnswerInput,
  evidence: EvidenceDocument[],
  apiKey: string,
  model: string,
): Promise<ModelAnswer | null> {
  const allowedSourceIds = evidence.map((source) => source.id);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        enum: ["answered", "insufficient_evidence"],
      },
      conclusion: { type: "string" },
      explanation: { type: "string" },
      verifiedFacts: { type: "array", items: { type: "string" } },
      unverifiedFacts: { type: "array", items: { type: "string" } },
      sourceIds: {
        type: "array",
        items: { type: "string", enum: allowedSourceIds },
      },
    },
    required: [
      "status",
      "conclusion",
      "explanation",
      "verifiedFacts",
      "unverifiedFacts",
      "sourceIds",
    ],
  };

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1_500,
      reasoning: { effort: "minimal" },
      instructions:
        "당신은 광운대학교 공식 근거 답변기입니다. 제공된 evidence 밖의 사실, URL, 날짜, 부서, 개인 적용 결과를 만들지 마세요. 근거가 직접 답하지 않으면 insufficient_evidence로 답하세요. 개인 KLAS 적용 여부는 확정하지 말고 unverifiedFacts에 남기세요. 한국어로 간결하게 답하세요.",
      input: JSON.stringify({
        question: input.question,
        conditions: input.conditions,
        evidence: evidence.map((source) => ({
          id: source.id,
          title: source.title,
          sourceUrl: source.sourceUrl,
          publishedAt: source.publishedAt,
          updatedAt: source.updatedAt,
          effectivePeriod: source.effectivePeriod,
          department: source.department,
          location: source.location,
          excerpt: source.excerpt,
          verifiedAt: source.verifiedAt,
        })),
      }),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "univ_agent_official_answer",
          strict: true,
          schema,
        },
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    return null;
  }

  const outputText = extractOutputText(await response.json());

  return outputText
    ? parseModelAnswer(outputText, new Set(allowedSourceIds))
    : null;
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<AnswerResult> {
  const responsibility = detectResponsibility(input.question);

  if (responsibility !== "official") {
    return buildRoutedAnswer(responsibility);
  }

  const evidence = findOfficialEvidence(input.question);

  if (evidence.length === 0) {
    return buildInsufficientEvidenceAnswer();
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return buildVerifiedFallback(
      evidence,
      "OPENAI_API_KEY가 없어 검증된 데모 답변을 사용했습니다.",
    );
  }

  try {
    const modelAnswer = await requestOpenAiAnswer(input, evidence, apiKey, model);

    if (!modelAnswer) {
      return buildVerifiedFallback(
        evidence,
        "AI 응답을 검증하지 못해 검증된 데모 답변을 사용했습니다.",
      );
    }

    const sources = evidence.filter((source) =>
      modelAnswer.sourceIds.includes(source.id),
    );

    return {
      data: {
        status: modelAnswer.status,
        responsibility: "official",
        conclusion: modelAnswer.conclusion,
        explanation: modelAnswer.explanation,
        verifiedFacts: modelAnswer.verifiedFacts,
        unverifiedFacts: modelAnswer.unverifiedFacts,
        nextAction:
          modelAnswer.status === "answered"
            ? "KLAS 표시가 다르면 개인 상태를 담당 부서에 확인합니다."
            : "질문을 구체화하거나 담당 부서의 공식 안내를 추가로 확인합니다.",
        sources: sources.map(toEvidenceSource),
      },
      meta: {
        generationMode: "openai",
        model,
        evidenceCount: sources.length,
      },
    };
  } catch {
    return buildVerifiedFallback(
      evidence,
      "AI 호출에 실패해 검증된 데모 답변을 사용했습니다.",
    );
  }
}
