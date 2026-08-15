export type ModelTier = "free" | "limited";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities?: string[];
  priority?: number;
  speed?: number;
  quality?: number;
  cost?: number;
  tier?: ModelTier;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  createdAt: number;
}