import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  models,
  streamOpenRouter,
} from "@/lib/provider";

import { routeAI } from "@/lib/router";

import {
  ensureConversation,
  saveMessage,
  getConversationMessages,
  updateConversationTimestamp,
} from "@/lib/chat-db";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const conversationId =
      body.conversationId;

    const incomingMessages =
      body.messages;

    const requestedModel =
      body.model;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !conversationId ||
      typeof conversationId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "conversationId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        incomingMessages
      ) ||
      incomingMessages.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Messages are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ENSURE CONVERSATION
    |--------------------------------------------------------------------------
    */

    await ensureConversation(
      conversationId
    );

    /*
    |--------------------------------------------------------------------------
    | FIND LATEST USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const latestUserMessage =
      [...incomingMessages]
        .reverse()
        .find(
          (message) =>
            message?.role ===
            "user"
        );

    if (
      !latestUserMessage ||
      typeof latestUserMessage.content !==
        "string"
    ) {
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

    /*
    |--------------------------------------------------------------------------
    | SAVE USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const userMessageId =
      typeof latestUserMessage.id ===
        "string"
        ? latestUserMessage.id
        : crypto.randomUUID();

    await saveMessage({
      id: userMessageId,

      conversationId,

      role: "user",

      content:
        latestUserMessage.content,
    });

    /*
    |--------------------------------------------------------------------------
    | LOAD CONVERSATION FROM DATABASE
    |--------------------------------------------------------------------------
    */

    const databaseMessages =
      await getConversationMessages(
        conversationId
      );

    /*
    |--------------------------------------------------------------------------
    | CONVERT DATABASE MESSAGES
    |
    | Provider tidak membutuhkan ChatMessage UI.
    | OpenRouter hanya membutuhkan role + content.
    |--------------------------------------------------------------------------
    */

    const conversation =
      databaseMessages.map(
        (message) => ({
          role:
            message.role as
              | "user"
              | "assistant",

          content:
            String(
              message.content
            ),
        })
      );

    /*
    |--------------------------------------------------------------------------
    | MODEL SELECTION
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
        routeAI(
          latestUserMessage.content
        );

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
      return NextResponse.json(
        {
          error:
            "Provider belum didukung.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | OPENROUTER STREAM
    |--------------------------------------------------------------------------
    */

    const upstream =
      await streamOpenRouter(
        conversation,
        selectedModel.id
      );

    if (!upstream.body) {
      throw new Error(
        "Stream tidak tersedia."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | STREAM READER
    |--------------------------------------------------------------------------
    */

    const reader =
      upstream.body.getReader();

    const decoder =
      new TextDecoder();

    const encoder =
      new TextEncoder();

    let fullResponse = "";

    /*
    |--------------------------------------------------------------------------
    | CREATE RESPONSE STREAM
    |--------------------------------------------------------------------------
    */

    const stream =
      new ReadableStream({
        async start(controller) {
          try {
            let buffer = "";

            while (true) {
              const {
                done,
                value,
              } =
                await reader.read();

              if (done) {
                break;
              }

              buffer +=
                decoder.decode(
                  value,
                  {
                    stream: true,
                  }
                );

              const lines =
                buffer.split(
                  "\n"
                );

              /*
              |----------------------------------------------------
              | Keep incomplete SSE line
              |----------------------------------------------------
              */

              buffer =
                lines.pop() ?? "";

              /*
              |----------------------------------------------------
              | Process SSE lines
              |----------------------------------------------------
              */

              for (
                const line of lines
              ) {
                const trimmed =
                  line.trim();

                if (
                  !trimmed ||
                  !trimmed.startsWith(
                    "data:"
                  )
                ) {
                  continue;
                }

                const data =
                  trimmed
                    .slice(5)
                    .trim();

                if (
                  data ===
                  "[DONE]"
                ) {
                  continue;
                }

                try {
                  const parsed =
                    JSON.parse(
                      data
                    );

                  const content =
                    parsed
                      ?.choices?.[0]
                      ?.delta
                      ?.content;

                  if (
                    typeof content ===
                      "string" &&
                    content.length > 0
                  ) {
                    fullResponse +=
                      content;

                    controller.enqueue(
                      encoder.encode(
                        content
                      )
                    );
                  }
                } catch {
                  /*
                  |----------------------------------------------
                  | Ignore invalid SSE chunks
                  |----------------------------------------------
                  */
                }
              }
            }

            /*
            |--------------------------------------------------------------------------
            | SAVE ASSISTANT RESPONSE
            |--------------------------------------------------------------------------
            */

            if (
              fullResponse.trim()
            ) {
              await saveMessage({
                id:
                  crypto.randomUUID(),

                conversationId,

                role:
                  "assistant",

                content:
                  fullResponse,

                model:
                  selectedModel.id,
              });

              await updateConversationTimestamp(
                conversationId
              );
            }

            /*
            |--------------------------------------------------------------------------
            | CLOSE STREAM
            |--------------------------------------------------------------------------
            */

            controller.close();
          } catch (error) {
            console.error(
              "STREAM ERROR:",
              error
            );

            controller.error(
              error
            );
          } finally {
            reader.releaseLock();
          }
        },
      });

    /*
    |--------------------------------------------------------------------------
    | RETURN STREAM
    |--------------------------------------------------------------------------
    */

    return new Response(
      stream,
      {
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-cache, no-transform",

          "X-AI-Model":
            selectedModel.name,

          "X-AI-Model-ID":
            selectedModel.id,

          "X-Conversation-ID":
            conversationId,
        },
      }
    );
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