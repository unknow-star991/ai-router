/*
|--------------------------------------------------------------------------
| PROVIDER TYPES
|--------------------------------------------------------------------------
*/

export type ProviderName =
  | "openrouter"
  | "groq"
  | "google";

/*
|--------------------------------------------------------------------------
| PROVIDER MESSAGE
|--------------------------------------------------------------------------
*/

export interface ProviderMessage {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
}

/*
|--------------------------------------------------------------------------
| PROVIDER CONFIG
|--------------------------------------------------------------------------
*/

export interface ProviderConfig {
  name: ProviderName;

  apiKey?: string;

  baseUrl: string;
}

/*
|--------------------------------------------------------------------------
| PROVIDER REQUEST
|--------------------------------------------------------------------------
*/

export interface ProviderRequest {
  model: string;

  messages: ProviderMessage[];

  stream?: boolean;

  temperature?: number;

  max_tokens?: number;
}

/*
|--------------------------------------------------------------------------
| PROVIDER ERROR
|--------------------------------------------------------------------------
*/

export interface ProviderError {
  provider: ProviderName;

  status?: number;

  message: string;

  retryable?: boolean;
}

/*
|--------------------------------------------------------------------------
| PROVIDER RESPONSE
|--------------------------------------------------------------------------
*/

export interface ProviderResponse {
  provider: ProviderName;

  model: string;

  response: Response;
}