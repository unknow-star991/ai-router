"use client";

import ModelSelector from "./ModelSelector";
import type { ModelInfo } from "./types";

interface ChatHeaderProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  onOpenSidebar: () => void;
}

export default function ChatHeader({
  models,
  selectedModel,
  onModelChange,
  onOpenSidebar,
}: ChatHeaderProps) {
  const current =
    models.find(
      (model) => model.id === selectedModel
    );

  return (
    <header className="chat-header">
      <button
        className="mobile-menu-button"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="header-model">
        <div className="header-model-icon">
          {selectedModel === "auto"
            ? "✦"
            : current?.name
                ?.slice(0, 1)
                .toUpperCase() ?? "AI"}
        </div>

        <div>
          <strong>
            {selectedModel === "auto"
              ? "Auto Router"
              : current?.name ??
                "AI Router"}
          </strong>

          <span>
            {selectedModel === "auto"
              ? "Automatic routing"
              : current?.provider ??
                "OpenRouter"}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onChange={onModelChange}
        />
      </div>
    </header>
  );
}