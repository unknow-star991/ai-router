import {
  AISettings,
  AISettingsUpdate,
  DEFAULT_AI_SETTINGS,
} from "./ai-settings-types";

let settings: AISettings = {
  ...DEFAULT_AI_SETTINGS,
};

export function getAISettings(): AISettings {
  return {
    ...settings,
  };
}

export function updateAISettings(
  updates: AISettingsUpdate
): AISettings {
  settings = {
    ...settings,
    ...updates,
  };

  return {
    ...settings,
  };
}

export function resetAISettings(): AISettings {
  settings = {
    ...DEFAULT_AI_SETTINGS,
  };

  return {
    ...settings,
  };
}