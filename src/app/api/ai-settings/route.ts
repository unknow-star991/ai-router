import {
  getAISettings,
  updateAISettings,
} from "@/lib/ai-settings";

export async function GET() {
  try {
    const settings =
      await getAISettings();

    return Response.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error(
      "GET /api/ai-settings ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Failed to load AI settings.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const settings =
      await updateAISettings(body);

    return Response.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error(
      "PATCH /api/ai-settings ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Failed to update AI settings.",
      },
      {
        status: 500,
      }
    );
  }
}