"use client";

import {
  useEffect,
  useState,
} from "react";

import type { ChatMessage } from "./types";

interface MessageProps {
  message: ChatMessage;
}

export default function Message({
  message,
}: MessageProps) {
  const isUser =
    message.role === "user";

  const [aiName, setAIName] =
    useState("NEXA");

  useEffect(() => {
    if (isUser) return;

    let mounted = true;

    async function loadName() {
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
        // Keep default NEXA.
      }
    }

    loadName();

    return () => {
      mounted = false;
    };
  }, [isUser]);

  const avatarLetter =
    aiName
      .trim()
      .charAt(0)
      .toUpperCase() || "N";

  return (
    <article
      className={`message-row ${
        isUser
          ? "user"
          : "assistant"
      }`}
    >
      {!isUser && (
        <div className="message-avatar ai-avatar">
          {avatarLetter}
        </div>
      )}

      <div className="message-column">
        <div className="message-meta">
          <strong>
            {isUser
              ? "You"
              : aiName}
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