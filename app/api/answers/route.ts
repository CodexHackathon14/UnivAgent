import { generateAnswer } from "@/lib/school-life/answer-service";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "JSON 요청 본문이 필요합니다." } },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (!isRecord(body) || typeof body.question !== "string") {
    return Response.json(
      { error: { code: "INVALID_QUESTION", message: "question 문자열이 필요합니다." } },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const question = body.question.trim();
  const rawConditions = body.conditions;

  if (question.length < 2 || question.length > 500) {
    return Response.json(
      {
        error: {
          code: "INVALID_QUESTION_LENGTH",
          message: "질문은 2자 이상 500자 이하로 입력해 주세요.",
        },
      },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (
    rawConditions !== undefined &&
    (!Array.isArray(rawConditions) ||
      rawConditions.length > 10 ||
      !rawConditions.every(
        (condition) => typeof condition === "string" && condition.length <= 100,
      ))
  ) {
    return Response.json(
      {
        error: {
          code: "INVALID_CONDITIONS",
          message: "conditions는 100자 이하 문자열을 최대 10개까지 보낼 수 있습니다.",
        },
      },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const conditions = Array.isArray(rawConditions)
    ? rawConditions.map((condition) => condition.trim()).filter(Boolean)
    : [];

  const result = await generateAnswer({ question, conditions });

  return Response.json(result, { headers: JSON_HEADERS });
}
