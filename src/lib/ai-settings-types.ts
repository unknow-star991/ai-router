export type AITheme =
  | "dark"
  | "light";

export interface AISettings {
  aiName: string;
  appName: string;
  personality: string;
  theme: AITheme;
  accentColor: string;
}