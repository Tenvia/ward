// OpenAI-compatible response shaping. Mock upstream by default;
// pass-through upstream mode is used only if both
// WARD_UPSTREAM_OPENAI_BASE_URL and OPENAI_API_KEY are set.
import { config } from "./config.js";

export function upstreamModeEnabled(): boolean {
  return Boolean(config.upstreamBaseUrl && config.upstreamApiKey);
}

export function mockChatCompletion(body: unknown, tenantId: string) {
  const id = `chatcmpl-mock-${Date.now()}`;
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: (body as { model?: string })?.model ?? "ward-mock-model",
    ward: {
      mode: "mock_upstream",
      tenantId,
      note: "This is a Ward prototype mock response. No external LLM was called.",
    },
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Ward mock response: request received and attributed to tenant.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export async function* mockStreamChatCompletion(
  body: unknown,
  tenantId: string
): AsyncIterable<string> {
  const id = `chatcmpl-mock-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = (body as { model?: string })?.model ?? "ward-mock-model";
  // Deterministic chunk sequence — fixed text, fixed order. No
  // provider-specific edge cases.
  const words = ["Ward ", "deterministic ", "mock ", "stream."];
  for (const content of words) {
    yield `data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        { index: 0, delta: { content }, finish_reason: null },
      ],
    })}\n\n`;
  }
  yield `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  })}\n\n`;
  yield `data: [DONE]\n\n`;
}
export async function forwardToUpstream(
  body: unknown
): Promise<{ status: number; json: unknown }> {
  if (!config.upstreamBaseUrl || !config.upstreamApiKey) {
    throw new Error("Upstream mode not configured");
  }
  const url = `${config.upstreamBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.upstreamApiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, json };
}
