import type { EvidenceSource } from "@/lib/univ-agent/types";

type SourceListProps = {
  sources: EvidenceSource[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "게시일 미확인";
  }

  return value.slice(0, 10);
}

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="mt-5 rounded-xl bg-white p-4">
        <p className="text-sm font-bold">공식 근거</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          현재 연결된 자료 범위에서는 직접 인용할 공식 근거를 찾지 못했습니다.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-5 rounded-xl bg-[var(--status-official-bg)] p-4">
      <h3 className="text-sm font-bold text-[var(--status-official)]">
        확인한 공식 근거
      </h3>
      <div className="mt-3 space-y-3">
        {sources.map((source) => (
          <article key={source.id} className="rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold">{source.title}</h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {source.department ?? "담당 부서 미확인"} ·{" "}
                  {formatDate(source.publishedAt)}
                  {source.location ? ` · ${source.location}` : ""}
                </p>
              </div>
              <a
                className="text-xs font-bold text-[var(--action-primary)] underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[var(--action-primary)]"
                href={source.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                원문 링크
              </a>
            </div>
            <blockquote className="mt-3 border-l-4 border-[var(--status-official)] pl-3 text-sm leading-6 text-[var(--text-primary)]">
              {source.excerpt}
            </blockquote>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              시스템 확인 시점: {new Date(source.verifiedAt).toLocaleString("ko-KR")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
