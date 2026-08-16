import {
  isDemoAction,
  isDemoStage,
  transitionDemoCase,
} from "@/lib/school-life/demo-case";

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
      { status: 400 },
    );
  }

  if (!isRecord(body) || !isDemoStage(body.stage) || !isDemoAction(body.action)) {
    return Response.json(
      {
        error: {
          code: "INVALID_TRANSITION_INPUT",
          message: "유효한 stage와 action이 필요합니다.",
        },
      },
      { status: 400 },
    );
  }

  const nextCase = transitionDemoCase(body.stage, body.action);

  if (!nextCase) {
    return Response.json(
      {
        error: {
          code: "INVALID_TRANSITION",
          message: `${body.stage} 단계에서는 ${body.action}을 실행할 수 없습니다.`,
        },
      },
      { status: 409 },
    );
  }

  return Response.json(
    { data: nextCase },
    { headers: { "Cache-Control": "no-store" } },
  );
}
