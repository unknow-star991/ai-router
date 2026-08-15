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

    const message =
      body.message;

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
      !message ||
      typeof message !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Message is required.",
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
    | SAVE USER MESSAGE
    |--------------------------------------------------------------------------
    */

    await saveMessage({
      id:
        crypto.randomUUID(),

      conversationId,

      role: "user",

      content: message,
    });

    /*
    |--------------------------------------------------------------------------
    | LOAD MEMORY
    |--------------------------------------------------------------------------
    */

    const databaseMessages =
      await getConversationMessages(
        conversationId
      );

    /*
    |--------------------------------------------------------------------------
    | PREPARE OPENROUTER CONTEXT
    |--------------------------------------------------------------------------
    */

    const conversation =
      databaseMessages.map(
        (item) => ({
          role:
            item.role as
              | "user"
              | "assistant",

          content:
            String(
              item.content
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
    | START OPENROUTER STREAM
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
    | READ OPENROUTER STREAM
    |--------------------------------------------------------------------------
    */

    const reader =
      upstream.body.getReader();

    const decoder =
      new TextDecoder();

    const encoder =
      new TextEncoder();

    let fullResponse =
      "";

    /*
    |--------------------------------------------------------------------------
    | CREATE SERVER STREAM
    |--------------------------------------------------------------------------
    */

    const stream =
      new ReadableStream({
        async start(
          controller
        ) {
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

              buffer =
                lines.pop() ??
                "";

              /*
              |--------------------------------------------------------------------------
              | PROCESS SSE
              |--------------------------------------------------------------------------
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
                  Ignore invalid SSE chunks.
                  */
                }
              }
            }

            /*
            |--------------------------------------------------------------------------
            | SAVE ASSISTANT MESSAGE
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
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE CONVERSATION
            |--------------------------------------------------------------------------
            */

            await updateConversationTimestamp(
              conversationId
            );

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
    | RESPONSE
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