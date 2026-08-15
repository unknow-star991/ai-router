import type { OpenRouterMessage } from "../provider";

const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY;

const GOOGLE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function streamGoogle(
  messages: OpenRouterMessage[],
  model: string
): Promise<Response> {
  if (!GOOGLE_API_KEY) {
    throw new Error(
      "GOOGLE_API_KEY belum ditemukan di environment variables."
    );
  }

  const systemMessages =
    messages.filter(
      (message) =>
        message.role === "system"
    );

  const normalMessages =
    messages.filter(
      (message) =>
        message.role !== "system"
    );

  const systemInstruction =
    systemMessages.length > 0
      ? {
          parts: [
            {
              text: systemMessages
                .map(
                  (message) =>
                    message.content
                )
                .join("\n\n"),
            },
          ],
        }
      : undefined;

  const contents =
    normalMessages.map(
      (message) => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text: message.content,
          },
        ],
      })
    );

  const response =
    await fetch(
      `${GOOGLE_API_URL}/${model}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...(systemInstruction
            ? {
                systemInstruction,
              }
            : {}),

          contents,
        }),
      }
    );

  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(() => null);

    console.error(
      "Google Gemini Error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        `Google error: ${response.status}`
    );
  }

  if (!response.body) {
    throw new Error(
      "Google tidak mengembalikan stream."
    );
  }

  return response;
}