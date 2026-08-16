# UnivAgent(답잇다) Build Log

마지막 갱신: 2026-08-16 17:21 KST

## 1. 목표와 현재 범위

UnivAgent는 학생의 질문을 광운대학교 공식 근거, 개인 확인, 집단 사안,
학교 결정과 실행 기록으로 연결하는 대학 운영 SaaS 데모다.

현재 해커톤 범위는 `docs/DESIGN.md`의 11개 화면을 따라 다음 흐름을
하나의 사안 기록으로 보여주는 것이다.

```text
Home
-> Ask
-> Thinking
-> Official Answer
-> Official Follow-up Prefill
-> Private Verification
-> Private Receipt
-> Collective Follow-up Prefill
-> Collective Issue
-> Decision and Execution
-> Final Timetable
```

학교 SSO, 실제 KLAS 조회/쓰기, 담당 부서 접수, 학생회 검토와 학교 결정은
실제 외부 연동이 아니라 합성 데모 상태다.

## 2. 기준 문서와 결정

- 제품 및 완료 조건: `docs/SPEC.md`
- UI/UX 및 화면 흐름: `docs/DESIGN.md`
- Git 규칙: `docs/COMMIT.md`
- 프로젝트 작업 규칙: `AGENTS.md`
- Figma 기준: `MBbzK9rC2AZLHzrp5XIZGq`
- `DESIGN.md`와 Figma의 광운대학교/KLAS 11단계 흐름을 현재 Source of Truth로 사용했다.
- 외부 연동이 없는 상태는 UI에서 데모임을 표시한다.
- 현재 데이터 저장 필요 여부와 보존 기간은 미확정이다. 현 MVP는 DB 없이
  서버 측 데이터 모듈과 무상태 API로 구성한다.

별도의 장기 Plan 문서는 만들지 않았다. 요구사항과 파일 범위가 구체적이어서
문서 확인, 구현, 브라우저 검증 순서의 AI-DLC Lite 방식으로 진행했다.

## 3. 작업 타임라인

### 2026-08-16 15:12 - 프로젝트 초기화

- Next.js App Router, TypeScript, Tailwind CSS 기반 프로젝트를 생성했다.
- 초기 커밋: `e8a9060 Initial commit`

### 2026-08-16 15:48 - Git 작업 규칙 정리

- `main` 직접 작업, push 전 로컬 검증, 작은 단위 커밋 원칙을 문서화했다.
- 커밋: `4aecbce docs: 커밋 규칙 문서 추가`

### 2026-08-16 15:55 - 디자인 문서 추가

- Figma 기반 화면 구성, 상태, 모션과 접근성 기준을 정리했다.
- 커밋: `b2f39e0 docs: 디자인 문서 추가`

### 2026-08-16 16:00 - 제품 및 작업 지침 추가

- 제품 범위, 공식 근거 규칙, 개인정보와 데모 경계를 문서화했다.
- 관련 커밋:
  - `2d5cf46 docs: add project guidance and MVP specification`
  - `2023812 chore: merge origin main documentation updates`

### 2026-08-16 16:08 - 제품 명세와 디자인 정합화

- `docs/DESIGN.md`의 광운대학교/KLAS 11단계 흐름을 기준으로
  `docs/SPEC.md`와 `AGENTS.md`를 정리했다.
- 공식 답, 개인 확인, 집단 사안, 결정/실행, 최종 시간표의 책임 이동을
  하나의 사안 기록으로 정의했다.
- 커밋: `8117b16 docs: 제품 명세를 디자인 기준으로 정합화`

### 2026-08-16 16:26 - 11단계 프론트엔드 데모 구현

- Landing, Ask, Thinking, Official Answer 화면을 Figma 기준으로 구현했다.
- 개인 확인, `PRI-24116` 영수증, 집단 사안, 결정/실행,
  최종 시간표까지 브라우저 상태 전환으로 연결했다.
- 질문 입력, 빈 입력 방지, 로딩 중 중복 제출 방지와 질문 보존을 구현했다.
- 공식 근거 문장, 담당 부서, 게시일, 문서 위치, 원문 링크와 확인 시점을 표시했다.
- 실제 외부 연동이 없는 화면에 데모 상태 안내를 추가했다.
- 키보드 포커스와 `prefers-reduced-motion` 스타일을 추가했다.
- 주요 파일:
  - `app/page.tsx`
  - `app/layout.tsx`
  - `app/globals.css`
  - `components/chat/ChatInput.tsx`
  - `components/chat/ChatMessage.tsx`
  - `components/chat/LoadingMessage.tsx`
  - `components/chat/SourceList.tsx`
- 커밋: `8281199 feat: 11단계 대학 행정 데모 UI 구현`

### 2026-08-16 16:28 - 근거 기반 답변 및 데모 상태 API 구현

- `POST /api/answers`를 추가했다.
- 질문을 공식 답, 개인 확인, 집단 사안 책임으로 분기한다.
- 허용된 광운대학교 공식 근거만 답변 출처로 사용한다.
- 근거가 없으면 `insufficient_evidence` 상태를 반환한다.
- `OPENAI_API_KEY`가 없거나 모델 응답을 검증하지 못하면 검증된 데모 답변으로
  폴백한다.
- `GET /api/demo-case`와 `POST /api/demo-case/transition`을 추가했다.
- 데모 사안 `CONV-0832`, 개인 영수증 `PRI-24116`, 집단 사안 `COL-0088`과
  11단계 상태 전이를 서버 측 데이터 모듈에 중앙화했다.
- DB는 추가하지 않았다. 각 API 요청은 저장 없이 현재 단계에 맞는 데이터를
  계산해 반환한다.
- 주요 파일:
  - `app/api/answers/route.ts`
  - `app/api/demo-case/route.ts`
  - `app/api/demo-case/transition/route.ts`
  - `lib/univ-agent/answer-service.ts`
  - `lib/univ-agent/demo-case.ts`
  - `lib/univ-agent/evidence.ts`
  - `lib/univ-agent/types.ts`
  - `.env.example`
- 커밋: `9c1b8c8 feat: 근거 기반 답변과 데모 상태 API 추가`

### 2026-08-16 16:40 - 실제 답변과 실패 상태 연결

- Ask의 질문 제출을 `POST /api/answers`와 연결해 공식 답변을 실제 응답 데이터로
  렌더링하도록 변경했다.
- API 응답 형식을 클라이언트에서 검증하고, 공식 근거 없음과 답변 요청 실패를
  별도 화면으로 구분했다.
- 답변 요청이 실패해도 기존 질문을 보존하고 같은 질문으로 다시 시도할 수 있게 했다.
- 출처에는 문서명, 담당 부서, 게시일, 문서 위치, 원문 링크와 시스템 확인 시점을
  표시했다.
- 커밋: `81f3885 feat: 실제 답변과 실패 상태 연결`

### 2026-08-16 16:44 - 현재 상태 재검증

- `npm run lint`: 통과
- `npm run build -- --webpack`: 통과
- 빌드에서 `/`, `/api/answers`, `/api/demo-case`,
  `/api/demo-case/transition` 경로 생성을 확인했다.
- `GET /api/demo-case?stage=official_answer`: HTTP 200 확인
- `POST /api/answers`: HTTP 200 확인
- 로컬 환경에 `OPENAI_API_KEY`가 없어 `verified_demo_fallback` 응답을 확인했다.
- 기본 질문에 대해 공식 근거 2개와 최대 22학점 결론이 반환되는 것을 확인했다.

### 2026-08-16 17:03 - 데모 상태 전환과 원본 시간표 연결

- 브라우저 내부 상태만으로 이동하던 화면을 `GET /api/demo-case`와
  `POST /api/demo-case/transition` 응답에 연결했다.
- 클라이언트에서 데모 사안과 상태 전환 응답 형식을 검증하고, 유효하지 않은 응답과
  네트워크 오류를 화면에 표시하도록 했다.
- Home부터 Final Timetable까지 11단계가 서버의 허용된 상태 전환을 따라 이동하도록
  연결했다.
- Figma의 원본 시간표 raster asset을 `public/timetable-original.png`로 반영하고,
  증설 과목 강조와 라벨은 별도 UI overlay로 유지했다.
- 실제 OpenAI 응답, 공식 근거 없음 응답, 11단계 API 전환과 전체 브라우저 흐름을
  검증했다.
- `npm run lint`와 `npm run build -- --webpack`을 통과했다.
- 커밋: `ee10dd4 feat: 데모 상태 전환과 원본 시간표 연결`

### 2026-08-16 17:12 - 데모 진행 상태 새로고침 복구

- 탭 단위의 버전 지정 `sessionStorage` 스냅샷으로 현재 단계, 질문과 답변 결과를
  보존하도록 했다.
- 새로고침 시 저장된 단계에 맞춰 `/api/demo-case?stage=...`에서 서버 데모 상태를
  다시 조회하고, 완료된 공식 답변을 복원하도록 했다.
- 답변 확인 중 새로고침한 경우 무한 로딩 대신 질문을 보존한 재시도 화면으로
  복구하도록 했다.
- 브라우저에서 공식 답변 완료 상태 복원, 진행 중 요청의 재시도 복구와 재요청 성공을
  확인했다.
- `npm run lint`와 `npm run build -- --webpack`을 통과했다.
- 커밋: `af61158 feat: 데모 진행 상태 새로고침 복구`

### 2026-08-16 17:16 - 합성 학생 프로필 표시

- Figma의 `Authenticated context`에 맞춰 좌측 내비게이션 하단에 `김민준`,
  `인공지능융합학부 · 2학년`과 활성 상태를 표시했다.
- 프로필은 중앙 데모 상태의 합성 학생 데이터만 사용하며 실제 로그인, 학교 SSO 또는
  개인 학사정보 연동을 추가하지 않았다.
- 데스크톱 브라우저에서 프로필의 좌측 하단 배치와 오류 오버레이가 없음을 확인했다.
- `npm run lint`와 `npm run build -- --webpack`을 통과했다.
- 커밋: `115a633 fix: 좌측 내비게이션에 합성 학생 프로필 표시`
