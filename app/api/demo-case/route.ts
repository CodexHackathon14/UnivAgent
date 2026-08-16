import { getDemoCase, isDemoStage } from "@/lib/univ-agent/demo-case";

export async function GET(request: Request) {
  const requestedStage = new URL(request.url).searchParams.get("stage") ?? "home";

  if (!isDemoStage(requestedStage)) {
    return Response.json(
      {
        error: {
          code: "INVALID_STAGE",
          message: "지원하지 않는 데모 단계입니다.",
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { data: getDemoCase(requestedStage) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
