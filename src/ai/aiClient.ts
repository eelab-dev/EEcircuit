/**
 * AI Client - supports OpenAI, Anthropic, and Google Gemini
 * Each user provides their own API key (stored in localStorage).
 */

export type AiProvider = "openai" | "anthropic" | "google";

export type AiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

export const PROVIDER_DEFAULTS: Record<AiProvider, { models: string[]; defaultModel: string }> = {
  openai: {
    models: ["gpt-5-pro", "o3", "gpt-5"],
    defaultModel: "gpt-5-pro",
  },
  anthropic: {
    models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
    defaultModel: "claude-sonnet-4-6",
  },
  google: {
    models: ["gemini-3.1-pro", "gemini-3.0-pro", "gemini-3.0-flash"],
    defaultModel: "gemini-3.1-pro",
  },
};

async function callOpenAI(config: AiConfig, messages: AiMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

async function callAnthropic(config: AiConfig, messages: AiMessage[]): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      system: systemMsg?.content ?? "You are a helpful assistant.",
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.content[0].text as string;
}

async function callGoogle(config: AiConfig, messages: AiMessage[]): Promise<string> {
  // Google's OpenAI-compatible endpoint
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: 1024,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function sendMessage(config: AiConfig, messages: AiMessage[]): Promise<string> {
  switch (config.provider) {
    case "openai":
      return callOpenAI(config, messages);
    case "anthropic":
      return callAnthropic(config, messages);
    case "google":
      return callGoogle(config, messages);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
