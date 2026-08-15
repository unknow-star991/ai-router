"use client";

import {
  useEffect,
  useState,
} from "react";

import type { ModelInfo } from "./types";

interface ChatHeaderProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (
    model: string
  ) => void;
  onOpenSidebar?: () => void;
}

interface AISettings {
  aiName: string;
  appName: string;
  personality?: string;
  theme?: "dark" | "light";
  accentColor?: string;
}

const DEFAULT_SETTINGS: AISettings = {
  aiName: "NEXA",
  appName: "AI Router",
};

export default function ChatHeader({
  models,
  selectedModel,
  onModelChange,
  onOpenSidebar,
}: ChatHeaderProps) {
  const [settings, setSettings] =
    useState<AISettings>(
      DEFAULT_SETTINGS
    );

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response =
          await fetch(
            "/api/ai-settings",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Failed to load AI settings: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          mounted &&
          data.success &&
          data.settings
        ) {
          setSettings({
            aiName:
              data.settings.aiName ||
              DEFAULT_SETTINGS.aiName,

            appName:
              data.settings.appName ||
              DEFAULT_SETTINGS.appName,

            personality:
              data.settings.personality,

            theme:
              data.settings.theme,

            accentColor:
              data.settings.accentColor,
          });
        }
      } catch (error) {
        console.error(
          "AI settings loading error:",
          error
        );
      } finally {
        if (mounted) {
          setLoadingSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedModelInfo =
    models.find(
      (model) =>
        model.id === selectedModel
    );

  const modelName =
    selectedModel === "auto"
      ? "Auto Free"
      : selectedModelInfo?.name ??
        selectedModel;

  const aiName =
    settings.aiName || "NEXA";

  const appName =
    settings.appName || "AI Router";

  const avatarLetter =
    aiName
      .trim()
      .charAt(0)
      .toUpperCase() || "N";

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        {onOpenSidebar && (
          <button
            type="button"
            className="mobile-menu-button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <div className="chat-ai-avatar">
          <span>
            {loadingSettings
              ? "✦"
              : avatarLetter}
          </span>
        </div>

        <div className="chat-header-info">
          <div className="chat-header-title">
            <span>
              {loadingSettings
                ? "NEXA"
                : aiName}
            </span>

            <span className="ai-status-dot" />
          </div>

          <div className="chat-header-subtitle">
            {appName}
          </div>
        </div>
      </div>

      <div className="chat-header-right">
        <div className="model-selector-wrapper">
          <select
            value={selectedModel}
            onChange={(event) =>
              onModelChange(
                event.target.value
              )
            }
            className="model-selector"
            aria-label="Select AI model"
          >
            <option value="auto">
              Auto Free
            </option>

            {models.map((model) => (
              <option
                key={model.id}
                value={model.id}
              >
                {model.name}
              </option>
            ))}
          </select>

          <span className="model-selector-arrow">
            ▾
          </span>
        </div>

        <div className="current-model">
          <span className="current-model-dot" />

          <span>
            {modelName}
          </span>
        </div>
      </div>
    </header>
  );
}