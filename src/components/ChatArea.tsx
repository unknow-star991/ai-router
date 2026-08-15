"use client";

import { useEffect, useRef } from "react";
import Message from "./Message";
import type { ChatMessage } from "./types";

interface ChatAreaProps {
  messages: ChatMessage[];
  loading: boolean;
  selectedModel: string;
}

export default function ChatArea({
  messages,
  loading,
  selectedModel,
}: ChatAreaProps) {
  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  if (messages.length === 0) {
    return (
      <section className="chat-area empty-chat">
        <div className="welcome-content">
          <div className="welcome-logo">
            ✦
          </div>

          <h1>
            What can I help you with?
          </h1>

          <p>
            Ask anything. AI Router will
            choose the right model for the
            task.
          </p>

          <div className="suggestion-grid">
            <div className="suggestion-card">
              <span>⌘</span>
              <strong>Coding</strong>
              <p>
                Write, debug and explain
                code.
              </p>
            </div>

            <div className="suggestion-card">
              <span>◈</span>
              <strong>Reasoning</strong>
              <p>
                Solve complex problems.
              </p>
            </div>

            <div className="suggestion-card">
              <span>✎</span>
              <strong>Creative</strong>
              <p>
                Ideas, writing and content.
              </p>
            </div>

            <div className="suggestion-card">
              <span>▧</span>
              <strong>Vision</strong>
              <p>
                Analyze or edit images.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-area">
      <div className="conversation">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
          />
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar ai-avatar">
              ✦
            </div>

            <div className="message-column">
              <div className="message-meta">
                <strong>AI Router</strong>
              </div>

              <div className="typing-bubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}