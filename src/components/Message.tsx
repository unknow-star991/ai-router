"use client";

import type { ChatMessage } from "./types";

interface MessageProps {
  message: ChatMessage;
}

export default function Message({
  message,
}: MessageProps) {
  const isUser =
    message.role === "user";

  return (
    <article
      className={`message-row ${
        isUser ? "user" : "assistant"
      }`}
    >
      {!isUser && (
        <div className="message-avatar ai-avatar">
          ✦
        </div>
      )}

      <div className="message-column">
        <div className="message-meta">
          <strong>
            {isUser
              ? "You"
              : "AI Router"}
          </strong>

          {!isUser &&
            message.model && (
              <span>
                {message.model}
              </span>
            )}
        </div>

        <div className="message-bubble">
          {message.content}
        </div>
      </div>

      {isUser && (
        <div className="message-avatar user-avatar">
          A
        </div>
      )}
    </article>
  );
}