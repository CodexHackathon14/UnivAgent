import type { EvidenceDocument } from "./types";

export const OFFICIAL_EVIDENCE: readonly EvidenceDocument[] = [
  {
    id: "KW-2026-COURSE-REGISTRATION",
    title: "2026학년도 1학기 수강신청 공고",
    sourceUrl:
      "https://www-3.kw.ac.kr/ko/life/notice.jsp?BoardMode=view&DUID=51644&searchKey=1&searchVal=&srCategoryId=10&tpage=1",
    publishedAt: "2026-01-21",
    updatedAt: "2026-01-23",
    effectivePeriod: "2026학년도 1학기",
    department: "국제교류팀",
    location: "본문 8. 수강신청 시 유의사항",
    excerpt:
      "2017학번부터 기본 신청 범위는 12~19학점이며, 조건부 최대학점 추가신청제도 적용 시 최대 학점이 추가됩니다.",
    verifiedAt: "2026-08-16",
    keywords: [
      "수강신청",
      "신청학점",
      "최대",
      "19학점",
      "22학점",
      "복학",
      "군복학",
      "학점",
    ],
  },
  {
    id: "KW-2024-CONDITIONAL-CREDIT",
    title: "2024학년도 2학기 수강신청자료집",
    sourceUrl:
      "https://oia.kw.ac.kr/LIB/PHP_FUNC/Download.php?param=dd0caf38b459bbc6188e6042ce07e3c7d2394de7745ad24c976b093942e4d2c59a4ce8b4af660c57a6697d67de20af86b69a925f282760c29443eccece1630b7bf560d5871bcb0840c2e33cd6ddf1543619ab5f995d4e3aac1a909de3eac1f4332952003425b0a86fb92d14270facfaa32507ab0d3aec7889fd9520aebe5f58eac612d06922dc8c78a87bf504edc367cbc477a1714147ae52fe8bd1c054ce80b4fd8e4bd83d2c5c8f629cd52e39bba3c",
    publishedAt: null,
    updatedAt: null,
    effectivePeriod: "2024학년도 2학기",
    department: "교육지원팀",
    location: "11쪽, 조건부 최대학점 추가 신청제도",
    excerpt:
      "직전학기 평량평균 3.5 이상인 2017학년도 이후 입학생은 차기 학기에 3학점을 추가 신청할 수 있습니다.",
    verifiedAt: "2026-08-16",
    keywords: [
      "평점",
      "평량평균",
      "3.5",
      "추가학점",
      "3학점",
      "22학점",
      "최대",
      "학점",
    ],
  },
];

function normalize(value: string) {
  return value.toLocaleLowerCase("ko-KR").replaceAll(/\s+/g, "");
}

export function findOfficialEvidence(query: string): EvidenceDocument[] {
  const normalizedQuery = normalize(query);

  return OFFICIAL_EVIDENCE.map((document) => ({
    document,
    score: document.keywords.reduce(
      (total, keyword) =>
        total + (normalizedQuery.includes(normalize(keyword)) ? 1 : 0),
      0,
    ),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ document }) => ({ ...document, keywords: [...document.keywords] }));
}
