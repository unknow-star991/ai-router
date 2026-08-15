import {
  updateAISettings,
} from "@/lib/ai-settings";

export type AIAction =
  | {
      type: "update_ai_settings";

      changes: {
        aiName?: string;
        appName?: string;
        personality?: string;
        theme?: "dark" | "light";
        accentColor?: string;
      };
    };

export async function executeAIAction(
  action: AIAction
) {
  switch (action.type) {
    case "update_ai_settings": {
      return await updateAISettings(
        action.changes
      );
    }

    default:
      throw new Error(
        "Unknown AI action."
      );
  }
}

/*
|--------------------------------------------------------------------------
| DETECT BRANDING ACTION
|--------------------------------------------------------------------------
*/

export function detectAIAction(
  message: string
): AIAction | null {
  const text =
    message
      .toLowerCase()
      .trim();

  /*
  |--------------------------------------------------------------------------
  | RENAME APP
  |--------------------------------------------------------------------------
  */

  const renamePatterns = [
    /ganti nama (?:website|aplikasi|app|situs)(?:\s+ini)?\s+(?:jadi|menjadi)\s+["']?([^"'.!?]+)["']?/i,

    /ubah nama (?:website|aplikasi|app|situs)(?:\s+ini)?\s+(?:jadi|menjadi)\s+["']?([^"'.!?]+)["']?/i,

    /rename (?:website|app|application)(?:\s+ini)?\s+(?:to|jadi)\s+["']?([^"'.!?]+)["']?/i,

    /ganti nama(?:nya)?\s+(?:jadi|menjadi)\s+["']?([^"'.!?]+)["']?/i,

    /ubah nama(?:nya)?\s+(?:jadi|menjadi)\s+["']?([^"'.!?]+)["']?/i,
  ];

  for (
    const pattern of renamePatterns
  ) {
    const match =
      text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const name =
      match[1]
        .trim()
        .replace(
          /^["']|["']$/g,
          ""
        );

    if (!name) {
      continue;
    }

    return {
      type:
        "update_ai_settings",

      changes: {
        appName: name,
        aiName: name,
      },
    };
  }

  return null;
}