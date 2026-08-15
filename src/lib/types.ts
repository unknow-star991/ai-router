export type TaskType =
  | "general"
  | "coding"
  | "reasoning"
  | "creative"
  | "vision"
  | "image-edit";

export type ModelTier =
  | "free"
  | "token";

export interface ModelConfig {
  id: string;
  name: string;

  provider: "openrouter";

  tier: ModelTier;

  description: string;

  capabilities: TaskType[];

  priority: number;
  speed: number;
  quality: number;

  context?: string;

  supportsImageInput?: boolean;
  supportsImageGeneration?: boolean;

  tags?: string[];
}

export interface RouterResult {
  model: ModelConfig;
  task: TaskType;
  reason: string;
}