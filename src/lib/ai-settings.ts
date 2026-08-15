import { sql } from "@/lib/db";
import type { AISettings } from "@/lib/ai-settings-types";

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
    const created = await sql`
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
        'AI',
        'AI Router',
        'Helpful, intelligent, and conversational.',
        'dark',
        '#ffffff'
      )
      RETURNING
        ai_name,
        app_name,
        personality,
        theme,
        accent_color
    `;

    return {
      aiName: created[0].ai_name,
      appName: created[0].app_name,
      personality: created[0].personality,
      theme: created[0].theme,
      accentColor: created[0].accent_color,
    };
  }

  return {
    aiName: result[0].ai_name,
    appName: result[0].app_name,
    personality: result[0].personality,
    theme: result[0].theme,
    accentColor: result[0].accent_color,
  };
}

export async function updateAISettings(
  updates: Partial<AISettings>
): Promise<AISettings> {
  const current =
    await getAISettings();

  const aiName =
    updates.aiName ?? current.aiName;

  const appName =
    updates.appName ?? current.appName;

  const personality =
    updates.personality ??
    current.personality;

  const theme =
    updates.theme ?? current.theme;

  const accentColor =
    updates.accentColor ??
    current.accentColor;

  const result = await sql`
    UPDATE ai_settings
    SET
      ai_name = ${aiName},
      app_name = ${appName},
      personality = ${personality},
      theme = ${theme},
      accent_color = ${accentColor},
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      ai_name,
      app_name,
      personality,
      theme,
      accent_color
  `;

  return {
    aiName: result[0].ai_name,
    appName: result[0].app_name,
    personality: result[0].personality,
    theme: result[0].theme,
    accentColor: result[0].accent_color,
  };
}