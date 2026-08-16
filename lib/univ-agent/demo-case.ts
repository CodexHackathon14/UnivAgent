export const DEMO_STAGES = [
  "home",
  "ask",
  "thinking",
  "official_answer",
  "official_followup_prefill",
  "private_verification",
  "private_receipt",
  "collective_followup_prefill",
  "collective_issue",
  "decision_and_execution",
  "final_timetable",
] as const;

export type DemoStage = (typeof DEMO_STAGES)[number];

export const DEMO_ACTIONS = [
  "START_DEMO",
  "SUBMIT_QUESTION",
  "RESOLVE_OFFICIAL_ANSWER",
  "PREFILL_PRIVATE_FOLLOWUP",
  "SUBMIT_PRIVATE_FOLLOWUP",
  "CREATE_PRIVATE_REQUEST",
  "PREFILL_COLLECTIVE_FOLLOWUP",
  "SUBMIT_COLLECTIVE_FOLLOWUP",
  "ESCALATE_COLLECTIVE_ISSUE",
  "VIEW_FINAL_TIMETABLE",
] as const;

export type DemoAction = (typeof DEMO_ACTIONS)[number];

interface DemoStageDetail {
  title: string;
  responsibility: "student" | "official" | "department" | "student_council" | "school";
  status: string;
  nextAction: string | null;
  demoNotice: string | null;
}

const DEMO_CASE_BASE = {
  caseId: "CONV-0832",
  school: {
    name: "광운대학교",
    verified: true,
    verificationMode: "synthetic_demo" as const,
  },
  student: {
    name: "김민준",
    major: "인공지능융합학부",
    year: 2,
    synthetic: true,
  },
  question:
    "전 학기 평점 3.5 이상인 군복학생인데 이번 학기 최대 몇 학점까지 신청할 수 있나요?",
  conditions: ["직전학기 평점 3.5 이상", "군 복학 예정", "2017학년도 이후 입학"],
  followUps: {
    personal: "KLAS에는 21학점으로 표시돼요",
    collective: "필수과목 정원이 이미 찼어요",
  },
  receipts: {
    private: "PRI-24116",
    collective: "COL-0088",
  },
  demand: {
    sameIssue: 47,
    sameRequiredCourse: 23,
    schoolVerificationRate: 100,
  },
  decision: {
    summary: "필수과목 분반 증설",
    decidedBy: "학교",
    externalIntegration: false,
  },
  execution: {
    system: "KLAS",
    summary: "증설 분반 정원 반영",
    externalIntegration: false,
  },
  timetable: {
    totalCredits: 22,
    addedCourse: "정보디자인프로그래밍실습",
    nextAction: "수강신청 당일 확정된 시간표로 신청",
  },
};

const STAGE_DETAILS: Record<DemoStage, DemoStageDetail> = {
  home: {
    title: "서비스 소개",
    responsibility: "student",
    status: "로그인 전",
    nextAction: "데모 로그인",
    demoNotice: "합성 계정으로 진행하는 해커톤 데모입니다.",
  },
  ask: {
    title: "질문 시작",
    responsibility: "student",
    status: "질문 입력",
    nextAction: "공식 근거 확인",
    demoNotice: null,
  },
  thinking: {
    title: "공식 근거 확인 중",
    responsibility: "official",
    status: "근거 검색 중",
    nextAction: "공식 답 확인",
    demoNotice: null,
  },
  official_answer: {
    title: "공식 답",
    responsibility: "official",
    status: "공식 답변 완료",
    nextAction: "개인 KLAS 표시 확인",
    demoNotice: null,
  },
  official_followup_prefill: {
    title: "개인 조건 질문 확인",
    responsibility: "student",
    status: "후속 질문 준비",
    nextAction: "개인 확인 질문 전송",
    demoNotice: null,
  },
  private_verification: {
    title: "개인 확인",
    responsibility: "department",
    status: "담당 부서 확인 필요",
    nextAction: "개인 확인 요청 생성",
    demoNotice: "실제 담당 부서로 전송되지 않는 데모 요청입니다.",
  },
  private_receipt: {
    title: "개인 확정",
    responsibility: "department",
    status: "개인 상태 정정 기록 완료",
    nextAction: "동일 문제 수요 확인",
    demoNotice: "PRI-24116은 외부 연동 없는 합성 처리 기록입니다.",
  },
  collective_followup_prefill: {
    title: "집단 질문 확인",
    responsibility: "student",
    status: "집단 질문 준비",
    nextAction: "집단 문제 질문 전송",
    demoNotice: null,
  },
  collective_issue: {
    title: "집단 사안",
    responsibility: "student_council",
    status: "인증 수요 검토",
    nextAction: "학교 결정 단계로 전환",
    demoNotice: "수요와 학교 인증 비율은 합성 데모 데이터입니다.",
  },
  decision_and_execution: {
    title: "결정과 실행",
    responsibility: "school",
    status: "학교 결정 및 KLAS 실행 기록 완료",
    nextAction: "확정된 시간표 확인",
    demoNotice: "학교 결정과 KLAS 반영은 실제 외부 연동 결과가 아닙니다.",
  },
  final_timetable: {
    title: "학생 목표 완료",
    responsibility: "student",
    status: "22학점 시간표 확정",
    nextAction: null,
    demoNotice: "실제 수강신청 전 KLAS에서 최종 상태를 다시 확인해야 합니다.",
  },
};

const TRANSITIONS: Record<DemoStage, Partial<Record<DemoAction, DemoStage>>> = {
  home: { START_DEMO: "ask" },
  ask: { SUBMIT_QUESTION: "thinking" },
  thinking: { RESOLVE_OFFICIAL_ANSWER: "official_answer" },
  official_answer: {
    PREFILL_PRIVATE_FOLLOWUP: "official_followup_prefill",
  },
  official_followup_prefill: {
    SUBMIT_PRIVATE_FOLLOWUP: "private_verification",
  },
  private_verification: { CREATE_PRIVATE_REQUEST: "private_receipt" },
  private_receipt: {
    PREFILL_COLLECTIVE_FOLLOWUP: "collective_followup_prefill",
  },
  collective_followup_prefill: {
    SUBMIT_COLLECTIVE_FOLLOWUP: "collective_issue",
  },
  collective_issue: {
    ESCALATE_COLLECTIVE_ISSUE: "decision_and_execution",
  },
  decision_and_execution: { VIEW_FINAL_TIMETABLE: "final_timetable" },
  final_timetable: {},
};

export function isDemoStage(value: unknown): value is DemoStage {
  return typeof value === "string" && DEMO_STAGES.includes(value as DemoStage);
}

export function isDemoAction(value: unknown): value is DemoAction {
  return typeof value === "string" && DEMO_ACTIONS.includes(value as DemoAction);
}

export function getDemoCase(stage: DemoStage = "home") {
  return {
    ...DEMO_CASE_BASE,
    currentStage: stage,
    stage: STAGE_DETAILS[stage],
    allowedActions: Object.keys(TRANSITIONS[stage]) as DemoAction[],
  };
}

export function transitionDemoCase(stage: DemoStage, action: DemoAction) {
  const nextStage = TRANSITIONS[stage][action];

  if (!nextStage) {
    return null;
  }

  return getDemoCase(nextStage);
}
