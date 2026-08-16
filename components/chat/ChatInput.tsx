import { FormEvent } from "react";

type ChatInputProps = {
  id?: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChatInput({
  id,
  value,
  placeholder,
  disabled = false,
  submitLabel,
  onChange,
  onSubmit,
}: ChatInputProps) {
  const isBlank = value.trim().length === 0;

  return (
    <form
      id={id}
      className="flex min-h-[76px] items-center gap-3 rounded-2xl bg-[var(--surface-app)] py-3 pl-5 pr-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--action-primary)]"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor={`${id ?? "chat"}-input`}>
        질문 입력
      </label>
      <textarea
        id={`${id ?? "chat"}-input`}
        className="min-h-10 flex-1 resize-none bg-transparent text-base leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] disabled:cursor-not-allowed"
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        className="btn-primary h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:bg-[var(--border-default)]"
        disabled={disabled || isBlank}
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}
