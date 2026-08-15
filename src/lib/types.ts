export type ModelTier =
  | "free"
  | "token"
  | "limited";

export type AIProvider =
  | "openrouter"
  | "groq"
  | "google";

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;

  capabilities?: string[];

  priority?: number;
  speed?: number;
  quality?: number;
  cost?: number;

  tier?: ModelTier;

  description?: string;
  supportsImageInput?: boolean;
  tags?: string[];
}

export interface ModelConfig extends ModelInfo {}

export interface ChatMessage {
  id: string;

  role:
    | "user"
    | "assistant"
    | "system";

  content: string;

  model?: string;

  createdAt?: number;
}