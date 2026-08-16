# 학교생활 UI/UX 설계

## Source of Truth

Figma:  
https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=0-1

Figma is the source of truth for visual design.

- 기준 화면 비율: 16:10
- 기준 프레임: 1600×1000
- 프로토타입 시작점: `00 · Landing · 서비스 소개` (`26:2`)
- 전체 흐름: 11개 화면
- 시각 토큰, 컴포넌트, 간격, 상태 색상은 Figma 정의를 우선합니다.

## Screens

### Home

Figma: [`00 · Landing · 서비스 소개` (`26:2`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=26-2)

Purpose:

- 서비스의 핵심 가치인 `공식 답 → 개인별 확정 → 집단 의사결정·실행`을 소개합니다.
- 광운대학교 인증 기반 서비스임을 알립니다.
- `로그인하기`를 통해 실제 질문 흐름으로 진입시킵니다.

### Ask

Figma: [`01 · Ask · 질문 시작` (`5:2`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=5-2)

Purpose:

- 학생이 자신의 조건이 포함된 행정 질문을 입력합니다.
- 질문에 필요한 조건을 확인하고 공식 근거 검색을 시작합니다.
- 로그인한 학생과 학교 인증 상태를 계속 보여줍니다.

### Thinking

Figma: [`01B · Thinking · 공식 근거 확인 중` (`26:105`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=26-105)

Purpose:

- 답변 전 실제로 무엇을 확인하는지 한 문장으로 설명합니다.
- 사용자가 대기 이유와 조사 범위를 즉시 이해하게 합니다.
- 1.4초 후 공식 답 화면으로 자동 전환됩니다.

### Official Answer

Figma: [`02 · Evidence · 공식 답` (`5:51`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=5-51)

Purpose:

- 학교 규정과 공지를 근거로 일반적으로 적용되는 답을 제공합니다.
- 근거 출처와 적용 조건을 함께 보여줍니다.
- 공식 답만으로 해결되지 않는 개인 상태 질문으로 이어집니다.

### Official Follow-up Prefill

Figma: [`02B · Prefill · 연계 질문 확인` (`7:64`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=7-64)

Purpose:

- `KLAS에는 21학점으로 표시돼요`라는 개인 조건을 질문에 반영합니다.
- 다음 책임 수준으로 넘어가기 전에 사용자가 질문 내용을 확인하게 합니다.

### Private Verification

Figma: [`03 · Private Issue · 개인 확인` (`5:110`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=5-110)

Purpose:

- 공식 규정과 학생 개인의 KLAS 상태가 다른 문제를 분리합니다.
- 담당 부서에 보낼 개인 확인 요청을 생성합니다.
- 처리 주체와 다음 행동을 명시합니다.

### Private Receipt

Figma: [`04 · Receipt · 개인 확정` (`6:32`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=6-32)

Purpose:

- 담당 부서가 개인 상태를 확인·정정한 결과를 영수증으로 남깁니다.
- `PRI-24116` 처리 기록과 시간 순서를 보여줍니다.
- 같은 문제를 겪는 학생이 있는지 집단 사안으로 연결합니다.

### Collective Follow-up Prefill

Figma: [`04B · Prefill · 집단 질문 확인` (`7:114`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=7-114)

Purpose:

- `필수과목 정원이 이미 찼어요`라는 공동 문제를 질문으로 확인합니다.
- 개인 문제와 집단 문제의 책임 수준이 다름을 보여줍니다.

### Collective Issue

Figma: [`05 · Collective · 집단 사안` (`6:97`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=6-97)

Purpose:

- 본인 인증된 수요, 학생회 검토, 학교 판단의 흐름을 보여줍니다.
- 47명 같은 문제, 23명 동일 필수과목, 100% 학교 인증과 같은 대표성 근거를 제시합니다.
- 학생회 검토를 거쳐 학교 결정 단계로 전환합니다.

### Decision and Execution

Figma: [`06 · Decision · 결정과 실행` (`6:156`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=6-156)

Purpose:

- 학교의 필수과목 분반 증설 결정과 실제 KLAS 정원 반영을 분리해 기록합니다.
- 결정문에서 끝나지 않고 시스템 실행 여부까지 확인합니다.
- Primary CTA `확정된 시간표 보기`로 학생의 최종 결과 화면에 진입합니다.

### Final Timetable

Figma: [`06B · Final Timetable · 목표 완료` (`38:156`)](https://www.figma.com/design/MBbzK9rC2AZLHzrp5XIZGq/?node-id=38-156)

Purpose:

- 학생이 실제 신청 가능한 22학점 시간표를 완성했다는 최종 결과를 보여줍니다.
- 첨부된 원본 시간표를 중앙의 가장 중요한 결과 객체로 사용합니다.
- 증설 후 추가된 필수과목을 성공 색상 테두리와 `증설 반영 후 추가됨` 라벨로 강조합니다.
- 처리 단계, 완료 영수증, 현재 담당, 다음 행동을 함께 남깁니다.

## User Flow

```text
Home
→ 로그인
→ 학생 질문 입력
→ 공식 근거 확인 중
→ 공식 답과 근거 확인
→ 개인 조건이 포함된 후속 질문
→ 담당 부서 개인 확인
→ 개인 상태 정정 영수증
→ 같은 문제를 겪는 학생 수요 확인
→ 학생회 대표성 검토
→ 학교 결정
→ KLAS 실행 확인
→ 확정된 시간표 보기
→ 22학점 시간표 목표 완료
```

책임 수준의 변화:

```text
공식 근거 확인
→ 개인 상태 정정
→ 학생회 대표성 검토
→ 학교 결정
→ KLAS 실행
→ 학생의 실제 목표 달성
```

## Prototype Interactions

- `로그인하기` → Ask: Smart Animate 220ms
- `공식 근거로 확인하기` → Thinking: Smart Animate 220ms
- Thinking → Official Answer: 1.4초 후 자동 전환, Smart Animate 220ms
- 공식 답의 연계 질문 칩 → Official Follow-up Prefill: Smart Animate 220ms
- Prefill 전송 → Private Verification: Smart Animate 220ms
- `개인 확인 요청 만들기` → Private Receipt: Smart Animate 220ms
- 개인 확정 화면의 집단 질문 칩 → Collective Follow-up Prefill: Smart Animate 220ms
- Prefill 전송 → Collective Issue: Smart Animate 220ms
- `집단 사안으로 전환` → Decision and Execution: Smart Animate 220ms
- `확정된 시간표 보기` → Final Timetable: Smart Animate, Ease Out, 220ms
- 마지막 전환에서 동일한 이름의 `Timetable result card`가 260×60에서 936×480으로 확대됩니다.

### Motion Tokens

| Token | Duration | Usage |
|---|---:|---|
| `motion.press` | 80ms | 버튼·질문 칩을 누르는 순간의 피드백 |
| `motion.hover` | 120ms | hover 배경, 테두리, 그림자 변화 |
| `motion.state` | 180ms | 상태 배지, Responsibility Rail, 처리 단계 변화 |
| `motion.page` | 220ms | 화면 간 Smart Animate와 결과 카드 확대 |
| `motion.loading` | 280ms | Thinking 점 세 개의 한 단계 이동 |

- 기본 easing은 `cubic-bezier(0.2, 0, 0, 1)` 또는 동일한 감각의 Ease Out을 사용합니다.
- 화면을 가로지르는 큰 이동, bounce, parallax, 반복 장식 애니메이션은 사용하지 않습니다.
- opacity와 transform을 우선 사용하고, 레이아웃을 다시 계산시키는 width·height 애니메이션은 마지막 시간표 카드 확대에만 허용합니다.

### Component Interaction States

#### Primary Button

- Default: Figma의 Primary Button 토큰을 그대로 사용합니다.
- Hover, 120ms: `translateY(-1px)`와 약한 elevation을 적용합니다.
- Pressed, 80ms: `scale(0.98)`로 눌림을 보여주고 elevation을 줄입니다.
- Loading: 라벨을 유지한 채 우측에 작은 진행 표시를 추가하고 중복 클릭을 막습니다.
- Disabled: opacity만 낮추지 말고 배경·텍스트 대비와 cursor를 함께 변경합니다.
- 화면 전환은 버튼 press가 끝난 직후 시작해 눌림 피드백이 생략되지 않게 합니다.

#### Related Question Chip

- Hover, 120ms: 연한 indigo 배경과 1px 테두리를 표시합니다.
- Pressed, 80ms: `scale(0.98)`과 조금 진한 테두리를 사용합니다.
- 선택 후에는 질문이 Composer에 들어가는 과정을 180ms crossfade로 보여줍니다.
- `총 22학점`, `KLAS 반영 완료`, `필수과목 신청 가능` 같은 결과 요약 칩은 버튼이 아닙니다. hover·press·pointer cursor를 적용하지 않습니다.
- `평점 3.5 이상`, `군 복학 예정`처럼 현재 조건을 나타내는 칩도 정적 정보로 처리합니다.

#### Question Composer

- Hover, 120ms: 테두리 대비만 가볍게 높입니다.
- Focus, 120ms: 2px indigo focus ring을 표시하고 입력 커서를 활성화합니다.
- Sending: 입력 내용은 유지하고 전송 버튼만 loading 상태로 바꿉니다.
- Thinking 화면의 Composer는 disabled 상태이며 hover·focus가 발생하지 않습니다.
- 답변·영수증·집단 사안 화면의 `이어서 질문해보세요`를 누르면 Ask 화면으로 이동하되, 현재 이슈 기록 ID를 유지합니다.

#### Navigation and Responsibility Rail

- 좌측 메뉴는 클릭 시 해당 책임 수준의 대표 화면으로 이동합니다.
- 현재 메뉴의 선택 배경은 180ms crossfade로 이동하며, 텍스트 위치는 움직이지 않습니다.
- Responsibility Rail은 전체를 다시 그리지 않고 `현재 상태`, `현재 담당`, `다음 행동`만 180ms로 교체합니다.
- 새 단계가 완료될 때 dot가 check로 바뀌며, 색상과 함께 `완료` 문구를 반드시 노출합니다.
- 과거 처리 기록은 다시 점멸하거나 반복 재생하지 않습니다.

### Screen-level Motion

| Screen | Motion | Intent |
|---|---|---|
| Home | 제품 미리보기 카드가 opacity 0→1, scale 0.98→1로 220ms 등장 | 서비스 구조를 한 번에 인지 |
| Ask | Composer focus ring과 전송 버튼 상태 변화 | 입력 가능성과 실행 가능성 구분 |
| Thinking | 점 세 개가 280ms 간격으로 순환하고 확인 중 문장은 고정 | 실제 확인 작업이 진행 중임을 전달 |
| Official Answer | 답변 카드 180ms fade-in 후 근거 박스가 60ms 뒤 등장 | 답과 근거의 읽기 순서 형성 |
| Private Verification | 요청 생성 후 Rail의 담당자·다음 행동만 교체 | 개인 확인 책임의 이동 표현 |
| Private Receipt | 처리 타임라인이 과거→현재 순서로 40ms 간격 등장 | 요청이 실제 처리됐음을 확인 |
| Collective Issue | 47명·23명·100% 카드가 최대 40ms 간격으로 등장 | 대표성 근거를 빠르게 비교 |
| Decision and Execution | 학교 결정 후 KLAS 실행 증빙을 80ms 뒤 강조 | 결정과 실행이 다른 단계임을 표현 |
| Final Timetable | CTA 카드가 시간표 카드로 220ms 확대되고 강조 라벨이 120ms fade-in | 행정 기록보다 실제 목표 달성을 먼저 보여줌 |

- 위 순차 등장은 데이터를 기다리는 척하기 위한 가짜 loading이 아닙니다. 이미 준비된 정보를 읽기 좋은 순서로 제시하는 entrance motion입니다.
- 실제 API 응답이 늦을 때만 Thinking 또는 Sending 상태를 유지합니다.
- 한 화면에서 동시에 움직이는 핵심 영역은 최대 두 곳으로 제한합니다.

## Implementation Notes

### Layout

- 로그인 이후 화면은 `248px 좌측 내비게이션 + 1016px Conversation + 336px Responsibility Rail`의 3열 구조입니다.
- 세 영역의 전체 높이는 1000px이며, 상위 프레임은 Horizontal Auto Layout을 사용합니다.
- Conversation의 하단 입력창은 해당 화면에 존재할 때 하단에 고정된 것처럼 유지합니다.
- 최종 목표 완료 화면에는 추가 질문 입력창을 두지 않습니다. 시간표 결과와 다음 행동이 종료 상태를 대신합니다.
- 현재 기준은 데스크톱 1600×1000입니다. 모바일 반응형은 별도 설계 전까지 임의로 축약하지 않습니다.

### Design System

- Figma의 로컬 변수 46개와 아래 공유 컴포넌트를 우선 사용합니다.
  - `State=Official`
  - `State=Personal`
  - `State=Collective`
  - `Related Question Chip`
  - `Nav Item`
  - `Primary Button`
  - `Question Composer`
- 상태는 색상만으로 전달하지 않습니다. 상태 문구, 체크 표시, 영수증 또는 처리 기록을 함께 제공합니다.
- 상태 의미:
  - 공식 근거·완료: mint/success
  - 개인 확인: amber
  - 집단 사안·학교 결정: lilac
  - Primary action: indigo
- 구현 시 임의의 새로운 색상, 그림자, radius, typography scale을 만들지 말고 Figma 토큰을 매핑합니다.

### Timetable Asset

- 최종 시간표는 Figma 노드 `Timetable image` (`38:266`)에 들어간 원본 raster image fill을 사용합니다.
- 시간표를 HTML/CSS, SVG, Canvas 또는 생성형 이미지로 다시 그리지 않습니다.
- 원본의 비어 있는 하단 영역만 크롭한 비율을 유지하고, 늘이거나 왜곡하지 않습니다.
- `정보디자인프로그래밍실습` 강조 테두리와 `증설 반영 후 추가됨` 라벨은 이미지와 분리된 UI overlay입니다.
- 시간표 카드가 최종 화면에서 제목 다음으로 가장 먼저 읽히는 핵심 결과 객체여야 합니다.

### Content and State

- 로그인 상태 예시는 `광운대학교`, `김민준`, `인공지능융합학부 · 2학년`입니다.
- 완료 영수증은 `CONV-0832 · PRI-24116 · COL-0088`을 유지합니다.
- 최종 상태는 `학생 목표 완료`, 현재 담당은 `학생`입니다.
- 다음 행동은 `수강신청 당일 확정된 시간표로 신청`입니다.
- 실제 구현에서 Thinking 상태는 최소 노출 시간을 두되, 실제 응답이 준비되면 불필요하게 오래 유지하지 않습니다.
- 처리 기록과 시간표 데이터는 서버 상태를 기준으로 렌더링하며, 화면에 하드코딩하지 않습니다.

### Interaction Rules

- 클릭 가능한 요소에만 hover·pressed 상태와 pointer cursor를 제공합니다.
- 정적 상태 칩, 영수증 ID, 처리 이력에는 클릭 가능한 것처럼 보이는 모션을 적용하지 않습니다.
- 네트워크 요청 중에는 동일 요청의 중복 실행을 막고, 실패 시 원래 입력과 선택 조건을 보존합니다.
- 화면 전환 중 좌측 내비게이션과 로그인 정보는 고정하고 Conversation과 Responsibility Rail의 변경 부분만 전환합니다.
- 모션이 끝나기 전에 다음 상태가 준비되더라도 최소 press 피드백 80ms는 보장합니다.
- 모션 때문에 핵심 텍스트가 늦게 읽히거나 클릭이 차단되어서는 안 됩니다.

### Accessibility and QA

- 한국어 문장 중 조사·어미가 단독 줄로 떨어지지 않도록 최소 너비와 줄바꿈을 유지합니다.
- 상태 색상은 텍스트와 아이콘/체크 표시를 함께 사용합니다.
- Primary CTA와 Composer는 키보드 포커스, Enter/Space 실행, 명확한 focus ring이 필요합니다.
- `prefers-reduced-motion`에서는 scale·이동·순차 등장을 제거하고 80ms 이하의 단순 opacity 전환 또는 즉시 전환을 사용합니다.
- 키보드 포커스 이동 시 hover와 같은 시각적 중요도를 제공하되, focus ring을 그림자만으로 표현하지 않습니다.
- 화면 전환 후 focus는 새 화면의 제목 또는 가장 중요한 결과 카드로 이동합니다.
- 최종 구현 검증 기준:
  - 1600×1000에서 잘림과 오버플로가 없음
  - 모든 화면의 좌·중·우 셸이 유지됨
  - 전체 프로토타입 흐름이 끊기지 않음
  - 시간표 원본의 과목명, 교수명, 위치, 색상이 변경되지 않음
  - 최종 화면에서 행정 기록보다 완성된 시간표가 먼저 인지됨
  - hover·pressed·focus·loading·disabled 상태가 각각 구분됨
  - reduced-motion에서도 전체 사용자 흐름을 완료할 수 있음

## Validation Record

- 검증 화면: 11/11
- 프레임 크기: 전부 1600×1000
- 누락 폰트: 없음
- 감지된 텍스트 오버플로: 없음
- 공유 컴포넌트 기반 구조 확인
- 최종 CTA 전환: Smart Animate 220ms 확인
- 원본 시간표: raster image fill 사용 확인
- 인터랙션·모션 구현 명세 포함
- 독립 디자인 시스템·기능 검수: PASS
- 독립 CJK·시각 검수: PASS
