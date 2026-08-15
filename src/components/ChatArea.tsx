"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

  const [aiName, setAIName] =
    useState("NEXA");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response =
          await fetch(
            "/api/ai-settings",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) return;

        const data =
          await response.json();

        if (
          mounted &&
          data.success &&
          data.settings?.aiName
        ) {
          setAIName(
            data.settings.aiName
          );
        }
      } catch {
        // Keep default.
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

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
            Ask anything. {aiName} will
            choose the right model for
            the task.
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
              {aiName
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="message-column">
              <div className="message-meta">
                <strong>
                  {aiName}
                </strong>
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