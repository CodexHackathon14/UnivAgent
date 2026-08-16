"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { SourceList } from "@/components/chat/SourceList";

type StageId =
  | "ask"
  | "thinking"
  | "official"
  | "private-prefill"
  | "private-verification"
  | "private-receipt"
  | "collective-prefill"
  | "collective-issue"
  | "decision"
  | "final";

type StageTone = "idle" | "checking" | "official" | "personal" | "collective";

type Source = {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  department: string | null;
  excerpt: string;
  location?: string;
  checkedAt: string;
};

const officialQuestion =
  "전 학기 3.5 이상인 군복학생인데 이번 학기 최대 몇 학점까지 신청할 수 있나요?";

const privateQuestion = "KLAS에는 21학점으로 표시돼요";
const collectiveQuestion = "필수과목 정원이 이미 찼어요";

const checkedAt = new Date().toISOString();

const sources: Source[] = [
  {
    id: "kw-rule-23",
    title: "광운대학교 학칙 시행세칙 제23조",
    url: "https://www.kw.ac.kr/ko/life/bachelor_info05.jsp",
    publishedAt: null,
    department: "교육지원팀",
    excerpt:
      "전 학기 성적과 복학 등 적용 조건에 따라 수강신청 가능 학점이 달라질 수 있다.",
    location: "학사정보 · 수강신청/강의시간표",
    checkedAt,
  },
  {
    id: "kw-2026-1-registration",
    title: "2026학년도 1학기 수강신청 공고",
    url: "https://oia.kw.ac.kr/campus/notice.php?BoardMode=view&CURRENT_PAGE=1&UID=604",
    publishedAt: "2026-01-21",
    department: "국제교류팀",
    excerpt:
      "2026학년도 1학기 수강신청 기간, 대상, 변경기간과 수강신청 세부내용을 확인하도록 안내한다.",
    location: "광운대학교 글로벌전략팀 공지",
    checkedAt,
  },
];

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
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<StageId>("ask");
  const [input, setInput] = useState(officialQuestion);
  const [submittedQuestion, setSubmittedQuestion] = useState(officialQuestion);

  const meta = stageMeta[stage];
  const stageIndex = stageOrder.indexOf(stage);

  useEffect(() => {
    if (stage !== "thinking") {
      return;
    }

    const timer = window.setTimeout(() => {
      setStage("official");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [stage]);

  const records = useMemo(() => {
    const base = ["질문 접수"];

    if (stageIndex >= 1) base.push("공식 근거 확인");
    if (stageIndex >= 2) base.push("공식 답변");
    if (stageIndex >= 4) base.push("개인 확인 요청");
    if (stageIndex >= 5) base.push("PRI-24116 영수증");
    if (stageIndex >= 7) base.push("COL-0088 집단 사안");
    if (stageIndex >= 8) base.push("학교 결정 · KLAS 실행");
    if (stageIndex >= 9) base.push("목표 완료");

    return base;
  }, [stageIndex]);

  function goTo(nextStage: StageId) {
    if (nextStage === "private-prefill") setInput(privateQuestion);
    if (nextStage === "collective-prefill") setInput(collectiveQuestion);
    setStage(nextStage);
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const value = input.trim();

    if (!value || stage === "thinking") {
      return;
    }

    setSubmittedQuestion(value);

    if (stage === "ask") {
      setStage("thinking");
      return;
    }

    if (stage === "private-prefill") {
      setStage("private-verification");
      return;
    }

    if (stage === "collective-prefill") {
      setStage("collective-issue");
    }
  }

  if (!started) {
    return <Landing onStart={() => setStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-panel)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col overflow-hidden border-x border-[var(--border-default)] bg-[var(--surface-panel)] lg:h-screen lg:flex-row">
        <SideNavigation active={meta.nav} status={meta.label} />

        <main className="relative flex min-h-[760px] flex-1 flex-col bg-[var(--surface-panel)] lg:h-screen">
          <header className="flex min-h-20 items-center justify-between border-b border-[var(--border-default)] px-6 sm:px-10">
            <div>
              <h1 className="text-2xl font-bold leading-8">22학점 시간표 확정</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                수강신청 · 오늘 · CONV-0832
              </p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <StatusPill tone="official">광운대 인증</StatusPill>
              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-5 py-6 pb-36 sm:px-10">
            <ChatMessage role="user" content={submittedQuestion} meta="김민준 · 14:04" />
            <StageContent
              input={input}
              setInput={setInput}
              stage={stage}
              submittedQuestion={submittedQuestion}
              goTo={goTo}
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
                disabled={stage === "thinking" || stage === "official" || stage === "private-receipt" || stage === "decision"}
                submitLabel={stage === "thinking" ? "확인 중" : "보내기"}
                onChange={setInput}
                onSubmit={submit}
              />
            </div>
          ) : null}
        </main>

        <ResponsibilityRail meta={meta} records={records} />
      </div>
    </div>
  );
}

function StageContent({
  stage,
  input,
  setInput,
  submittedQuestion,
  goTo,
}: {
  stage: StageId;
  input: string;
  setInput: (value: string) => void;
  submittedQuestion: string;
  goTo: (stage: StageId) => void;
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
            <StaticChip>평점 3.5 이상</StaticChip>
            <StaticChip>군 복학 예정</StaticChip>
          </div>
          <div className="mt-6 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">이 단계에서는 학번이나 성적표 원문을 보내지 않아요.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              답을 찾는 데 필요한 조건만 대화 기록에 남습니다.
            </p>
          </div>
        </article>
        <button className="btn-primary mt-7 h-12 px-6" onClick={() => goTo("thinking")}>
          공식 근거로 확인하기
        </button>
      </div>
    );
  }

  if (stage === "thinking") {
    return <LoadingMessage question={submittedQuestion} />;
  }

  if (stage === "official") {
    return (
      <div className="max-w-[860px] animate-enter">
        <p className="text-xs font-bold text-[var(--status-official)]">학교 답변 · 공식 근거</p>
        <article className="mt-3 rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-6">
          <StatusPill tone="official">공식 답변</StatusPill>
          <h2 className="mt-5 text-2xl font-bold leading-9">최대 22학점까지 신청할 수 있어요</h2>
          <ChatMessage
            role="assistant"
            content="전 학기 평점이 3.5 이상이고 군 복학 예정인 경우, 이번 학기 수강신청 상한은 22학점으로 안내할 수 있습니다. 다만 실제 KLAS 표시가 다르면 개인 학적 상태가 반영된 결과일 수 있어 담당 부서 확인이 필요합니다."
          />
          <SourceList sources={sources} />
          <div className="mt-5 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">대화 기록 CONV-0832</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              근거 문서와 적용 조건을 함께 보관했어요.
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
            개인 화면과 다르게 보이면, 아래 질문으로 바로 이어갈 수 있어요.
          </p>
        </article>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="chip" type="button" onClick={() => goTo("private-prefill")}>
            KLAS에는 21학점으로 표시돼요
          </button>
          <button className="chip chip-muted" type="button" onClick={() => setInput("22학점 시간표에서 먼저 신청할 과목은?")}>
            22학점 시간표에서 먼저 신청할 과목은?
          </button>
          <button className="chip chip-muted" type="button" onClick={() => goTo("collective-prefill")}>
            필수과목 정원이 이미 찼어요
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
        onChange={setInput}
        onSubmit={() => goTo("private-verification")}
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
        onAction={() => goTo("private-receipt")}
      />
    );
  }

  if (stage === "private-receipt") {
    return (
      <ReceiptPanel
        title="개인 상태 정정 영수증"
        receipt="PRI-24116"
        tone="personal"
        rows={[
          ["14:06", "개인 확인 요청 생성", "데모 상태"],
          ["14:08", "군 복학 적용 조건 확인", "교육지원팀"],
          ["14:10", "KLAS 표시 정정 결과 기록", "21학점 → 22학점"],
        ]}
        note="실제 KLAS에 반영된 결과가 아니라 데모 기록입니다."
        actionLabel="같은 문제를 겪는 학생 수요 확인"
        onAction={() => goTo("collective-prefill")}
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
        onChange={setInput}
        onSubmit={() => goTo("collective-issue")}
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
        facts={["47명 같은 문제", "23명 동일 필수과목 수요", "100% 학교 인증 상태"]}
        actionLabel="집단 사안으로 전환"
        onAction={() => goTo("decision")}
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
        facts={["학교 결정: 필수과목 1개 분반 증설", "KLAS 실행: 정원 반영 완료로 표시", "사안 기록: COL-0088"]}
        actionLabel="확정된 시간표 보기"
        onAction={() => goTo("final")}
      />
    );
  }

  return <FinalTimetable />;
}

function Landing({ onStart }: { onStart: () => void }) {
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
        <button className="btn-primary h-[54px] px-5" onClick={onStart}>
          로그인하기
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
            <button className="btn-primary h-[54px] px-8" onClick={onStart}>
              로그인하기
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

function PrefillPanel({
  tone,
  title,
  body,
  value,
  onChange,
  onSubmit,
}: {
  tone: StageTone;
  title: string;
  body: string;
  value: string;
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
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="btn-primary mt-5 h-12 px-6" onClick={onSubmit} disabled={!value.trim()}>
        전송하기
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
  onAction,
}: {
  tone: StageTone;
  eyebrow: string;
  title: string;
  body: string;
  facts: string[];
  actionLabel: string;
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
      <button className="btn-primary mt-6 h-12 px-6" onClick={onAction}>
        {actionLabel}
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
  onAction,
}: {
  title: string;
  receipt: string;
  tone: StageTone;
  rows: [string, string, string][];
  note: string;
  actionLabel: string;
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
      <button className="btn-primary mt-6 h-12 px-6" onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  );
}

function FinalTimetable() {
  return (
    <article className="max-w-[936px] animate-enter">
      <p className="text-xs font-bold text-[var(--status-official)]">목표 완료 · 데모 시간표</p>
      <h2 className="mt-3 text-3xl font-bold leading-10">22학점 시간표가 신청 가능한 상태로 정리됐어요</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white">
        <div className="grid grid-cols-6 border-b border-[var(--border-default)] bg-[var(--surface-app)] text-center text-xs font-bold text-[var(--text-secondary)]">
          {["월", "화", "수", "목", "금", "토"].map((day) => (
            <div className="p-3" key={day}>{day}</div>
          ))}
        </div>
        <div className="grid min-h-[360px] grid-cols-6 gap-px bg-[var(--border-default)]">
          {[
            "자료구조\n3학점",
            "인공지능수학\n3학점",
            "필수과목 A\n증설 반영 후 추가됨",
            "컴퓨터구조\n3학점",
            "오픈소스SW\n3학점",
            "",
            "",
            "교양세미나\n2학점",
            "",
            "알고리즘\n3학점",
            "전공실습\n3학점",
            "군 복학 상담\n1학점",
          ].map((item, index) => (
            <div
              className={`min-h-32 bg-white p-3 text-sm leading-6 ${item.includes("증설") ? "ring-2 ring-[var(--status-official)]" : ""}`}
              key={`${item}-${index}`}
            >
              {item ? item.split("\n").map((line) => (
                <p className={line.includes("증설") ? "mt-2 rounded-full bg-[var(--status-official-bg)] px-2 py-1 text-xs font-bold text-[var(--status-official)]" : "font-bold"} key={line}>
                  {line}
                </p>
              )) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryCard title="처리 기록" body="CONV-0832 · PRI-24116 · COL-0088" />
        <SummaryCard title="현재 담당" body="학생" />
        <SummaryCard title="다음 행동" body="수강신청 당일 확정된 시간표로 신청" />
      </div>
      <DemoNotice />
    </article>
  );
}

function SideNavigation({
  active,
  status,
}: {
  active: (typeof navItems)[number][0];
  status: string;
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
      <div className="mt-auto hidden rounded-xl bg-[var(--surface-selected)] p-4 lg:block">
        <p className="text-sm font-bold">22학점 시간표</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">수강신청 · 오늘</p>
        <p className="mt-3 text-xs font-medium text-[var(--action-primary)]">{status}</p>
      </div>
    </aside>
  );
}

function ResponsibilityRail({
  meta,
  records,
}: {
  meta: (typeof stageMeta)[StageId];
  records: string[];
}) {
  return (
    <aside className="border-t border-[var(--border-default)] bg-white p-6 lg:h-screen lg:w-[336px] lg:shrink-0 lg:border-l lg:border-t-0">
      <h2 className="text-xl font-bold">진행 상황</h2>
      <div className="mt-3">
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>
      <section className="mt-5 rounded-2xl bg-[var(--surface-app)] p-4">
        <h3 className="text-[15px] font-bold leading-6">{meta.railTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{meta.railBody}</p>
      </section>
      <RailSection title="현재 담당" headline={meta.owner} body={meta.ownerDetail} />
      <RailSection title="다음 안내" headline={meta.next} body={meta.nextDetail} />
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
