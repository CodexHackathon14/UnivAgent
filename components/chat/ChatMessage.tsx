type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

export function ChatMessage({ role, content, meta }: ChatMessageProps) {
  if (role === "assistant") {
    return (
      <p className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]">
        {content}
      </p>
    );
  }

  return (
    <div className="mb-7">
      {meta ? (
        <p className="mb-2 text-right text-xs font-medium text-[var(--text-muted)]">
          {meta}
        </p>
      ) : null}
      <div className="ml-auto max-w-[580px] rounded-[18px] rounded-br-md bg-[var(--action-primary)] px-6 py-5 text-base font-medium leading-7 text-white">
        {content}
      </div>
    </div>
  );
}
