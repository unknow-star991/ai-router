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

import {
  detectAIAction,
  executeAIAction,
} from "@/lib/ai-actions";

import {
  getAISettings,
} from "@/lib/ai-settings";

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

/*
|--------------------------------------------------------------------------
| BUILD SYSTEM PROMPT
|--------------------------------------------------------------------------
*/

function buildSystemPrompt(): string {
  const settings =
    getAISettings();

  return `
You are ${settings.aiName}, the AI assistant inside ${settings.appName}.

Your current personality:
${settings.personality}

You are an AI that operates inside this website.

IMPORTANT CAPABILITIES:

- You can modify the AI settings of this website when the user explicitly asks.
- You can change your own AI name.
- You can change the website/application name.
- You can modify your personality, theme, and accent color when requested.
- You can read project files when the appropriate code action is requested.
- You can modify project files when the appropriate code action is requested.

If the user asks you to change your name or the website name, do NOT claim that you have no access to the website.

The application has a server-side action system that handles these requests.

Current AI name:
${settings.aiName}

Current application name:
${settings.appName}

When an action has already been executed successfully, acknowledge the change naturally and continue the conversation.

Do not invent limitations that contradict the capabilities of this application.
`.trim();
}

/*
|--------------------------------------------------------------------------
| POST /api/chat
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const conversationId =
      typeof body.conversationId === "string"
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
      id: createId(),

      conversationId,

      role: "user",

      content: userContent,

      model:
        requestedModel || undefined,
    });

    /*
    |--------------------------------------------------------------------------
    | DETECT DIRECT AI ACTION
    |--------------------------------------------------------------------------
    */

    const detectedAction =
      detectAIAction(
        userContent
      );

    /*
    |--------------------------------------------------------------------------
    | EXECUTE AI ACTION
    |--------------------------------------------------------------------------
    */

    if (detectedAction) {
      try {
        const result =
          await executeAIAction(
            detectedAction
          );

        /*
        |--------------------------------------------------------------------------
        | BUILD ACTION RESPONSE
        |--------------------------------------------------------------------------
        */

        let actionResponse =
          "Perubahan berhasil dilakukan.";

        if (
          detectedAction.type ===
          "update_ai_settings"
        ) {
          const settings =
            await getAISettings();

          actionResponse =
            `Berhasil. Pengaturan AI sekarang sudah diperbarui. Nama AI: ${settings.aiName}. Nama aplikasi: ${settings.appName}.`;
        }

        if (
          detectedAction.type ===
          "read_file"
        ) {
          actionResponse =
            typeof result === "string"
              ? result
              : "File berhasil dibaca.";
        }

        if (
          detectedAction.type ===
          "replace_in_file"
        ) {
          actionResponse =
            typeof result === "string"
              ? result
              : "File berhasil diperbarui.";
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE ACTION RESPONSE
        |--------------------------------------------------------------------------
        */

        await saveMessage({
          id: createId(),

          conversationId,

          role: "assistant",

          content:
            actionResponse,

          model:
            requestedModel ||
            undefined,
        });

        await updateConversationTimestamp(
          conversationId
        );

        /*
        |--------------------------------------------------------------------------
        | RETURN ACTION RESPONSE
        |--------------------------------------------------------------------------
        */

        return new NextResponse(
          actionResponse,
          {
            status: 200,

            headers: {
              "Content-Type":
                "text/plain; charset=utf-8",

              "Cache-Control":
                "no-cache, no-transform",

              "X-Conversation-Id":
                conversationId,

              "X-Action":
                detectedAction.type,
            },
          }
        );
      } catch (error) {
        console.error(
          "AI ACTION ERROR:",
          error
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : "AI action gagal.";

        return NextResponse.json(
          {
            success: false,

            error:
              `AI action gagal: ${errorMessage}`,
          },
          {
            status: 500,
          }
        );
      }
    }

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
    | BUILD SYSTEM MESSAGE
    |--------------------------------------------------------------------------
    */

    const systemMessage:
      OpenRouterMessage = {
        role: "system",
        content:
          buildSystemPrompt(),
      };

    /*
    |--------------------------------------------------------------------------
    | CONVERT DATABASE HISTORY
    |--------------------------------------------------------------------------
    */

    const conversation:
      OpenRouterMessage[] = [
        systemMessage,

        ...history.map(
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
        ),
      ];

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

    let upstream: Response;

    try {
      upstream =
        await streamOpenRouter(
          conversation,
          selectedModel.id
        );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      /*
      |--------------------------------------------------------------------------
      | RATE LIMIT
      |--------------------------------------------------------------------------
      */

      if (
        errorMessage
          .toLowerCase()
          .includes("rate limit") ||
        errorMessage
          .toLowerCase()
          .includes(
            "free-models-per-day"
          ) ||
        errorMessage.includes("429")
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Quota model gratis OpenRouter sudah habis. Router perlu pindah ke provider lain atau tunggu quota reset.",
          },
          {
            status: 429,

            headers: {
              "X-Conversation-Id":
                conversationId,

              "X-Model":
                selectedModel.id,

              "Retry-After":
                "3600",
            },
          }
        );
      }

      throw error;
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE STREAM
    |--------------------------------------------------------------------------
    */

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
                    JSON.parse(data);

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
                  Ignore malformed
                  SSE chunks.
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
    | RETURN STREAM
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

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server.";

    /*
    |--------------------------------------------------------------------------
    | RATE LIMIT FALLBACK
    |--------------------------------------------------------------------------
    */

    if (
      message
        .toLowerCase()
        .includes("rate limit") ||
      message
        .toLowerCase()
        .includes(
          "free-models-per-day"
        ) ||
      message.includes("429")
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Quota model gratis OpenRouter sudah habis.",
        },
        {
          status: 429,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GENERAL ERROR
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: false,

        error: message,
      },
      {
        status: 500,
      }
    );
  }
}