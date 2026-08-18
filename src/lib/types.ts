export type ModelTier =
  | "free"
  | "limited"
  | "token";

export interface ModelConfig
  extends ModelInfo {}

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