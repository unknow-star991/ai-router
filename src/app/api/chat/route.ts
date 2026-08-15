import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  models,
  runOpenRouter,
} from "@/lib/provider";

import { routeAI } from "@/lib/router";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const message = body.message;
    const requestedModel = body.model;

    if (
      !message ||
      typeof message !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Message is required",
        },
        {
          status: 400,
        }
      );
    }

    let selectedModel;

    if (
      requestedModel &&
      requestedModel !== "auto"
    ) {
      selectedModel = models.find(
        (model) =>
          model.id === requestedModel
      );

      if (!selectedModel) {
        return NextResponse.json(
          {
            error:
              "Model tidak ditemukan.",
          },
          {
            status: 400,
          }
        );
      }
    } else {
      const routing =
        routeAI(message);

      selectedModel =
        routing.model;
    }

    if (
      selectedModel.provider !==
      "openrouter"
    ) {
      throw new Error(
        "Provider belum didukung."
      );
    }

    const response =
      await runOpenRouter(
        message,
        selectedModel.id
      );

    return NextResponse.json({
      success: true,

      response,

      model:
        selectedModel.name,

      modelId:
        selectedModel.id,

      provider:
        selectedModel.provider,
    });
  } catch (error) {
    console.error(
      "CHAT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}