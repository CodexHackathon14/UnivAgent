import {
  DEMO_ACTIONS,
  DEMO_STAGES,
  type DemoAction,
  type DemoCase,
  type DemoStage,
} from "@/lib/univ-agent/demo-case";

export class DemoRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimelineEntry(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.time === "string" &&
    typeof value.event === "string" &&
    typeof value.owner === "string"
  );
}

function isDemoStage(value: unknown): value is DemoStage {
  return (
    typeof value === "string" &&
    DEMO_STAGES.some((candidate) => candidate === value)
  );
}

function isDemoAction(value: unknown): value is DemoAction {
  return (
    typeof value === "string" &&
    DEMO_ACTIONS.some((candidate) => candidate === value)
  );
}

function isDemoCase(value: unknown): value is DemoCase {
  if (
    !isRecord(value) ||
    !isRecord(value.school) ||
    !isRecord(value.student) ||
    !isRecord(value.followUps) ||
    !isRecord(value.receipts) ||
    !isRecord(value.demand) ||
    !isRecord(value.decision) ||
    !isRecord(value.execution) ||
    !isRecord(value.timetable) ||
    !isRecord(value.stage)
  ) {
    return false;
  }

  return (
    typeof value.caseId === "string" &&
    isDemoStage(value.currentStage) &&
    typeof value.school.name === "string" &&
    typeof value.student.name === "string" &&
    typeof value.question === "string" &&
    isStringArray(value.conditions) &&
    typeof value.followUps.personal === "string" &&
    typeof value.followUps.collective === "string" &&
    typeof value.receipts.private === "string" &&
    typeof value.receipts.collective === "string" &&
    Array.isArray(value.receipts.privateTimeline) &&
    value.receipts.privateTimeline.every(isTimelineEntry) &&
    typeof value.demand.sameIssue === "number" &&
    typeof value.demand.sameRequiredCourse === "number" &&
    typeof value.demand.schoolVerificationRate === "number" &&
    typeof value.decision.summary === "string" &&
    typeof value.execution.summary === "string" &&
    typeof value.timetable.totalCredits === "number" &&
    typeof value.timetable.addedCourse === "string" &&
    isRecord(value.timetable.image) &&
    typeof value.timetable.image.src === "string" &&
    typeof value.timetable.image.alt === "string" &&
    typeof value.timetable.image.width === "number" &&
    typeof value.timetable.image.height === "number" &&
    typeof value.timetable.nextAction === "string" &&
    typeof value.stage.title === "string" &&
    typeof value.stage.status === "string" &&
    Array.isArray(value.allowedActions) &&
    value.allowedActions.every(isDemoAction)
  );
}

function readApiError(value: unknown) {
  if (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return "데모 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

async function readDemoResponse(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new DemoRequestError("데모 서버 응답을 확인하지 못했습니다.");
  }

  if (!response.ok) {
    throw new DemoRequestError(readApiError(payload));
  }

  if (!isRecord(payload) || !isDemoCase(payload.data)) {
    throw new DemoRequestError("데모 상태 형식이 올바르지 않습니다.");
  }

  return payload.data;
}

export async function loadDemoCase() {
  const response = await fetch("/api/demo-case", {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  return readDemoResponse(response);
}

export async function advanceDemoCase(stage: DemoStage, action: DemoAction) {
  const response = await fetch("/api/demo-case/transition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, action }),
    signal: AbortSignal.timeout(10_000),
  });

  return readDemoResponse(response);
}
