import type {
  OpenRouterMessage,
} from "../provider";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq(
  messages: OpenRouterMessage[],
  model: string
): Promise<Response> {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY belum ditemukan."
    );
  }

  const response = await fetch(
    GROQ_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model,

        messages,

        stream: true,
      }),
    }
  );

  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      data?.error?.message ||
        `Groq error: ${response.status}`
    );
  }

  if (!response.body) {
    throw new Error(
      "Groq tidak mengembalikan stream."
    );
  }

  return response;
}