import {
  updateAISettings,
} from "@/lib/ai-settings";

import {
  executeCodeAction,
  type CodeAction,
} from "@/lib/code-actions";

/*
|--------------------------------------------------------------------------
| MUSIC INTENT
|--------------------------------------------------------------------------
*/

export type MusicIntent = {
  type:
    | "play"
    | "pause"
    | "resume"
    | "next"
    | "previous"
    | "stop"
    | "search";

  query?: string;
};

/*
|--------------------------------------------------------------------------
| MUSIC DETECTION
|--------------------------------------------------------------------------
|
| Dibuat cukup natural supaya:
|
| "putar Numb"
| "putarin lagu Numb"
| "mainkan lagu Linkin Park"
| "nyalain lofi"
| "carikan lagu santai"
| "cari musik buat coding"
| "aku mau dengerin lagu..."
|
| bisa dikenali.
|
|--------------------------------------------------------------------------
*/

export function detectMusicIntent(
  message: string
): MusicIntent | null {
  const text = message
    .trim()
    .replace(/\s+/g, " ");

  const lower = text.toLowerCase();

  if (!text) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | PAUSE
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:pause|jeda|pause dulu|jeda dulu|berhentiin sebentar|hentikan sementara)$/i.test(
      text
    )
  ) {
    return {
      type: "pause",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | RESUME
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:resume|lanjut|lanjutkan|teruskan|play lagi|lanjut lagi)$/i.test(
      text
    )
  ) {
    return {
      type: "resume",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | NEXT
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:next|skip|next song|skip song|lagu berikutnya|musik berikutnya|video berikutnya|selanjutnya)$/i.test(
      text
    )
  ) {
    return {
      type: "next",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | PREVIOUS
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:previous|prev|back|previous song|lagu sebelumnya|musik sebelumnya|video sebelumnya|kembali)$/i.test(
      text
    )
  ) {
    return {
      type: "previous",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | STOP
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:stop|stop music|stop musik|berhenti|hentikan|matikan musik|matikan lagu|matikan video)$/i.test(
      text
    )
  ) {
    return {
      type: "stop",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | PLAY CURRENT
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:play|putar|mainkan|lanjutkan musik)$/i.test(
      text
    )
  ) {
    return {
      type: "play",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | EXPLICIT PLAY
  |--------------------------------------------------------------------------
  */

  const playPatterns = [
    /^(?:tolong\s+)?(?:play|putar|putarkan|mainkan|nyalakan|nyalain)\s+(?:musik|music|lagu)\s+(.+)$/i,

    /^(?:tolong\s+)?(?:play|putar|putarkan|mainkan|nyalakan|nyalain)\s+(?:video)\s+(.+)$/i,

    /^(?:tolong\s+)?(?:play|putar|putarkan|mainkan|nyalakan|nyalain)\s+(.+)$/i,

    /^(?:please\s+)?play\s+(?:music|song)\s+(.+)$/i,

    /^(?:please\s+)?play\s+(?:video)\s+(.+)$/i,
  ];

  for (const pattern of playPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const query = match[1]
      .trim()
      .replace(
        /^(?:musik|music|lagu|video)\s+/i,
        ""
      )
      .replace(/[.!?]+$/, "")
      .trim();

    if (!query) {
      continue;
    }

    return {
      type: "play",
      query,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | SEARCH / FIND MUSIC
  |--------------------------------------------------------------------------
  |
  | Ini tidak otomatis harus play.
  |
  | "cari lagu Numb"
  | "search music lofi"
  | "carikan lagu santai"
  |
  |--------------------------------------------------------------------------
  */

  const searchPatterns = [
    /^(?:cari|carikan|search|find)\s+(?:lagu|musik|music|song|video)\s+(.+)$/i,

    /^(?:aku mau|saya mau|pengen|ingin|mau)\s+(?:dengerin|dengarkan|denger|dengerin musik|musik|lagu)\s+(.+)$/i,

    /^(?:carikan|cari)\s+(.+?)\s+(?:buat|untuk)\s+(?:aku|saya|ngoding|coding|belajar|kerja)$/i,
  ];

  for (const pattern of searchPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const query = match[1]
      .trim()
      .replace(/[.!?]+$/, "")
      .trim();

    if (!query) {
      continue;
    }

    return {
      type: "search",
      query,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | NATURAL MUSIC REQUEST
  |--------------------------------------------------------------------------
  |
  | Contoh:
  |
  | "aku pengen dengerin lofi"
  | "putarin sesuatu yang santai"
  |
  |--------------------------------------------------------------------------
  */

  const naturalMusicPatterns = [
    /^(?:aku|saya)\s+(?:lagi\s+)?(?:pengen|ingin|mau)\s+(?:dengerin|dengarkan|denger)\s+(.+)$/i,

    /^(?:boleh|bisa)\s+(?:putarin|putarkan|mainkan|nyalain)\s+(.+)$/i,

    /^(?:carikan|cariin)\s+(?:aku|saya)?\s*(?:musik|lagu)\s+(.+)$/i,
  ];

  for (const pattern of naturalMusicPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const query = match[1]
      .trim()
      .replace(/[.!?]+$/, "")
      .trim();

    if (!query) {
      continue;
    }

    return {
      type: "play",
      query,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | SEARCH WORD FALLBACK
  |--------------------------------------------------------------------------
  */

  if (
    /^(?:cari|search|find)\s+/i.test(
      text
    )
  ) {
    const query = text
      .replace(
        /^(?:cari|search|find)\s+/i,
        ""
      )
      .trim();

    if (query) {
      return {
        type: "search",
        query,
      };
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NO MUSIC INTENT
  |--------------------------------------------------------------------------
  */

  return null;
}

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

        theme?:
          | "dark"
          | "light";

        accentColor?: string;
      };
    }

  | {
      type: "play_media";

      query: string;

      mediaType?:
        | "music"
        | "video";
    }

  | {
      type: "media_control";

      action:
        | "play"
        | "pause"
        | "resume"
        | "stop"
        | "next"
        | "previous";

      query?: string;
    }

  | CodeAction;

/*
|--------------------------------------------------------------------------
| MUSIC INTENT -> AI ACTION
|--------------------------------------------------------------------------
*/

function musicIntentToAction(
  intent: MusicIntent
): AIAction {
  if (intent.type === "play") {
    if (intent.query) {
      return {
        type: "play_media",
        query: intent.query,
        mediaType: "music",
      };
    }

    return {
      type: "media_control",
      action: "play",
    };
  }

  if (intent.type === "search") {
    /*
    | Search juga kita jadikan play_media.
    |
    | Jadi frontend langsung bisa mencari hasil YouTube.
    |
    */
    return {
      type: "play_media",
      query: intent.query ?? "",
      mediaType: "music",
    };
  }

  return {
    type: "media_control",
    action: intent.type,
  };
}

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

    case "play_media":
    case "media_control": {
      return {
        success: true,
        type: action.type,
        action,
      };
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
    .replace(
      /^["'`]+/,
      ""
    )
    .replace(
      /["'`]+$/,
      ""
    )
    .replace(
      /[.!?]+$/,
      ""
    )
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
  */

  const renamePatterns = [
    /(?:ganti|ubah|rename|change)\s+(?:nama\s+)?(?:default\s+)?(?:website|web|aplikasi|app|situs)(?:\s+(?:kamu|ini))?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:default\s+)?(?:website|web|aplikasi|app|situs)(?:\s+(?:kamu|ini))?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:AI|ai)\s+(?:kamu|mu|ini)?\s*(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:ganti|ubah|change|rename)\s+nama\s+(?:kamu|mu|AI|asisten)(?:\s+sendiri)?\s+(?:ke|jadi|menjadi|to)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:kamu|ai|asisten)\s+(?:sekarang\s+)?(?:bernama|namanya|bernama\s+adalah)\s+["'`]?(.+?)["'`]?[.!?]*$/i,

    /(?:jadikan|jadikanlah)\s+(?:nama\s+)?(?:default\s+)?(?:website|web|aplikasi|app|situs)\s+(?:ini\s+)?["'`]?(.+?)["'`]?[.!?]*$/i,

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
      cleanName(
        match[1]
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

  /*
  |--------------------------------------------------------------------------
  | EXPLICIT AI NAME
  |--------------------------------------------------------------------------
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
      cleanName(
        match[1]
      );

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
  | MUSIC
  |--------------------------------------------------------------------------
  */

  const musicIntent =
    detectMusicIntent(text);

  if (musicIntent) {
    return musicIntentToAction(
      musicIntent
    );
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

  if (
    readMatch?.[1]
  ) {
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

  if (
    replaceMatch
  ) {
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

/*
|--------------------------------------------------------------------------
| EXPORT MUSIC SYSTEM INSTRUCTIONS
|--------------------------------------------------------------------------
*/

export const MUSIC_SYSTEM_INSTRUCTIONS = `
MEDIA AND MUSIC:

You are Nexa, an AI assistant with integrated YouTube music controls.

The application can control the currently playing YouTube media.

IMPORTANT:
- A media action is executed by the application, not by you directly.
- Never invent a YouTube URL.
- Never claim playback happened unless the application executes the media action.
- Understand natural Indonesian and English music requests.
- Normal music discussion is NOT automatically a playback command.

Examples:

User:
"putar Numb"

Assistant:
"Siap, aku putar Numb."

User:
"pause dulu"

Assistant:
"Oke, musiknya aku jeda."

User:
"lanjutin"

Assistant:
"Siap, aku lanjutkan."

User:
"lagu berikutnya"

Assistant:
"Siap, lanjut ke lagu berikutnya."

User:
"aku pengen lagu santai"

Assistant:
"Siap, aku carikan yang santai."

User:
"menurutmu lagu Numb bagus?"

Assistant:
Normal conversation. Do not play anything.

When a media action is detected:
- Keep the response short.
- Do not explain internal action handling.
- Do not fabricate search results.
`;