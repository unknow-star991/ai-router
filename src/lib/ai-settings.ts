import { sql } from "@/lib/db";

import {
  AISettings,
  AISettingsUpdate,
  DEFAULT_AI_SETTINGS,
} from "./ai-settings-types";

function mapRow(row: any): AISettings {
  return {
    aiName: row.ai_name,
    appName: row.app_name,
    personality: row.personality,
    theme: row.theme,
    accentColor: row.accent_color,
  };
}

export async function getAISettings(): Promise<AISettings> {
  const result = await sql`
    SELECT
      ai_name,
      app_name,
      personality,
      theme,
      accent_color
    FROM ai_settings
    WHERE id = 1
    LIMIT 1
  `;

  if (result.length === 0) {
    await sql`
      INSERT INTO ai_settings (
        id,
        ai_name,
        app_name,
        personality,
        theme,
        accent_color
      )
      VALUES (
        1,
        ${DEFAULT_AI_SETTINGS.aiName},
        ${DEFAULT_AI_SETTINGS.appName},
        ${DEFAULT_AI_SETTINGS.personality},
        ${DEFAULT_AI_SETTINGS.theme},
        ${DEFAULT_AI_SETTINGS.accentColor}
      )
    `;

    return {
      ...DEFAULT_AI_SETTINGS,
    };
  }

  return mapRow(result[0]);
}

export async function updateAISettings(
  updates: AISettingsUpdate
): Promise<AISettings> {
  const current = await getAISettings();

  const next: AISettings = {
    ...current,
    ...updates,
  };

  const result = await sql`
    UPDATE ai_settings
    SET
      ai_name = ${next.aiName},
      app_name = ${next.appName},
      personality = ${next.personality},
      theme = ${next.theme},
      accent_color = ${next.accentColor},
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      ai_name,
      app_name,
      personality,
      theme,
      accent_color
  `;

  return mapRow(result[0]);
}

export async function resetAISettings(): Promise<AISettings> {
  return updateAISettings({
    ...DEFAULT_AI_SETTINGS,
  });
}