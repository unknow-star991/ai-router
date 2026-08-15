"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  ModelInfo,
} from "./types";

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

export default function ChatHeader({
  models,
  selectedModel,
  onModelChange,
  onOpenSidebar,
}: ChatHeaderProps) {
  const [
    settings,
    setSettings,
  ] = useState<AISettings>({
    aiName: "A",
    appName: "AI Router",
  });

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | LOAD AI SETTINGS
  |--------------------------------------------------------------------------
  */

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
            "Failed to load AI settings"
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
              "A",

            appName:
              data.settings.appName ||
              "AI Router",

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
          "AI SETTINGS LOAD ERROR:",
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

  /*
  |--------------------------------------------------------------------------
  | FIND SELECTED MODEL
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        {/* Mobile sidebar button */}

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

        {/* AI avatar */}

        <div className="chat-ai-avatar">
          <span>
            {loadingSettings
              ? "✦"
              : settings.aiName
                  .charAt(0)
                  .toUpperCase()}
          </span>
        </div>

        {/* AI information */}

        <div className="chat-header-info">
          <div className="chat-header-title">
            <span>
              {loadingSettings
                ? "AI"
                : settings.aiName}
            </span>

            <span className="ai-status-dot" />
          </div>

          <div className="chat-header-subtitle">
            {settings.appName}
          </div>
        </div>
      </div>

      {/* Model selector */}

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