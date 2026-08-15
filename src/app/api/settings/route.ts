import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAISettings,
  updateAISettings,
} from "@/lib/ai-settings";

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const settings =
      await getAISettings();

    return NextResponse.json({
      success: true,

      settings,
    });
  } catch (error) {
    console.error(
      "GET SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load settings.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const updates: Record<
      string,
      unknown
    > = {};

    if (
      typeof body.aiName ===
      "string"
    ) {
      updates.aiName =
        body.aiName.trim();
    }

    if (
      typeof body.appName ===
      "string"
    ) {
      updates.appName =
        body.appName.trim();
    }

    if (
      typeof body.personality ===
      "string"
    ) {
      updates.personality =
        body.personality.trim();
    }

    if (
      body.theme === "dark" ||
      body.theme === "light"
    ) {
      updates.theme =
        body.theme;
    }

    if (
      typeof body.accentColor ===
      "string"
    ) {
      updates.accentColor =
        body.accentColor.trim();
    }

    const settings =
      await updateAISettings(
        updates
      );

    return NextResponse.json({
      success: true,

      settings,
    });
  } catch (error) {
    console.error(
      "UPDATE SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to update settings.",
      },
      {
        status: 500,
      }
    );
  }
}