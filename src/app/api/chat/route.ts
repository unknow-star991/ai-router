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
    const body =
      await request.json();

    const messages =
      body.messages;

    const requestedModel =
      body.model;

    /*
    |--------------------------------------------------------------------------
    | VALIDATE MESSAGES
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Messages are required",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE MESSAGE CONTENT
    |--------------------------------------------------------------------------
    */

    const validMessages =
      messages.every(
        (item) =>
          item &&
          typeof item === "object" &&
          (item.role === "user" ||
            item.role === "assistant") &&
          typeof item.content ===
            "string"
      );

    if (!validMessages) {
      return NextResponse.json(
        {
          error:
            "Invalid message format.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GET LATEST USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const latestUserMessage =
      [...messages]
        .reverse()
        .find(
          (item) =>
            item.role === "user"
        );

    if (!latestUserMessage) {
      return NextResponse.json(
        {
          error:
            "User message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const message =
      latestUserMessage.content;

    /*
    |--------------------------------------------------------------------------
    | SELECT MODEL
    |--------------------------------------------------------------------------
    */

    let selectedModel;

    if (
      requestedModel &&
      requestedModel !== "auto"
    ) {
      selectedModel =
        models.find(
          (model) =>
            model.id ===
            requestedModel
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

    /*
    |--------------------------------------------------------------------------
    | PROVIDER CHECK
    |--------------------------------------------------------------------------
    */

    if (
      selectedModel.provider !==
      "openrouter"
    ) {
      throw new Error(
        "Provider belum didukung."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RUN AI
    |--------------------------------------------------------------------------
    */

    const response =
      await runOpenRouter(
        messages,
        selectedModel.id
      );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

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