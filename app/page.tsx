"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { SourceList } from "@/components/chat/SourceList";
import {
  advanceDemoCase,
  DemoRequestError,
  loadDemoCase,
} from "@/lib/univ-agent/demo-client";
import {
  DEMO_STAGES,
  type DemoAction,
  type DemoCase,
  type DemoStage,
} from "@/lib/univ-agent/demo-case";
import type {
  AnswerPayload,
  AnswerResult,
  EvidenceSource,
} from "@/lib/univ-agent/types";

type StageId =
  | "ask"
  | "thinking"
  | "official"
  | "no-evidence"
  | "answer-error"
  | "private-prefill"
  | "private-verification"
  | "private-receipt"
  | "collective-prefill"
  | "collective-issue"
  | "decision"
  | "final";

type StageTone = "idle" | "checking" | "official" | "personal" | "collective";

const stageIds = [
  "ask",
  "thinking",
  "official",
  "no-evidence",
  "answer-error",
  "private-prefill",
  "private-verification",
  "private-receipt",
  "collective-prefill",
  "collective-issue",
  "decision",
  "final",
] as const satisfies readonly StageId[];

const DEMO_SESSION_KEY = "univ-agent:demo-session:v1";

interface DemoSessionSnapshot {
  version: 1;
  caseId: string;
  demoStage: DemoStage;
  uiStage: StageId;
  input: string;
  submittedQuestion: string;
  answerResult: AnswerResult | null;
  answerError: string | null;
}

const officialQuestion =
  "전 학기 3.5 이상인 군복학생인데 이번 학기 최대 몇 학점까지 신청할 수 있나요?";

const privateQuestion = "KLAS에는 21학점으로 표시돼요";

const uiStageByDemoStage: Record<DemoStage, StageId> = {
  home: "ask",
  ask: "ask",
  thinking: "thinking",
  official_answer: "official",
  official_followup_prefill: "private-prefill",
  private_verification: "private-verification",
  private_receipt: "private-receipt",
  collective_followup_prefill: "collective-prefill",
  collective_issue: "collective-issue",
  decision_and_execution: "decision",
  final_timetable: "final",
};

class AnswerRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEvidenceSource(value: unknown): value is EvidenceSource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.sourceUrl === "string" &&
    (typeof value.publishedAt === "string" || value.publishedAt === null) &&
    (typeof value.updatedAt === "string" || value.updatedAt === null) &&
    typeof value.effectivePeriod === "string" &&
    typeof value.department === "string" &&
    typeof value.location === "string" &&
    typeof value.excerpt === "string" &&
    typeof value.verifiedAt === "string"
  );
}

function isAnswerResult(value: unknown): value is AnswerResult {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.meta)) {
    return false;
  }

  const { data, meta } = value;

  return (
    [
      "answered",
      "needs_personal_verification",
      "needs_collective_review",
      "insufficient_evidence",
    ].includes(String(data.status)) &&
    ["official", "personal", "collective"].includes(
      String(data.responsibility),
    ) &&
    typeof data.conclusion === "string" &&
    typeof data.explanation === "string" &&
    isStringArray(data.verifiedFacts) &&
    isStringArray(data.unverifiedFacts) &&
    typeof data.nextAction === "string" &&
    Array.isArray(data.sources) &&
    data.sources.every(isEvidenceSource) &&
    ["openai", "verified_demo_fallback", "rule_based_routing"].includes(
      String(meta.generationMode),
    ) &&
    (typeof meta.model === "string" || meta.model === null) &&
    typeof meta.evidenceCount === "number" &&
    (value.warning === undefined || typeof value.warning === "string")
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

  return "답변 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function readRequestError(error: unknown) {
  if (error instanceof DemoRequestError) {
    return error.message;
  }

  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "데모 상태 확인 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "데모 서버와 연결할 수 없습니다. 연결 상태를 확인해 주세요.";
}

function isStageId(value: unknown): value is StageId {
  return (
    typeof value === "string" &&
    stageIds.some((candidate) => candidate === value)
  );
}

function isDemoStage(value: unknown): value is DemoStage {
  return (
    typeof value === "string" &&
    DEMO_STAGES.some((candidate) => candidate === value)
  );
}

function isRestorableStagePair(demoStage: DemoStage, uiStage: StageId) {
  if (demoStage === "thinking") {
    return ["thinking", "no-evidence", "answer-error"].includes(uiStage);
  }

  if (demoStage === "ask" && uiStage === "answer-error") {
    return true;
  }

  return uiStageByDemoStage[demoStage] === uiStage;
}

function isDemoSessionSnapshot(value: unknown): value is DemoSessionSnapshot {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.caseId !== "string" ||
    !isDemoStage(value.demoStage) ||
    !isStageId(value.uiStage) ||
    typeof value.input !== "string" ||
    typeof value.submittedQuestion !== "string" ||
    !(value.answerResult === null || isAnswerResult(value.answerResult)) ||
    !(value.answerError === null || typeof value.answerError === "string") ||
    !isRestorableStagePair(value.demoStage, value.uiStage)
  ) {
    return false;
  }

  if (
    value.uiStage === "official" &&
    (!value.answerResult ||
      value.answerResult.data.status === "insufficient_evidence")
  ) {
    return false;
  }

  return !(
    value.uiStage === "no-evidence" &&
    (!value.answerResult ||
      value.answerResult.data.status !== "insufficient_evidence")
  );
}

function clearDemoSession() {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    return;
  }
}

function readDemoSession() {
  try {
    const storedValue = window.sessionStorage.getItem(DEMO_SESSION_KEY);

    if (!storedValue) {
      return null;
    }

    const snapshot: unknown = JSON.parse(storedValue);

    if (!isDemoSessionSnapshot(snapshot)) {
      clearDemoSession();
      return null;
    }

    return snapshot;
  } catch {
    clearDemoSession();
    return null;
  }
}

function writeDemoSession(snapshot: DemoSessionSnapshot) {
  try {
    window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    return;
  }
}

const stageOrder: StageId[] = [
  "ask",
  "thinking",
  "official",
  "private-prefill",
  "private-verification",
  "private-receipt",
  "collective-prefill",
  "collective-issue",
  "decision",
  "final",
];

const stageMeta: Record<
  StageId,
  {
    label: string;
    nav: "chat" | "official" | "personal" | "collective" | "complete";
    tone: StageTone;
    railTitle: string;
    railBody: string;
    owner: string;
    ownerDetail: string;
    next: string;
    nextDetail: string;
  }
> = {
  ask: {
    label: "질문 작성 중",
    nav: "chat",
    tone: "idle",
    railTitle: "조건을 먼저 확인해요",
    railBody: "공식 문서를 찾기 전에 답을 바꾸는 개인 조건을 분리합니다.",
    owner: "학생",
    ownerDetail: "질문의 목적과 조건을 입력",
    next: "공식 근거 검색",
    nextDetail: "조건 확인 후 바로 시작",
  },
  thinking: {
    label: "근거 확인 중",
    nav: "chat",
    tone: "checking",
    railTitle: "공식 근거를 찾고 있어요",
    railBody: "학칙 시행세칙과 2026-1 수강신청 안내를 대조합니다.",
    owner: "공식 문서",
    ownerDetail: "학칙 시행세칙 · 수강신청 안내",
    next: "근거가 확인되면 답변",
    nextDetail: "적용 조건과 출처를 함께 표시",
  },
  official: {
    label: "공식 답변 완료",
    nav: "official",
    tone: "official",
    railTitle: "근거와 조건이 확인됐어요",
    railBody: "학교 원문을 기준으로 일반 규칙에 답했습니다.",
    owner: "공식 문서",
    ownerDetail: "교육지원팀 · 수강신청 안내",
    next: "연계 질문",
    nextDetail: "개인 KLAS 표시가 다르면 확인 요청",
  },
  "no-evidence": {
    label: "공식 근거 없음",
    nav: "official",
    tone: "idle",
    railTitle: "추측하지 않고 확인을 멈췄어요",
    railBody: "현재 연결된 광운대학교 공식 자료에서 질문에 직접 답하는 근거를 찾지 못했습니다.",
    owner: "학생",
    ownerDetail: "질문 범위를 구체화",
    next: "공식 근거 다시 확인",
    nextDetail: "질문을 수정한 뒤 다시 시도",
  },
  "answer-error": {
    label: "답변 확인 실패",
    nav: "chat",
    tone: "idle",
    railTitle: "요청을 완료하지 못했어요",
    railBody: "질문은 유지했습니다. 같은 내용으로 다시 시도할 수 있습니다.",
    owner: "시스템",
    ownerDetail: "연결 상태와 서버 응답 확인",
    next: "다시 시도",
    nextDetail: "실패한 질문을 그대로 재전송",
  },
  "private-prefill": {
    label: "개인 조건 확인",
    nav: "personal",
    tone: "personal",
    railTitle: "개인 상태 질문으로 분리해요",
    railBody: "공식 규칙과 KLAS 표시 차이를 별도 사안으로 확인합니다.",
    owner: "학생",
    ownerDetail: "질문 내용을 확인한 뒤 전송",
    next: "담당 부서 확인",
    nextDetail: "외부 연동 없는 데모 요청 생성",
  },
  "private-verification": {
    label: "개인 확인 데모",
    nav: "personal",
    tone: "personal",
    railTitle: "담당 부서 확인이 필요한 상태예요",
    railBody: "실제 접수 없이 데모 사안으로 개인 확인 요청을 구성합니다.",
    owner: "교육지원팀",
    ownerDetail: "데모 처리 주체",
    next: "처리 영수증",
    nextDetail: "PRI-24116 기록 생성",
  },
  "private-receipt": {
    label: "개인 확정 데모",
    nav: "personal",
    tone: "personal",
    railTitle: "개인 상태 정정 결과를 기록했어요",
    railBody: "처리 완료처럼 보이는 외부 연동이 아니라 데모 영수증입니다.",
    owner: "교육지원팀",
    ownerDetail: "PRI-24116 · 데모 기록",
    next: "집단 사안",
    nextDetail: "같은 문제를 겪는 학생 수요 확인",
  },
  "collective-prefill": {
    label: "집단 질문 확인",
    nav: "collective",
    tone: "collective",
    railTitle: "공동 문제로 전환하기 전 확인해요",
    railBody: "개인 KLAS 표시와 필수과목 정원 문제는 책임 수준이 다릅니다.",
    owner: "학생",
    ownerDetail: "공동 문제 질문 확인",
    next: "인증 수요 확인",
    nextDetail: "데모 대표성 데이터 표시",
  },
  "collective-issue": {
    label: "집단 사안 데모",
    nav: "collective",
    tone: "collective",
    railTitle: "인증된 수요를 모았어요",
    railBody: "47명 같은 문제, 23명 동일 필수과목 수요를 데모 데이터로 보여줍니다.",
    owner: "학생회",
    ownerDetail: "대표성 검토 · 데모",
    next: "학교 결정",
    nextDetail: "분반 증설 결정과 실행 분리",
  },
  decision: {
    label: "결정·실행 데모",
    nav: "collective",
    tone: "collective",
    railTitle: "학교 결정과 KLAS 실행을 구분했어요",
    railBody: "결정문만 있는 상태를 실행 완료로 표시하지 않습니다.",
    owner: "학교 본부",
    ownerDetail: "수업 운영 결정 · 데모",
    next: "최종 시간표",
    nextDetail: "학생이 신청 가능한 결과 확인",
  },
  final: {
    label: "학생 목표 완료",
    nav: "complete",
    tone: "official",
    railTitle: "22학점 시간표가 완성됐어요",
    railBody: "최종 결과도 데모 데이터이며 실제 KLAS 반영을 의미하지 않습니다.",
    owner: "학생",
    ownerDetail: "수강신청 당일 확정된 시간표로 신청",
    next: "완료",
    nextDetail: "CONV-0832 · PRI-24116 · COL-0088",
  },
};

const navItems = [
  ["chat", "내 대화"],
  ["official", "공식 답변"],
  ["personal", "담당자 확인"],
  ["collective", "함께 해결"],
  ["complete", "완료된 기록"],
] as const;

export default function Home() {
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<StageId>("ask");
  const [input, setInput] = useState(officialQuestion);
  const [submittedQuestion, setSubmittedQuestion] = useState(officialQuestion);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [demoCase, setDemoCase] = useState<DemoCase | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const meta = stageMeta[stage];
  const stageIndex =
    stage === "no-evidence" || stage === "answer-error"
      ? stageOrder.indexOf("thinking")
      : stageOrder.indexOf(stage);

  const records = useMemo(() => {
    const base = ["질문 접수"];

    if (stageIndex >= 1) base.push("공식 근거 확인");
    if (stageIndex >= 2) base.push("공식 답변");
    if (stageIndex >= 4) base.push("개인 확인 요청");
    if (stageIndex >= 5) base.push(`${demoCase?.receipts.private ?? "PRI-24116"} 영수증`);
    if (stageIndex >= 7) base.push(`${demoCase?.receipts.collective ?? "COL-0088"} 집단 사안`);
    if (stageIndex >= 8) base.push("학교 결정 · KLAS 실행");
    if (stageIndex >= 9) base.push("목표 완료");

    return base;
  }, [demoCase, stageIndex]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const snapshot = readDemoSession();

      if (!snapshot) {
        await Promise.resolve();

        if (!cancelled) {
          setHasRestoredSession(true);
        }
        return;
      }

      try {
        const restoredCase = await loadDemoCase(snapshot.demoStage);

        if (cancelled) {
          return;
        }

        if (restoredCase.caseId !== snapshot.caseId) {
          clearDemoSession();
          setTransitionError(
            "이전 데모 기록이 현재 시나리오와 달라 새 세션으로 시작합니다.",
          );
          return;
        }

        const wasInterrupted = snapshot.uiStage === "thinking";

        setDemoCase(restoredCase);
        setStage(wasInterrupted ? "answer-error" : snapshot.uiStage);
        setInput(snapshot.input);
        setSubmittedQuestion(snapshot.submittedQuestion);
        setAnswerResult(snapshot.answerResult);
        setAnswerError(
          wasInterrupted
            ? "페이지가 새로고침되어 진행 중이던 확인이 중단됐습니다. 같은 질문으로 다시 시도해 주세요."
            : snapshot.answerError,
        );
        setStarted(true);
      } catch (error) {
        if (!cancelled) {
          setTransitionError(readRequestError(error));
        }
      } finally {
        if (!cancelled) {
          setHasRestoredSession(true);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredSession || !started || !demoCase) {
      return;
    }

    writeDemoSession({
      version: 1,
      caseId: demoCase.caseId,
      demoStage: demoCase.currentStage,
      uiStage: stage,
      input,
      submittedQuestion,
      answerResult,
      answerError,
    });
  }, [
    answerError,
    answerResult,
    demoCase,
    hasRestoredSession,
    input,
    stage,
    started,
    submittedQuestion,
  ]);

  function applyDemoCase(nextCase: DemoCase) {
    setDemoCase(nextCase);
    setStage(uiStageByDemoStage[nextCase.currentStage]);

    if (nextCase.currentStage === "official_followup_prefill") {
      setInput(nextCase.followUps.personal);
    }

    if (nextCase.currentStage === "collective_followup_prefill") {
      setInput(nextCase.followUps.collective);
    }
  }

  async function startDemo() {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    setTransitionError(null);

    try {
      const initialCase = await loadDemoCase();
      const askCase = await advanceDemoCase(initialCase.currentStage, "START_DEMO");
      setInput(askCase.question);
      setSubmittedQuestion(askCase.question);
      applyDemoCase(askCase);
      setStarted(true);
    } catch (error) {
      setTransitionError(readRequestError(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function moveDemo(action: DemoAction) {
    if (!demoCase || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setTransitionError(null);

    try {
      const nextCase = await advanceDemoCase(demoCase.currentStage, action);
      applyDemoCase(nextCase);
    } catch (error) {
      setTransitionError(readRequestError(error));
    } finally {
      setIsTransitioning(false);
    }
  }

  async function requestOfficialAnswer(question: string) {
    const normalizedQuestion = question.trim();

    if (!normalizedQuestion || isTransitioning) {
      return;
    }

    setSubmittedQuestion(normalizedQuestion);
    setAnswerResult(null);
    setAnswerError(null);
    setIsTransitioning(true);
    setTransitionError(null);

    try {
      if (!demoCase) {
        throw new AnswerRequestError("데모 질문 상태를 확인하지 못했습니다.");
      }

      let activeCase = demoCase;

      if (activeCase.currentStage === "ask") {
        activeCase = await advanceDemoCase(
          activeCase.currentStage,
          "SUBMIT_QUESTION",
        );
        applyDemoCase(activeCase);
      } else if (activeCase.currentStage !== "thinking") {
        throw new AnswerRequestError("현재 단계에서는 공식 답을 다시 요청할 수 없습니다.");
      }

      const [response] = await Promise.all([
        fetch("/api/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: normalizedQuestion,
            conditions: activeCase.conditions,
          }),
          signal: AbortSignal.timeout(25_000),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 450)),
      ]);

      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new AnswerRequestError(readApiError(payload));
      }

      if (!isAnswerResult(payload)) {
        throw new AnswerRequestError(
          "답변 형식을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      setAnswerResult(payload);

      if (payload.data.status === "insufficient_evidence") {
        setStage("no-evidence");
      } else {
        const officialCase = await advanceDemoCase(
          activeCase.currentStage,
          "RESOLVE_OFFICIAL_ANSWER",
        );
        applyDemoCase(officialCase);
      }
    } catch (error) {
      setAnswerError(
        error instanceof AnswerRequestError
          ? error.message
          : error instanceof DemoRequestError
            ? error.message
          : error instanceof Error &&
              (error.name === "TimeoutError" || error.name === "AbortError")
          ? "답변 확인 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요."
          : "서버와 연결할 수 없습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
      );
      setStage("answer-error");
    } finally {
      setIsTransitioning(false);
    }
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const value = input.trim();

    if (!value || stage === "thinking") {
      return;
    }

    if (stage === "ask" || stage === "no-evidence" || stage === "answer-error") {
      void requestOfficialAnswer(value);
      return;
    }

    setSubmittedQuestion(value);

    if (stage === "private-prefill") {
      void moveDemo("SUBMIT_PRIVATE_FOLLOWUP");
      return;
    }

    if (stage === "collective-prefill") {
      void moveDemo("SUBMIT_COLLECTIVE_FOLLOWUP");
    }
  }

  if (!hasRestoredSession) {
    return <SessionRestoreLoading />;
  }

  if (!started) {
    return (
      <Landing
        error={transitionError}
        isStarting={isStarting}
        onStart={() => void startDemo()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-panel)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col overflow-hidden border-x border-[var(--border-default)] bg-[var(--surface-panel)] lg:h-screen lg:flex-row">
        <SideNavigation
          active={meta.nav}
          status={meta.label}
          student={demoCase?.student}
        />

        <main className="relative flex min-h-[760px] flex-1 flex-col bg-[var(--surface-panel)] lg:h-screen">
          <header className="flex min-h-20 items-center justify-between border-b border-[var(--border-default)] px-6 sm:px-10">
            <div>
              <h1 className="text-2xl font-bold leading-8">22학점 시간표 확정</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                수강신청 · 오늘 · {demoCase?.caseId ?? "CONV-0832"}
              </p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <StatusPill tone="official">광운대 인증</StatusPill>
              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-5 py-6 pb-36 sm:px-10">
            <ChatMessage
              role="user"
              content={submittedQuestion}
              meta={`${demoCase?.student.name ?? "김민준"} · 14:04`}
            />
            {transitionError ? (
              <div
                className="mb-5 max-w-[820px] rounded-xl bg-[var(--status-error-bg)] p-4 text-sm font-medium text-[var(--status-error)]"
                role="alert"
              >
                {transitionError}
              </div>
            ) : null}
            <StageContent
              input={input}
              setInput={setInput}
              stage={stage}
              demoCase={demoCase}
              isTransitioning={isTransitioning}
              submittedQuestion={submittedQuestion}
              answerResult={answerResult}
              answerError={answerError}
              onAdvance={(action) => void moveDemo(action)}
              onRequestOfficialAnswer={() => void requestOfficialAnswer(input)}
              onRetry={() => void requestOfficialAnswer(submittedQuestion)}
            />
          </section>

          {stage !== "final" ? (
            <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),white_28%)] px-5 py-5 sm:px-10">
              <ChatInput
                id="chat-form"
                value={input}
                placeholder={
                  stage === "thinking"
                    ? "답변을 준비하는 동안 잠시만 기다려주세요"
                    : "이어서 질문해보세요"
                }
                disabled={isTransitioning || stage === "thinking" || stage === "official" || stage === "private-receipt" || stage === "decision"}
                submitLabel={
                  stage === "thinking"
                    ? "확인 중"
                    : stage === "no-evidence" || stage === "answer-error"
                      ? "다시 확인"
                      : "보내기"
                }
                onChange={setInput}
                onSubmit={submit}
              />
            </div>
          ) : null}
        </main>

        <ResponsibilityRail demoCase={demoCase} meta={meta} records={records} />
      </div>
    </div>
  );
}

function SessionRestoreLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-panel)] px-6 text-[var(--text-primary)]">
      <div className="rounded-2xl border border-[var(--border-default)] bg-white px-8 py-7 text-center shadow-sm">
        <p className="text-sm font-bold">데모 기록 확인 중</p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          이 탭에서 진행하던 단계를 불러오고 있어요.
        </p>
      </div>
    </main>
  );
}

function StageContent({
  stage,
  input,
  setInput,
  submittedQuestion,
  answerResult,
  answerError,
  demoCase,
  isTransitioning,
  onAdvance,
  onRequestOfficialAnswer,
  onRetry,
}: {
  stage: StageId;
  input: string;
  setInput: (value: string) => void;
  submittedQuestion: string;
  answerResult: AnswerResult | null;
  answerError: string | null;
  demoCase: DemoCase | null;
  isTransitioning: boolean;
  onAdvance: (action: DemoAction) => void;
  onRequestOfficialAnswer: () => void;
  onRetry: () => void;
}) {
  if (stage === "ask") {
    return (
      <div className="max-w-[760px]">
        <p className="text-xs font-bold text-[var(--text-secondary)]">질문 확인</p>
        <article className="mt-3 rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6">
          <h2 className="text-xl font-bold leading-8">정확한 답을 위해 조건을 확인할게요</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            학점 상한은 성적과 복학 상태에 따라 달라질 수 있어요. 아래 조건이 맞는지 확인한 뒤 공식 근거 검색을 시작합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(demoCase?.conditions ?? ["평점 3.5 이상", "군 복학 예정"])
              .slice(0, 2)
              .map((condition) => (
                <StaticChip key={condition}>{condition}</StaticChip>
              ))}
          </div>
          <div className="mt-6 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">이 단계에서는 학번이나 성적표 원문을 보내지 않아요.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              답을 찾는 데 필요한 조건만 대화 기록에 남습니다.
            </p>
          </div>
        </article>
        <button
          className="btn-primary mt-7 h-12 px-6"
          disabled={!input.trim() || isTransitioning}
          onClick={onRequestOfficialAnswer}
        >
          {isTransitioning ? "확인 중" : "공식 근거로 확인하기"}
        </button>
      </div>
    );
  }

  if (stage === "thinking") {
    return <LoadingMessage question={submittedQuestion} />;
  }

  if (stage === "answer-error") {
    return <AnswerError message={answerError} onRetry={onRetry} />;
  }

  if (stage === "no-evidence" && answerResult) {
    return <NoEvidence answer={answerResult.data} />;
  }

  if (stage === "official" && answerResult) {
    return (
      <div className="max-w-[860px] animate-enter">
        <p className="text-xs font-bold text-[var(--status-official)]">학교 답변 · 공식 근거</p>
        <article className="mt-3 rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6">
          <StatusPill tone="official">공식 답변</StatusPill>
          <h2 className="mt-5 text-2xl font-bold leading-9">{answerResult.data.conclusion}</h2>
          <ChatMessage
            role="assistant"
            content={answerResult.data.explanation}
          />
          <VerifiedFacts facts={answerResult.data.verifiedFacts} />
          <SourceList sources={answerResult.data.sources} />
          {answerResult.warning ? (
            <p className="mt-4 rounded-xl bg-white p-4 text-xs leading-5 text-[var(--text-secondary)]">
              {answerResult.warning}
            </p>
          ) : null}
          <div className="mt-5 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">
              대화 기록 {demoCase?.caseId ?? "CONV-0832"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {answerResult.data.nextAction}
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
            개인 화면과 다르게 보이면, 아래 질문으로 바로 이어갈 수 있어요.
          </p>
        </article>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="chip"
            disabled={isTransitioning}
            type="button"
            onClick={() => onAdvance("PREFILL_PRIVATE_FOLLOWUP")}
          >
            {demoCase?.followUps.personal ?? privateQuestion}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "private-prefill") {
    return (
      <PrefillPanel
        tone="personal"
        title="개인 조건이 포함된 후속 질문을 확인해 주세요"
        body="공식 답과 KLAS 표시가 다른 문제는 개인 상태 확인이 필요한 별도 사안입니다."
        value={input}
        busy={isTransitioning}
        onChange={setInput}
        onSubmit={() => onAdvance("SUBMIT_PRIVATE_FOLLOWUP")}
      />
    );
  }

  if (stage === "private-verification") {
    return (
      <IssuePanel
        tone="personal"
        eyebrow="개인 확인 · 데모 요청"
        title="KLAS 표시가 21학점인 이유를 담당 부서 확인 사안으로 분리했어요"
        body="이 화면은 실제 부서로 요청을 보내지 않습니다. 해커톤 데모를 위해 처리 주체, 상태, 다음 행동을 일관된 기록으로 보여줍니다."
        facts={["현재 공식 답: 최대 22학점", "현재 KLAS 표시: 21학점", "확인 담당: 교육지원팀"]}
        actionLabel="개인 확인 요청 만들기"
        busy={isTransitioning}
        onAction={() => onAdvance("CREATE_PRIVATE_REQUEST")}
      />
    );
  }

  if (stage === "private-receipt") {
    return (
      <ReceiptPanel
        title="개인 상태 정정 영수증"
        receipt={demoCase?.receipts.private ?? "PRI-24116"}
        tone="personal"
        rows={(demoCase?.receipts.privateTimeline ?? []).map(
          ({ time, event, owner }) => [time, event, owner],
        )}
        note="실제 KLAS에 반영된 결과가 아니라 데모 기록입니다."
        actionLabel="같은 문제를 겪는 학생 수요 확인"
        busy={isTransitioning}
        onAction={() => onAdvance("PREFILL_COLLECTIVE_FOLLOWUP")}
      />
    );
  }

  if (stage === "collective-prefill") {
    return (
      <PrefillPanel
        tone="collective"
        title="집단 문제로 전환할 질문을 확인해 주세요"
        body="필수과목 정원 부족은 개인 학적 정정과 다른 책임 수준입니다."
        value={input}
        busy={isTransitioning}
        onChange={setInput}
        onSubmit={() => onAdvance("SUBMIT_COLLECTIVE_FOLLOWUP")}
      />
    );
  }

  if (stage === "collective-issue") {
    return (
      <IssuePanel
        tone="collective"
        eyebrow="집단 사안 · 데모 대표성"
        title="같은 문제를 겪는 인증된 수요가 모였어요"
        body="학생회 검토와 학교 판단은 실제 외부 시스템 연동 없이 데모 데이터로 표시합니다."
        facts={[
          `${demoCase?.demand.sameIssue ?? 47}명 같은 문제`,
          `${demoCase?.demand.sameRequiredCourse ?? 23}명 동일 필수과목 수요`,
          `${demoCase?.demand.schoolVerificationRate ?? 100}% 학교 인증 상태`,
        ]}
        actionLabel="집단 사안으로 전환"
        busy={isTransitioning}
        onAction={() => onAdvance("ESCALATE_COLLECTIVE_ISSUE")}
      />
    );
  }

  if (stage === "decision") {
    return (
      <IssuePanel
        tone="collective"
        eyebrow="학교 결정과 KLAS 실행 · 데모"
        title="필수과목 분반 증설 결정과 KLAS 정원 반영을 분리해 기록했어요"
        body="결정문이 있다는 사실과 KLAS 실행 반영은 서로 다른 상태입니다. 이 화면은 데모 실행 기록을 보여줍니다."
        facts={[
          `학교 결정: ${demoCase?.decision.summary ?? "필수과목 분반 증설"}`,
          `${demoCase?.execution.system ?? "KLAS"} 실행: ${demoCase?.execution.summary ?? "정원 반영 완료로 표시"}`,
          `사안 기록: ${demoCase?.receipts.collective ?? "COL-0088"}`,
        ]}
        actionLabel="확정된 시간표 보기"
        busy={isTransitioning}
        onAction={() => onAdvance("VIEW_FINAL_TIMETABLE")}
      />
    );
  }

  return <FinalTimetable demoCase={demoCase} />;
}

function Landing({
  error,
  isStarting,
  onStart,
}: {
  error: string | null;
  isStarting: boolean;
  onStart: () => void;
}) {
  return (
    <main className="min-h-screen bg-[var(--surface-panel)] text-[var(--text-primary)]">
      <div className="bg-[var(--action-primary)] px-6 py-3 text-center text-sm font-medium text-white">
        공식 답 → 개인 확인 → 집단 결정과 실행, 질문의 책임 수준을 연결합니다
      </div>
      <nav className="mx-auto flex h-20 max-w-[1600px] items-center justify-between border-b border-[var(--border-default)] px-6 sm:px-14 lg:px-[88px]">
        <div className="flex items-baseline gap-4">
          <span className="text-[22px] font-bold">학교생활</span>
          <span className="text-xs font-medium text-[var(--text-secondary)]">대학 행정 대화</span>
        </div>
        <button
          className="btn-primary h-[54px] px-5"
          disabled={isStarting}
          onClick={onStart}
        >
          {isStarting ? "연결 중" : "로그인하기"}
        </button>
      </nav>

      <section className="mx-auto grid max-w-[1600px] gap-12 px-6 py-14 sm:px-14 lg:grid-cols-[minmax(0,1fr)_724px] lg:px-[88px]">
        <div className="pt-4">
          <StatusPill tone="checking">대학 행정 경험 SaaS</StatusPill>
          <h1 className="mt-9 max-w-3xl text-4xl font-bold leading-[1.25] sm:text-5xl">
            학교의 답을 찾고,
            <br />
            내 상황을 확인하고,
            <br />
            <span className="text-[var(--action-primary)]">함께 바꾸는 하나의 대화</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            공식 문서의 답부터 내 조건의 확정, 함께 겪는 문제의 결정과 실행까지. 대학 행정의 답을 하나의 이슈 기록으로 연결합니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button
              className="btn-primary h-[54px] px-8"
              disabled={isStarting}
              onClick={onStart}
            >
              {isStarting ? "데모 상태 연결 중" : "로그인하기"}
            </button>
            <button
              className="btn-secondary h-[54px] px-8"
              onClick={() => document.getElementById("value-flow")?.scrollIntoView({ behavior: "smooth" })}
            >
              작동 방식 보기
            </button>
          </div>
          <p className="mt-5 text-sm font-medium text-[var(--text-secondary)]">
            합성된 데모 계정으로 진입하며 실제 광운대학교 SSO는 사용하지 않습니다.
          </p>
          {error ? (
            <p
              className="mt-4 rounded-xl bg-[var(--status-error-bg)] p-4 text-sm font-medium text-[var(--status-error)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="preview-card animate-enter">
          <div className="h-14 border-b border-[var(--border-default)]" />
          <div className="grid min-h-[486px] grid-cols-[150px_minmax(0,1fr)_150px] bg-[var(--surface-app)]">
            <div className="border-r border-[var(--border-default)] p-4">
              <p className="font-bold">학교생활</p>
              <div className="mt-4 rounded-xl bg-white p-3">
                <p className="text-xs font-bold">광운대학교</p>
                <p className="mt-1 text-[11px] text-[var(--status-official)]">인증됨</p>
              </div>
              <div className="mt-8 space-y-2 text-xs text-[var(--text-secondary)]">
                <p>내 대화</p>
                <p className="rounded-lg bg-[var(--surface-selected)] p-2 font-bold text-[var(--text-primary)]">공식 답변</p>
                <p>담당자 확인</p>
                <p>함께 해결</p>
              </div>
            </div>
            <div className="bg-white p-6">
              <div className="ml-auto max-w-[300px] rounded-[14px] rounded-br-md bg-[var(--action-primary)] p-4 text-sm font-medium leading-6 text-white">
                군복학생인데 이번 학기 최대 몇 학점까지 신청할 수 있나요?
              </div>
              <div className="mt-6 rounded-2xl bg-[var(--surface-app)] p-5">
                <StatusPill tone="official">공식 답변</StatusPill>
                <h2 className="mt-4 text-xl font-bold">최대 22학점까지 신청할 수 있어요</h2>
                <div className="mt-5 rounded-xl bg-[var(--status-official-bg)] p-4">
                  <p className="text-xs font-bold text-[var(--status-official)]">확인한 공식 근거</p>
                  <p className="mt-2 text-sm font-bold">학칙 시행세칙 제23조</p>
                </div>
              </div>
            </div>
            <div className="border-l border-[var(--border-default)] p-4">
              <p className="text-sm font-bold">진행 상황</p>
              <div className="mt-4">
                <StatusPill tone="official">공식 답변</StatusPill>
              </div>
              <ol className="mt-8 space-y-5 text-xs">
                <li>질문 접수</li>
                <li>근거 확인</li>
                <li className="font-bold text-[var(--status-official)]">공식 답변 완료</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="value-flow" className="mx-auto max-w-[1600px] px-6 pb-14 sm:px-14 lg:px-[88px]">
        <h2 className="text-2xl font-bold">질문이 달라지면, 필요한 책임의 수준도 달라집니다</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            ["01", "공식 답", "학교 원문과 적용 조건을 함께 보여줘요."],
            ["02", "개인 확인", "담당 부서의 처리 과정과 답변을 영수증으로 남겨요."],
            ["03", "함께 해결", "본인인증 수요를 학생회 검토와 학교 실행까지 연결해요."],
          ].map(([number, title, body]) => (
            <article key={number} className="rounded-2xl bg-[var(--surface-app)] p-6">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-[var(--status-official-bg)] text-xs font-bold text-[var(--status-official)]">
                {number}
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function VerifiedFacts({ facts }: { facts: string[] }) {
  if (facts.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 rounded-xl bg-white p-4">
      <h3 className="text-sm font-bold">확인된 적용 기준</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
        {facts.map((fact) => (
          <li className="flex gap-2" key={fact}>
            <span aria-hidden="true" className="font-bold text-[var(--status-official)]">
              ✓
            </span>
            <span>{fact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoEvidence({ answer }: { answer: AnswerPayload }) {
  return (
    <article className="max-w-[820px] rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6 animate-enter">
      <StatusPill tone="idle">공식 근거 없음</StatusPill>
      <h2 className="mt-5 text-2xl font-bold leading-9">{answer.conclusion}</h2>
      <ChatMessage role="assistant" content={answer.explanation} />
      <SourceList sources={answer.sources} />
      {answer.unverifiedFacts.length > 0 ? (
        <section className="mt-5 rounded-xl bg-white p-4">
          <h3 className="text-sm font-bold">아직 확인되지 않은 내용</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--text-secondary)]">
            {answer.unverifiedFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
        {answer.nextAction} 아래 입력창에서 질문을 수정해 다시 확인할 수 있어요.
      </p>
    </article>
  );
}

function AnswerError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <article
      className="max-w-[760px] rounded-[18px] rounded-tl-md bg-[var(--status-error-bg)] p-6 animate-enter"
      role="alert"
    >
      <StatusPill tone="error">답변 확인 실패</StatusPill>
      <h2 className="mt-5 text-2xl font-bold leading-9">질문은 그대로 보관했어요</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {message ?? "답변을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."}
      </p>
      <button className="btn-primary mt-6 h-12 px-6" onClick={onRetry} type="button">
        같은 질문으로 다시 시도
      </button>
    </article>
  );
}

function PrefillPanel({
  tone,
  title,
  body,
  value,
  busy,
  onChange,
  onSubmit,
}: {
  tone: StageTone;
  title: string;
  body: string;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <article className="max-w-[760px] rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6 animate-enter">
      <StatusPill tone={tone}>연계 질문 확인</StatusPill>
      <h2 className="mt-5 text-2xl font-bold leading-9">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      <label className="mt-6 block text-sm font-bold" htmlFor="prefill-question">
        전송할 질문
      </label>
      <textarea
        id="prefill-question"
        className="mt-3 min-h-24 w-full resize-none rounded-xl border border-[var(--border-default)] bg-white p-4 text-base leading-7 outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
        value={value}
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="btn-primary mt-5 h-12 px-6" onClick={onSubmit} disabled={!value.trim() || busy}>
        {busy ? "전송 중" : "전송하기"}
      </button>
    </article>
  );
}

function IssuePanel({
  tone,
  eyebrow,
  title,
  body,
  facts,
  actionLabel,
  busy,
  onAction,
}: {
  tone: StageTone;
  eyebrow: string;
  title: string;
  body: string;
  facts: string[];
  actionLabel: string;
  busy: boolean;
  onAction: () => void;
}) {
  return (
    <article className="max-w-[820px] rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6 animate-enter">
      <p className="text-xs font-bold text-[var(--text-secondary)]">{eyebrow}</p>
      <h2 className="mt-4 text-2xl font-bold leading-9">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact} className="rounded-xl bg-white p-4">
            <StatusPill tone={tone}>{tone === "personal" ? "개인 확인" : "집단 사안"}</StatusPill>
            <p className="mt-3 text-sm font-bold leading-6">{fact}</p>
          </div>
        ))}
      </div>
      <DemoNotice />
      <button className="btn-primary mt-6 h-12 px-6" disabled={busy} onClick={onAction}>
        {busy ? "처리 중" : actionLabel}
      </button>
    </article>
  );
}

function ReceiptPanel({
  title,
  receipt,
  tone,
  rows,
  note,
  actionLabel,
  busy,
  onAction,
}: {
  title: string;
  receipt: string;
  tone: StageTone;
  rows: [string, string, string][];
  note: string;
  actionLabel: string;
  busy: boolean;
  onAction: () => void;
}) {
  return (
    <article className="max-w-[820px] rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6 animate-enter">
      <StatusPill tone={tone}>{receipt}</StatusPill>
      <h2 className="mt-5 text-2xl font-bold leading-9">{title}</h2>
      <div className="mt-6 space-y-3">
        {rows.map(([time, event, owner]) => (
          <div key={`${time}-${event}`} className="grid grid-cols-[72px_minmax(0,1fr)_160px] gap-4 rounded-xl bg-white p-4 text-sm">
            <span className="font-bold text-[var(--text-muted)]">{time}</span>
            <span className="font-bold">{event}</span>
            <span className="text-[var(--text-secondary)]">{owner}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
      <button className="btn-primary mt-6 h-12 px-6" disabled={busy} onClick={onAction}>
        {busy ? "처리 중" : actionLabel}
      </button>
    </article>
  );
}

function FinalTimetable({ demoCase }: { demoCase: DemoCase | null }) {
  const timetable = demoCase?.timetable;
  const receipts = demoCase?.receipts;

  return (
    <article className="max-w-[936px] animate-enter">
      <p className="text-xs font-bold text-[var(--status-official)]">목표 완료 · 데모 시간표</p>
      <h2 className="mt-3 text-3xl font-bold leading-10">
        {timetable?.totalCredits ?? 22}학점 시간표가 신청 가능한 상태로 정리됐어요
      </h2>
      <div className="relative mt-6 overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-inset ring-[var(--border-default)]">
        <Image
          alt={
            timetable?.image.alt ??
            "광운대학교 22학점 수강 시간표. 수요일 0교시 정보디자인프로그래밍실습이 증설 반영 후 추가됨."
          }
          className="h-auto w-full"
          height={timetable?.image.height ?? 1199}
          priority
          src={timetable?.image.src ?? "/timetable-original.png"}
          width={timetable?.image.width ?? 2464}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[41.6667%] top-[11.25%] h-[31.875%] w-[16.7735%] rounded-xl border-2 border-[var(--status-official)]"
        />
        <span className="absolute left-[59.188%] top-[12.0833%] flex h-[6.25%] w-[16.0256%] items-center justify-center rounded-full bg-[var(--status-official-bg)] px-2 text-center text-[11px] font-bold leading-4 text-[var(--status-official)]">
          증설 반영 후 추가됨
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="처리 기록"
          body={`${demoCase?.caseId ?? "CONV-0832"} · ${receipts?.private ?? "PRI-24116"} · ${receipts?.collective ?? "COL-0088"}`}
        />
        <SummaryCard title="현재 담당" body="학생" />
        <SummaryCard
          title="다음 행동"
          body={timetable?.nextAction ?? "수강신청 당일 확정된 시간표로 신청"}
        />
      </div>
      <DemoNotice />
    </article>
  );
}

function SideNavigation({
  active,
  status,
  student,
}: {
  active: (typeof navItems)[number][0];
  status: string;
  student: DemoCase["student"] | undefined;
}) {
  return (
    <aside className="flex border-b border-[var(--border-default)] bg-[var(--surface-app)] p-4 lg:h-screen lg:w-[248px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:p-5">
      <div>
        <p className="text-lg font-bold">학교생활</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">광운대학교</p>
      </div>
      <div className="ml-6 hidden rounded-xl bg-white p-3 lg:ml-0 lg:mt-5 lg:block">
        <p className="text-sm font-bold">광운대학교</p>
        <p className="mt-1 text-xs text-[var(--status-official)]">학생 인증됨</p>
      </div>
      <nav className="ml-auto flex gap-2 lg:ml-0 lg:mt-10 lg:block lg:space-y-2">
        {navItems.map(([key, label]) => (
          <span
            key={key}
            className={`block rounded-xl px-4 py-3 text-sm ${
              active === key
                ? "bg-[var(--surface-selected)] font-bold text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </span>
        ))}
      </nav>
      <div className="mt-auto hidden lg:block">
        <div className="rounded-xl bg-[var(--surface-selected)] p-4">
          <p className="text-sm font-bold">22학점 시간표</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">수강신청 · 오늘</p>
          <p className="mt-3 text-xs font-medium text-[var(--action-primary)]">{status}</p>
        </div>
        {student ? (
          <div className="mt-5 border-t border-[var(--border-default)] pt-5">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-sm font-bold text-[var(--action-primary)]"
              >
                {student.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{student.name}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
                  {student.major} · {student.year}학년
                </p>
              </div>
              <span className="size-2 shrink-0 rounded-full bg-[var(--status-official)]">
                <span className="sr-only">합성 데모 학생 활성 상태</span>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ResponsibilityRail({
  demoCase,
  meta,
  records,
}: {
  demoCase: DemoCase | null;
  meta: (typeof stageMeta)[StageId];
  records: string[];
}) {
  return (
    <aside className="border-t border-[var(--border-default)] bg-white p-6 lg:h-screen lg:w-[336px] lg:shrink-0 lg:border-l lg:border-t-0">
      <h2 className="text-xl font-bold">진행 상황</h2>
      <div className="mt-3">
        <StatusPill tone={meta.tone}>
          {demoCase?.stage.status ?? meta.label}
        </StatusPill>
      </div>
      <section className="mt-5 rounded-2xl bg-[var(--surface-app)] p-4">
        <h3 className="text-[15px] font-bold leading-6">{meta.railTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{meta.railBody}</p>
      </section>
      <RailSection title="현재 담당" headline={meta.owner} body={meta.ownerDetail} />
      <RailSection title="다음 안내" headline={meta.next} body={meta.nextDetail} />
      {demoCase?.stage.demoNotice ? (
        <p className="mt-5 rounded-xl bg-[var(--surface-app)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
          {demoCase.stage.demoNotice}
        </p>
      ) : null}
      <section className="mt-7 border-t border-[var(--border-default)] pt-6">
        <p className="text-xs font-medium text-[var(--text-muted)]">이 대화의 기록</p>
        <ol className="mt-5 space-y-5">
          {records.map((record, index) => (
            <li className="flex gap-3 text-sm" key={record}>
              <span className={`mt-1 size-2 rounded-full ${index === records.length - 1 ? "bg-[var(--action-primary)]" : "bg-[var(--border-default)]"}`} />
              <span className={index === records.length - 1 ? "font-bold" : ""}>{record}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function RailSection({ title, headline, body }: { title: string; headline: string; body: string }) {
  return (
    <section className="mt-7 border-t border-[var(--border-default)] pt-6">
      <p className="text-xs font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-4 text-sm font-bold">{headline}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{body}</p>
    </section>
  );
}

function StatusPill({ tone, children }: { tone: StageTone | "error"; children: React.ReactNode }) {
  return (
    <span className={`status-pill status-${tone}`}>
      <span aria-hidden="true" className="status-dot" />
      {children}
    </span>
  );
}

function StaticChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--surface-selected)] px-4 py-2.5 text-sm leading-5 text-[var(--action-primary)]">
      {children}
    </span>
  );
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-app)] p-4">
      <p className="text-xs font-bold text-[var(--text-muted)]">{title}</p>
      <p className="mt-2 text-sm font-bold leading-6">{body}</p>
    </div>
  );
}

function DemoNotice() {
  return (
    <div className="mt-5 rounded-xl bg-white p-4">
      <p className="text-sm font-bold">데모 상태 안내</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
        실제 KLAS, 학교 SSO, 담당 부서 접수, 학생회 검토 또는 학교 결정 시스템과 연동하지 않았습니다.
      </p>
    </div>
  );
}
