import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  models,
  streamOpenRouter,
  type OpenRouterMessage,
} from "@/lib/provider";

import {
  ensureConversation,
  saveMessage,
  getConversationMessages,
  updateConversationTimestamp,
} from "@/lib/chat-db";

type MessageRole =
  | "user"
  | "assistant"
  | "system";

function createId(): string {
  return crypto.randomUUID();
}

function normalizeRole(
  role: unknown
): MessageRole {
  if (role === "assistant") {
    return "assistant";
  }

  if (role === "system") {
    return "system";
  }

  return "user";
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const conversationId =
      typeof body.conversationId ===
      "string"
        ? body.conversationId.trim()
        : "";

    const incomingMessages =
      Array.isArray(body.messages)
        ? body.messages
        : [];

    const requestedModel =
      typeof body.model === "string"
        ? body.model
        : "openrouter/free";

    /*
    |--------------------------------------------------------------------------
    | VALIDATE CONVERSATION
    |--------------------------------------------------------------------------
    */

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "conversationId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND LAST USER MESSAGE
    |--------------------------------------------------------------------------
    */

    const lastMessage =
      incomingMessages[
        incomingMessages.length - 1
      ];

    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      typeof lastMessage.content !==
        "string" ||
      !lastMessage.content.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pesan user tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const userContent =
      lastMessage.content.trim();

    /*
    |--------------------------------------------------------------------------
    | ENSURE DATABASE CONVERSATION
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
      id: createId(),

      conversationId,

      role: "user",

      content: userContent,

      model:
        requestedModel || undefined,
    });

    /*
    |--------------------------------------------------------------------------
    | LOAD CONVERSATION HISTORY
    |--------------------------------------------------------------------------
    */

    const history =
      await getConversationMessages(
        conversationId
      );

    /*
    |--------------------------------------------------------------------------
    | CONVERT DATABASE HISTORY
    |--------------------------------------------------------------------------
    */

    const conversation: OpenRouterMessage[] =
      history.map(
        (
          message
        ): OpenRouterMessage => ({
          role: normalizeRole(
            message.role
          ),

          content:
            String(
              message.content
            ),
        })
      );

    /*
    |--------------------------------------------------------------------------
    | SELECT MODEL
    |--------------------------------------------------------------------------
    */

    const selectedModel =
      models.find(
        (model) =>
          model.id ===
          requestedModel
      ) ??
      models.find(
        (model) =>
          model.id ===
          "openrouter/free"
      ) ??
      models[0];

    if (!selectedModel) {
      throw new Error(
        "Tidak ada model AI yang tersedia."
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
    | RESPONSE STREAM
    |--------------------------------------------------------------------------
    */

    const stream =
      new ReadableStream<Uint8Array>({
        async start(
          controller
        ) {
          let buffer = "";

          try {
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
                buffer.split("\n");

              buffer =
                lines.pop() ?? "";

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
                  data === "[DONE]"
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
                      ?.delta?.content;

                  if (
                    typeof content !==
                    "string"
                  ) {
                    continue;
                  }

                  fullResponse +=
                    content;

                  controller.enqueue(
                    encoder.encode(
                      content
                    )
                  );
                } catch {
                  /*
                  | Ignore malformed SSE chunk
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
                id: createId(),

                conversationId,

                role: "assistant",

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
              "CHAT STREAM ERROR:",
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
    | RETURN RESPONSE
    |--------------------------------------------------------------------------
    */

    return new NextResponse(
      stream,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-cache, no-transform",

          "X-Conversation-Id":
            conversationId,

          "X-Model":
            selectedModel.id,
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
            : "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}