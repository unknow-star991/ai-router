"use client";

import type { ChatMessage } from "./types";

interface ChatHistoryProps {
  messages: ChatMessage[];
}

export default function ChatHistory({
  messages,
}: ChatHistoryProps) {
  const firstUserMessage =
    messages.find(
      (message) =>
        message.role === "user"
    );

  return (
    <div className="history-section">
      <div className="section-label">
        RECENT
      </div>

      {!firstUserMessage ? (
        <div className="empty-history">
          <span>No conversations yet</span>
          <p>
            Your conversations will appear
            here.
          </p>
        </div>
      ) : (
        <button className="history-item">
          <span className="history-icon">
            ◌
          </span>

          <span className="history-title">
            {firstUserMessage.content}
          </span>
        </button>
      )}
    </div>
  );
}