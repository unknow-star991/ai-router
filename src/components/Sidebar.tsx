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
  onModelChange: (model: string) => void;
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
  |--------------------------------------------------------------------------
  | AI IDENTITY
  |--------------------------------------------------------------------------
  */

  const aiName =
    aiSettings?.aiName?.trim() || "NEXA";

  const appName =
    aiSettings?.appName?.trim() || "AI Router";

  const avatarLetter =
    aiName.charAt(0).toUpperCase() || "N";

  /*
  |--------------------------------------------------------------------------
  | FREE USAGE
  |--------------------------------------------------------------------------
  */

  const usagePercentage =
    maxUsage > 0
      ? Math.min(
          100,
          (usage / maxUsage) * 100
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | TOKEN CALCULATION
  |--------------------------------------------------------------------------
  */

  const totalTokens = messages.reduce(
    (total, message) =>
      total +
      (message.usage?.totalTokens ?? 0),
    0
  );

  const inputTokens = messages.reduce(
    (total, message) =>
      total +
      (message.usage?.promptTokens ?? 0),
    0
  );

  const outputTokens = messages.reduce(
    (total, message) =>
      total +
      (message.usage?.completionTokens ?? 0),
    0
  );

  const estimatedCost = messages.reduce(
    (total, message) =>
      total +
      (message.usage?.estimatedCost ?? 0),
    0
  );

  /*
  |--------------------------------------------------------------------------
  | FORMATTERS
  |--------------------------------------------------------------------------
  */

  function formatTokens(
    value: number
  ) {
    if (value >= 1_000_000) {
      return `${(
        value / 1_000_000
      ).toFixed(2)}M`;
    }

    if (value >= 1_000) {
      return `${(
        value / 1_000
      ).toFixed(1)}K`;
    }

    return value.toString();
  }

  function formatCost(
    value: number
  ) {
    if (value === 0) {
      return "$0.00";
    }

    if (value < 0.000001) {
      return "<$0.000001";
    }

    return `$${value.toFixed(6)}`;
  }

  return (
    <aside className="sidebar">

      {/* ================================================================
          AMBIENT BACKGROUND
      ================================================================ */}

      <div
        className="sidebar-ambient ambient-one"
        aria-hidden="true"
      />

      <div
        className="sidebar-ambient ambient-two"
        aria-hidden="true"
      />

      <div
        className="sidebar-grid"
        aria-hidden="true"
      />

      {/* ================================================================
          TOP
      ================================================================ */}

      <div className="sidebar-top">

        {/* BRAND */}

        <div className="brand">

          <div className="brand-mark-wrapper">

            <div className="brand-orbit orbit-one" />
            <div className="brand-orbit orbit-two" />

            <div className="brand-mark">
              {avatarLetter}
            </div>

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
        >
          <span
            className="new-chat-icon"
            aria-hidden="true"
          >
            ＋
          </span>

          <span>
            New chat
          </span>

          <span
            className="new-chat-shine"
            aria-hidden="true"
          />
        </button>

        {/* MODEL */}

        <div className="sidebar-section">

          <div className="section-label">

            <span>
              MODEL
            </span>

            <span className="section-pulse">
              ●
            </span>

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

          <div className="history-glow" />

          <ChatHistory
            messages={messages}
          />

        </div>

      </div>

      {/* ================================================================
          BOTTOM
      ================================================================ */}

      <div className="sidebar-bottom">

        {/* ============================================================
            TOKEN CARD
        ============================================================ */}

        <div className="token-card">

          <div
            className="token-card-glow"
            aria-hidden="true"
          />

          <div
            className="token-scanline"
            aria-hidden="true"
          />

          <div className="token-header">

            <div>

              <span className="token-label">
                TOKEN USAGE
              </span>

              <div className="token-main-value">

                <span>
                  {formatTokens(
                    totalTokens
                  )}
                </span>

                <span className="token-live">
                  LIVE
                </span>

              </div>

            </div>

            <div className="token-core">

              <div className="token-core-ring ring-a" />
              <div className="token-core-ring ring-b" />

              <span>
                ✦
              </span>

            </div>

          </div>

          {/* TOKEN STATS */}

          <div className="token-stats">

            <div className="token-stat">

              <div className="token-stat-top">

                <span className="token-stat-dot input-dot" />

                <span>
                  Input
                </span>

              </div>

              <strong>
                {formatTokens(
                  inputTokens
                )}
              </strong>

            </div>

            <div className="token-divider" />

            <div className="token-stat">

              <div className="token-stat-top">

                <span className="token-stat-dot output-dot" />

                <span>
                  Output
                </span>

              </div>

              <strong>
                {formatTokens(
                  outputTokens
                )}
              </strong>

            </div>

          </div>

          {/* TOKEN BAR */}

          <div className="token-meter">

            <div className="token-meter-track">

              <div
                className="token-meter-input"
                style={{
                  width:
                    totalTokens > 0
                      ? `${Math.min(
                          100,
                          (inputTokens /
                            totalTokens) *
                            100
                        )}%`
                      : "0%",
                }}
              />

              <div
                className="token-meter-output"
                style={{
                  width:
                    totalTokens > 0
                      ? `${Math.min(
                          100,
                          (outputTokens /
                            totalTokens) *
                            100
                        )}%`
                      : "0%",
                }}
              />

            </div>

          </div>

          {/* COST */}

          <div className="token-cost">

            <div>

              <span>
                Estimated cost
              </span>

              <small>
                Based on usage
              </small>

            </div>

            <strong>
              {formatCost(
                estimatedCost
              )}
            </strong>

          </div>

          {/* FLOATING PARTICLES */}

          <span className="token-particle particle-a" />
          <span className="token-particle particle-b" />
          <span className="token-particle particle-c" />

        </div>

        {/* ============================================================
            FREE USAGE
        ============================================================ */}

        <div className="usage-card">

          <div className="usage-header">

            <div className="usage-title">

              <span className="usage-live-dot" />

              <span>
                Free usage
              </span>

            </div>

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

            <div
              className="usage-progress-glow"
              style={{
                left:
                  `${usagePercentage}%`,
              }}
            />

          </div>

          <div className="usage-footer">

            <p>
              Free models reset daily.
            </p>

            <span>
              {Math.max(
                0,
                maxUsage - usage
              )} left
            </span>

          </div>

        </div>

        {/* ============================================================
            ROUTER STATUS
        ============================================================ */}

        <div className="router-status">

          <div className="router-status-icon">

            <span className="status-dot" />

          </div>

          <div className="router-status-copy">

            <span>
              Router online
            </span>

            <small>
              All systems operational
            </small>

          </div>

          <div
            className="router-wave"
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </div>

        </div>

        {/* ============================================================
            USER
        ============================================================ */}

        <div className="user-profile">

          <div className="profile-avatar">

            <span>
              A
            </span>

            <div className="profile-status" />

          </div>

          <div className="profile-info">

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
            <span />
            <span />
            <span />
          </button>

        </div>

      </div>

    </aside>
  );
}