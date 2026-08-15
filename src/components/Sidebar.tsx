"use client";

import ModelSelector from "./ModelSelector";
import ChatHistory from "./ChatHistory";
import type {
  ChatMessage,
  ModelInfo,
} from "./types";

interface SidebarProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: ChatMessage[];
  onNewChat: () => void;
  usage: number;
  maxUsage: number;
}

export default function Sidebar({
  models,
  selectedModel,
  onModelChange,
  messages,
  onNewChat,
  usage,
  maxUsage,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-mark">
            ✦
          </div>

          <div className="brand-copy">
            <strong>AI Router</strong>
            <span>Intelligent workspace</span>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={onNewChat}
        >
          <span>＋</span>
          New chat
        </button>

        <div className="sidebar-section">
          <div className="section-label">
            MODEL
          </div>

          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onChange={onModelChange}
          />
        </div>

        <ChatHistory messages={messages} />
      </div>

      <div className="sidebar-bottom">
        <div className="usage-card">
          <div className="usage-header">
            <span>Free usage</span>

            <strong>
              {usage} / {maxUsage}
            </strong>
          </div>

          <div className="usage-bar">
            <div
              className="usage-progress"
              style={{
                width: `${Math.min(
                  100,
                  (usage / maxUsage) * 100
                )}%`,
              }}
            />
          </div>

          <p>
            Free models reset daily.
          </p>
        </div>

        <div className="router-status">
          <span className="status-dot" />
          <span>Router online</span>
        </div>

        <div className="user-profile">
          <div className="profile-avatar">
            A
          </div>

          <div>
            <strong>Ari</strong>
            <span>Personal workspace</span>
          </div>

          <button
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