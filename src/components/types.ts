export type ModelTier =
  | "free"
  | "limited"
  | "token";

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

  description?: string;

  supportsImageInput?: boolean;

  tags?: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ChatMessage {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  model?: string;

  createdAt: number;

  usage?: TokenUsage;
}