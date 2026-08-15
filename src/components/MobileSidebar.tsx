"use client";

import Sidebar from "./Sidebar";
import type {
  ChatMessage,
  ModelInfo,
} from "./types";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  messages: ChatMessage[];
  onNewChat: () => void;
  usage: number;
  maxUsage: number;
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
}: MobileSidebarProps) {
  if (!open) {
    return null;
  }

  const handleModelChange = (model: string) => {
    onModelChange(model);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  return (
    <div
      className="mobile-sidebar-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile sidebar"
    >
      <button
        type="button"
        className="mobile-sidebar-backdrop"
        onClick={onClose}
        aria-label="Close sidebar"
      />

      <div className="mobile-sidebar-panel">
        <Sidebar
          models={models}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          messages={messages}
          onNewChat={handleNewChat}
          usage={usage}
          maxUsage={maxUsage}
        />
      </div>
    </div>
  );
}