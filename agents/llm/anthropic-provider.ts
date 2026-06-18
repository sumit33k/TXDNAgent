import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, ProviderMessage, ProviderResponse, ToolDefinition } from './types.js';

export class AnthropicProvider implements LlmProvider {
  readonly kind = 'anthropic' as const;
  readonly supportsToolUse = true;

  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async sendMessage(params: {
    model: string;
    system: string;
    messages: ProviderMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): Promise<ProviderResponse> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      tools: params.tools as Anthropic.Tool[],
      messages: params.messages as Anthropic.MessageParam[],
    });

    const textParts = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text);

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const stopReason: ProviderResponse['stopReason'] =
      response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn';

    return {
      text: textParts.join('\n'),
      stopReason,
      toolCalls: toolUseBlocks.map(b => ({
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      })),
      // Cast is safe: Anthropic message blocks are a strict superset of our ProviderBlock type
      assistantMessage: {
        role: 'assistant',
        content: response.content as unknown as ProviderMessage['content'],
      },
    };
  }

  buildToolResultMessage(
    results: Array<{ toolUseId: string; content: string }>
  ): ProviderMessage {
    return {
      role: 'user',
      content: results.map(r => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolUseId,
        content: r.content,
      })),
    };
  }
}
