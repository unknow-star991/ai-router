import { sql } from "@/lib/db";

export type AITheme =
  | "dark"
  | "light";

export interface AISettings {
  id: number;

  aiName: string;

  appName: string;

  personality: string;

  theme: AITheme;

  accentColor: string;

  updatedAt?: string;
}

/*
|--------------------------------------------------------------------------
| GET SETTINGS
|--------------------------------------------------------------------------
*/

export async function getAISettings(): Promise<AISettings> {
  const result =
    await sql`
      SELECT
        id,
        ai_name,
        app_name,
        personality,
        theme,
        accent_color,
        updated_at
      FROM ai_settings
      WHERE id = 1
      LIMIT 1
    `;

  if (result.length === 0) {
    const created =
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
          'A',
          'AI Router',
          'calm, intelligent, helpful, natural',
          'dark',
          '#00d9ff'
        )
        RETURNING
          id,
          ai_name,
          app_name,
          personality,
          theme,
          accent_color,
          updated_at
      `;

    return normalizeSettings(
      created[0]
    );
  }

  return normalizeSettings(
    result[0]
  );
}

/*
|--------------------------------------------------------------------------
| UPDATE SETTINGS
|--------------------------------------------------------------------------
*/

export async function updateAISettings(
  updates: Partial<
    Omit<AISettings, "id" | "updatedAt">
  >
): Promise<AISettings> {
  const current =
    await getAISettings();

  const aiName =
    updates.aiName ??
    current.aiName;

  const appName =
    updates.appName ??
    current.appName;

  const personality =
    updates.personality ??
    current.personality;

  const theme =
    updates.theme ??
    current.theme;

  const accentColor =
    updates.accentColor ??
    current.accentColor;

  const result =
    await sql`
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
        id,
        ai_name,
        app_name,
        personality,
        theme,
        accent_color,
        updated_at
    `;

  return normalizeSettings(
    result[0]
  );
}

/*
|--------------------------------------------------------------------------
| NORMALIZE DATABASE ROW
|--------------------------------------------------------------------------
*/

function normalizeSettings(
  row: any
): AISettings {
  return {
    id: Number(row.id),

    aiName:
      String(row.ai_name),

    appName:
      String(row.app_name),

    personality:
      String(row.personality),

    theme:
      row.theme === "light"
        ? "light"
        : "dark",

    accentColor:
      String(row.accent_color),

    updatedAt:
      row.updated_at
        ? String(
            row.updated_at
          )
        : undefined,
  };
}