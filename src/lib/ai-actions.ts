import {
  updateAISettings,
} from "@/lib/ai-settings";

import {
  executeCodeAction,
  type CodeAction,
} from "@/lib/code-actions";

/*
|--------------------------------------------------------------------------
| AI ACTION TYPES
|--------------------------------------------------------------------------
*/

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
    }
  | CodeAction;

/*
|--------------------------------------------------------------------------
| EXECUTE AI ACTION
|--------------------------------------------------------------------------
*/

export async function executeAIAction(
  action: AIAction
) {
  switch (action.type) {
    case "update_ai_settings": {
      return await updateAISettings(
        action.changes
      );
    }

    case "read_file":
    case "replace_in_file": {
      return await executeCodeAction(
        action
      );
    }

    default: {
      throw new Error(
        "Unknown AI action."
      );
    }
  }
}

/*
|--------------------------------------------------------------------------
| CLEAN NAME
|--------------------------------------------------------------------------
*/

function cleanName(
  value: string
): string {
  return value
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

/*
|--------------------------------------------------------------------------
| DETECT AI ACTION
|--------------------------------------------------------------------------
*/

export function detectAIAction(
  message: string
): AIAction | null {
  const text =
    message.trim();

  const lower =
    text.toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | RENAME WEBSITE / AI
  |--------------------------------------------------------------------------
  |
  | Contoh yang didukung:
  |
  | "ganti nama website jadi Nexa"
  | "ubah nama website ke Nexa"
  | "ubah nama default website kamu ke Nexa"
  | "ganti nama AI menjadi Nexa"
  | "ubah nama kamu jadi Nexa"
  | "rename website to Nexa"
  | "change your name to Nexa"
  |
  */

  const renamePatterns = [
    /*
    | Website/app name
    */

    /(?:ganti|ubah|rename|change)\s+(?:nama\s+)?(?:default\s+)?(?:website|web|aplikasi|app|situs)(?:\s+(?:kamu|ini))?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | Nama website
    */

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:default\s+)?(?:website|web|aplikasi|app|situs)(?:\s+(?:kamu|ini))?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | Nama AI
    */

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:AI|ai)\s+(?:kamu|mu|ini)?\s*(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | "ubah nama kamu jadi Nexa"
    */

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:kamu|mu|AI|asisten)(?:\s+sendiri)?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | "kamu sekarang namanya Nexa"
    */

    /(?:kamu|ai|asisten)\s+(?:sekarang\s+)?(?:bernama|namanya|bernama\s+adalah)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | "jadikan nama website Nexa"
    */

    /(?:jadikan|jadikanlah)\s+(?:nama\s+)?(?:default\s+)?(?:website|web|aplikasi|app|situs)\s+(?:ini\s+)?["'`]?(.+?)["'`]?[.!?]*$/i,

    /*
    | English
    */

    /(?:change|rename)\s+(?:the\s+)?(?:default\s+)?(?:website|web|app|application)\s+name\s+(?:to|into)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:change|rename)\s+(?:your|the\s+AI's?)\s+name\s+(?:to|into)\s+["'`]?(.+?)["'`]?[.!?]*$/i,
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
      cleanName(match[1]);

    if (!name) {
      continue;
    }

    return {
      type:
        "update_ai_settings",

      changes: {
        /*
        | Kalau user meminta nama website,
        | kita ubah appName.
        |
        | AI name juga ikut berubah karena
        | default identity website ini memang
        | mengikuti nama AI.
        */

        appName: name,
        aiName: name,
      },
    };
  }

  /*
  |--------------------------------------------------------------------------
  | EXPLICIT AI NAME
  |--------------------------------------------------------------------------
  |
  | Contoh:
  |
  | "nama AI jadi Nexa"
  | "AI kamu sekarang Nexa"
  |
  */

  const aiNamePatterns = [
    /(?:nama\s+)?(?:AI|ai|asisten)\s+(?:kamu|mu)?\s*(?:sekarang\s+)?(?:jadi|menjadi|adalah|ke)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:kamu|AI|ai|asisten)\s+(?:sekarang\s+)?(?:namanya|bernama)\s+["'`]?(.+?)["'`]?[.!?]*$/i,
  ];

  for (
    const pattern of aiNamePatterns
  ) {
    const match =
      text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const name =
      cleanName(match[1]);

    if (!name) {
      continue;
    }

    return {
      type:
        "update_ai_settings",

      changes: {
        aiName: name,
      },
    };
  }

  /*
  |--------------------------------------------------------------------------
  | READ FILE
  |--------------------------------------------------------------------------
  */

  const readMatch =
    lower.match(
      /(?:baca|lihat|tampilkan|open|read)\s+(?:file\s+)?[`"]?([a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|css|json|md))[`"]?/i
    );

  if (readMatch?.[1]) {
    return {
      type:
        "read_file",

      path:
        readMatch[1],
    };
  }

  /*
  |--------------------------------------------------------------------------
  | REPLACE FILE
  |--------------------------------------------------------------------------
  */

  const replaceMatch =
    text.match(
      /(?:ganti|ubah|replace)\s+[`"]?(.+?)[`"]?\s+(?:menjadi|dengan|to|with)\s+[`"]?(.+?)[`"]?\s+(?:di|dalam|in|pada)\s+[`"]?([a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|css|json|md))[`"]?$/i
    );

  if (replaceMatch) {
    return {
      type:
        "replace_in_file",

      path:
        replaceMatch[3],

      search:
        replaceMatch[1],

      replacement:
        replaceMatch[2],

      commitMessage:
        `Nexa: update ${replaceMatch[3]}`,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | NO ACTION
  |--------------------------------------------------------------------------
  */

  return null;
}