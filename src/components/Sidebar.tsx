"use client";

import ModelSelector from "./ModelSelector";
import ChatHistory from "./ChatHistory";

import type {
  ChatMessage,
  ModelInfo,
} from "./types";

import type {
  AISettings,
} from "@/lib/ai-settings-types";

interface SidebarProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (
    model: string
  ) => void;
  messages: ChatMessage[];
  onNewChat: () => void;
  usage: number;
  maxUsage: number;
  aiSettings: AISettings | null;
}

export default function Sidebar({
  models,
  selectedModel,
  onModelChange,
  messages,
  onNewChat,
  usage,
  maxUsage,
  aiSettings,
}: SidebarProps) {
  /*
   * AI identity comes from the shared AI settings
   * loaded by page.tsx.
   *
   * Fallbacks are kept so the UI never breaks if
   * the settings API is temporarily unavailable.
   */

  const aiName =
    aiSettings?.aiName?.trim() ||
    "NEXA";

  const appName =
    aiSettings?.appName?.trim() ||
    "AI Router";

  const avatarLetter =
    aiName
      .charAt(0)
      .toUpperCase() || "N";

  const usagePercentage =
    maxUsage > 0
      ? Math.min(
          100,
          (usage / maxUsage) * 100
        )
      : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">

        {/* BRAND */}

        <div className="brand">
          <div className="brand-mark">
            {avatarLetter}
          </div>

          <div className="brand-copy">
            <strong>
              {appName}
            </strong>

            <span>
              {aiName} workspace
            </span>
          </div>
        </div>

        {/* NEW CHAT */}

        <button
          type="button"
          className="new-chat-button"
          onClick={onNewChat}
          disabled={false}
        >
          <span aria-hidden="true">
            ＋
          </span>

          New chat
        </button>

        {/* MODEL */}

        <div className="sidebar-section">
          <div className="section-label">
            MODEL
          </div>

          <ModelSelector
            models={models}
            selectedModel={
              selectedModel
            }
            onChange={
              onModelChange
            }
          />
        </div>

        {/* HISTORY */}

        <div className="history-section">
          <ChatHistory
            messages={messages}
          />
        </div>
      </div>

      {/* SIDEBAR BOTTOM */}

      <div className="sidebar-bottom">

        {/* USAGE */}

        <div className="usage-card">
          <div className="usage-header">
            <span>
              Free usage
            </span>

            <strong>
              {usage} / {maxUsage}
            </strong>
          </div>

          <div
            className="usage-bar"
            aria-label={`Usage ${usage} of ${maxUsage}`}
          >
            <div
              className="usage-progress"
              style={{
                width:
                  `${usagePercentage}%`,
              }}
            />
          </div>

          <p>
            Free models reset daily.
          </p>
        </div>

        {/* ROUTER STATUS */}

        <div className="router-status">
          <span
            className="status-dot"
            aria-hidden="true"
          />

          <span>
            Router online
          </span>
        </div>

        {/* USER */}

        <div className="user-profile">
          <div className="profile-avatar">
            A
          </div>

          <div>
            <strong>
              Ari
            </strong>

            <span>
              Personal workspace
            </span>
          </div>

          <button
            type="button"
            className="profile-menu"
            aria-label="Profile menu"
          >
            ⋮
          </button>
        </div>

      </div>
    </aside>
  );
}