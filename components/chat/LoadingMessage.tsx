type LoadingMessageProps = {
  question: string;
};

export function LoadingMessage({ question }: LoadingMessageProps) {
  return (
    <article className="max-w-[760px] rounded-[18px] rounded-tl-md bg-[var(--surface-app)] p-5">
      <div className="flex items-start justify-between gap-5">
        <div className="flex gap-4">
          <span className="mt-2 size-2.5 rounded-full bg-[var(--action-primary)]" />
          <div>
            <h2 className="text-[15px] font-bold leading-6">
              광운대학교 공식 자료에서 근거를 확인하는 중...
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              질문 “{question}”에 직접 답하는 공지, 규정, 담당 부서 안내를
              대조하고 있어요.
            </p>
          </div>
        </div>
        <div className="loading-dots" aria-label="근거 확인 중">
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  );
}
