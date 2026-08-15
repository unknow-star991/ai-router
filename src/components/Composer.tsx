"use client";

import {
  FormEvent,
  KeyboardEvent,
  useRef,
} from "react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
}

export default function Composer({
  value,
  onChange,
  onSend,
  loading,
}: ComposerProps) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!loading && value.trim()) {
      onSend();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading && value.trim()) {
        onSend();
      }
    }
  }

  function handleChange(
    value: string
  ) {
    onChange(value);

    const textarea =
      textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  }

  return (
    <div className="composer-wrapper">
      <form
        className="composer"
        onSubmit={submit}
      >
        <button
          type="button"
          className="composer-tool"
          aria-label="Attach file"
          disabled={loading}
        >
          ＋
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) =>
            handleChange(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          placeholder="Message AI Router..."
          rows={1}
          disabled={loading}
        />

        <button
          type="submit"
          className="send-button"
          disabled={
            loading || !value.trim()
          }
          aria-label="Send message"
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
          )}
        </button>
      </form>

      <div className="composer-footer">
        <span>
          AI can make mistakes. Check
          important information.
        </span>

        <span>
          Enter to send · Shift + Enter
          for newline
        </span>
      </div>
    </div>
  );
}