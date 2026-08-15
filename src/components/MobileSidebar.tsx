"use client";

import type { ReactNode } from "react";

import Sidebar from "./Sidebar";

import type {
  ChatMessage,
  ModelInfo,
} from "./types";

import type {
  AISettings,
} from "@/lib/ai-settings-types";

interface MobileSidebarProps {
  open: boolean;

  onClose: () => void;

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

export default function MobileSidebar({
  open,
  onClose,
  models,
  selectedModel,
  onModelChange,
  messages,
  onNewChat,
  usage,
  maxUsage,
  aiSettings,
}: MobileSidebarProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="mobile-sidebar-layer">

      {/* BACKDROP */}

      <button
        type="button"
        className="mobile-sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={onClose}
      />

      {/* SIDEBAR */}

      <div className="mobile-sidebar-panel">

        <Sidebar
          models={models}

          selectedModel={
            selectedModel
          }

          onModelChange={
            onModelChange
          }

          messages={messages}

          onNewChat={() => {
            onNewChat();
            onClose();
          }}

          usage={usage}

          maxUsage={maxUsage}

          aiSettings={
            aiSettings
          }
        />

      </div>
    </div>
  );
}