import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import type {
  LlmProvider,
  LlmProviderKind,
  ProviderMessage,
  ProviderResponse,
  ToolDefinition,
} from './types.js';

/**
 * OpenAI-compatible provider for Ollama and NVIDIA NIM.
 *
 * Both expose the same REST API shape:
 *   POST /v1/chat/completions
 *
 * Tool use (function calling) is supported by most modern Ollama models:
 *   GLM-4, Llama 3.1+, Mistral, Qwen2, Phi-3, Gemma 2, etc.
 *
 * When `supportsToolUse` is false (set via OLLAMA_TOOL_USE=false or for
 * models known not to support it), the provider falls back to injecting
 * repository context directly into the system prompt.
 */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly kind: LlmProviderKind;
  readonly supportsToolUse: boolean;

  private client: OpenAI;

  constructor(opts: {
    kind: LlmProviderKind;
    baseURL: string;
    apiKey: string;
    supportsToolUse: boolean;
  }) {
    this.kind = opts.kind;
    this.supportsToolUse = opts.supportsToolUse;
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey,
    });
  }

  async sendMessage(params: {
    model: string;
    system: string;
    messages: ProviderMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): Promise<ProviderResponse> {
    const oaiMessages = this.toOpenAIMessages(params.system, params.messages);

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: params.model,
      max_tokens: params.maxTokens,
      messages: oaiMessages,
      ...(this.supportsToolUse && params.tools.length > 0
        ? {
            tools: params.tools.map(t => ({
              type: 'function' as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
              },
            })),
            tool_choice: 'auto' as const,
          }
        : {}),
    };

    const response = await this.client.chat.completions.create(requestParams);
    const choice = response.choices[0];
    const message = choice.message;

    const text = message.content ?? '';
    const toolCalls = message.tool_calls ?? [];
    const stopReason: ProviderResponse['stopReason'] =
      choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn';

    // Build a normalized assistant message for history
    const assistantMessage: ProviderMessage = {
      role: 'assistant',
      content: [
        ...(text ? [{ type: 'text' as const, text }] : []),
        ...toolCalls.map(tc => ({
          type: 'tool_use' as const,
          id: tc.id,
          name: tc.function.name,
          input: this.parseArgs(tc.function.arguments),
        })),
      ],
    };

    return {
      text,
      stopReason,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        input: this.parseArgs(tc.function.arguments),
      })),
      assistantMessage,
    };
  }

  buildToolResultMessage(
    results: Array<{ toolUseId: string; content: string }>
  ): ProviderMessage {
    // OpenAI format: one "tool" role message per tool call
    return {
      role: 'user',
      content: results.map(r => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolUseId,
        content: r.content,
      })),
    };
  }

  // ── Conversion helpers ────────────────────────────────────────────────────

  private toOpenAIMessages(
    system: string,
    messages: ProviderMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
    ];

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({ role: msg.role, content: msg.content });
        continue;
      }

      if (msg.role === 'user') {
        // Collect text blocks and tool_result blocks
        const textParts = msg.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('\n');

        const toolResults = msg.content.filter(b => b.type === 'tool_result');

        if (textParts) {
          result.push({ role: 'user', content: textParts });
        }

        // Each tool result becomes a separate "tool" role message in OpenAI format
        for (const tr of toolResults) {
          const block = tr as { type: 'tool_result'; tool_use_id: string; content: string };
          result.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
        }
        continue;
      }

      if (msg.role === 'assistant') {
        const textParts = msg.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('\n');

        const toolUseParts = msg.content.filter(b => b.type === 'tool_use');

        if (toolUseParts.length > 0) {
          result.push({
            role: 'assistant',
            content: textParts || null,
            tool_calls: toolUseParts.map(b => {
              const block = b as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
              return {
                id: block.id,
                type: 'function' as const,
                function: {
                  name: block.name,
                  arguments: JSON.stringify(block.input),
                },
              };
            }),
          });
        } else {
          result.push({ role: 'assistant', content: textParts });
        }
        continue;
      }
    }

    return result;
  }

  private parseArgs(args: string): Record<string, unknown> {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

// ── Convenience factories ─────────────────────────────────────────────────────

export function createOllamaProvider(opts?: {
  baseUrl?: string;
  supportsToolUse?: boolean;
}): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider({
    kind: 'ollama',
    baseURL: (opts?.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',          // Ollama ignores the API key but the client requires it
    supportsToolUse: opts?.supportsToolUse ?? (process.env.OLLAMA_TOOL_USE !== 'false'),
  });
}

export function createNvidiaProvider(opts?: {
  baseUrl?: string;
  apiKey?: string;
}): OpenAICompatibleProvider {
  const apiKey = opts?.apiKey ?? process.env.NVIDIA_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is required for the nvidia provider');
  }
  return new OpenAICompatibleProvider({
    kind: 'nvidia',
    baseURL: opts?.baseUrl ?? process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    apiKey,
    supportsToolUse: true,    // NVIDIA NIM supports function calling
  });
}
