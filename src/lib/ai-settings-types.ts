export type AITheme = "dark" | "light";

export interface AISettings {
  aiName: string;
  appName: string;
  personality: string;
  theme: AITheme;
  accentColor: string;
}

export type AISettingsUpdate = Partial<AISettings>;

export interface AISettingsResponse {
  success: boolean;
  settings: AISettings;
  error?: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  aiName: "Ari AI",
  appName: "AI Router",
  personality:
    "Helpful, intelligent, concise, and natural.",
  theme: "dark",
  accentColor: "#ffffff",
};