import type { ModelConfig } from "./types";

const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const apiKey = process.env.OPENROUTER_API_KEY;

/*
|--------------------------------------------------------------------------
| MODEL REGISTRY
|--------------------------------------------------------------------------
*/

export const models: ModelConfig[] = [
  // =========================
  // FREE
  // =========================

  {
    id: "openrouter/free",
    name: "Auto Free",
    provider: "openrouter",
    tier: "free",

    description:
      "OpenRouter memilih model gratis yang paling sesuai.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
      "vision",
    ],

    priority: 10,
    speed: 9,
    quality: 8,

    supportsImageInput: true,

    tags: [
      "FREE",
      "AUTO",
      "GENERAL",
    ],
  },

  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    provider: "openrouter",
    tier: "free",

    description:
      "Model open-weight untuk reasoning dan coding.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
    ],

    priority: 9,
    speed: 9,
    quality: 8,

    tags: [
      "FREE",
      "REASONING",
      "CODING",
    ],
  },

  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    provider: "openrouter",
    tier: "free",

    description:
      "Model multimodal untuk general, coding, reasoning, dan vision.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
      "vision",
    ],

    priority: 9,
    speed: 8,
    quality: 9,

    supportsImageInput: true,

    tags: [
      "FREE",
      "VISION",
      "GOOGLE",
    ],
  },

  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    tier: "free",

    description:
      "Model multimodal yang lebih besar untuk reasoning dan vision.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
      "vision",
    ],

    priority: 10,
    speed: 7,
    quality: 9,

    supportsImageInput: true,

    tags: [
      "FREE",
      "VISION",
      "REASONING",
    ],
  },

  {
    id: "nvidia/nemotron-3-ultra:free",
    name: "Nemotron 3 Ultra",
    provider: "openrouter",
    tier: "free",

    description:
      "Model NVIDIA untuk reasoning kompleks dan coding.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
    ],

    priority: 10,
    speed: 7,
    quality: 10,

    tags: [
      "FREE",
      "REASONING",
      "CODING",
    ],
  },

  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano",
    provider: "openrouter",
    tier: "free",

    description:
      "Model ringan dan cepat untuk tugas general.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
    ],

    priority: 7,
    speed: 10,
    quality: 7,

    tags: [
      "FREE",
      "FAST",
    ],
  },

  {
    id: "nvidia/nemotron-3-nano-omni:free",
    name: "Nemotron Nano Omni",
    provider: "openrouter",
    tier: "free",

    description:
      "Model multimodal untuk memahami gambar, video, audio, dan teks.",

    capabilities: [
      "general",
      "reasoning",
      "vision",
    ],

    priority: 10,
    speed: 8,
    quality: 8,

    supportsImageInput: true,

    tags: [
      "FREE",
      "VISION",
      "MULTIMODAL",
    ],
  },

  // =========================
  // TOKEN
  // =========================

  {
    id: "openai/gpt-5.6",
    name: "GPT-5.6",
    provider: "openrouter",
    tier: "token",

    description:
      "Model premium untuk reasoning dan coding kompleks.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
      "vision",
    ],

    priority: 10,
    speed: 8,
    quality: 10,

    supportsImageInput: true,

    tags: [
      "TOKEN",
      "PREMIUM",
      "REASONING",
    ],
  },

  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "openrouter",
    tier: "token",

    description:
      "Model cepat untuk general, coding, dan multimodal.",

    capabilities: [
      "general",
      "coding",
      "reasoning",
      "creative",
      "vision",
    ],

    priority: 9,
    speed: 10,
    quality: 9,

    supportsImageInput: true,

    tags: [
      "TOKEN",
      "FAST",
      "VISION",
    ],
  },
];

/*
|--------------------------------------------------------------------------
| RUN OPENROUTER
|--------------------------------------------------------------------------
*/

export async function runOpenRouter(
  message: string,
  model: string
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY belum ditemukan di .env.local"
    );
  }

  const response = await fetch(
    OPENROUTER_API_URL,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",

        "HTTP-Referer":
          "http://localhost:3000",

        "X-Title":
          "AI Router",
      },

      body: JSON.stringify({
        model,

        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "OpenRouter API Error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        `OpenRouter error: ${response.status}`
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    console.error(
      "Invalid OpenRouter response:",
      data
    );

    throw new Error(
      "OpenRouter tidak mengembalikan response yang valid."
    );
  }

  return content;
}