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