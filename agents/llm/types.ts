// ── Normalized LLM abstraction ────────────────────────────────────────────────
// Both Anthropic and OpenAI-compatible providers (Ollama, NVIDIA NIM) implement
// this interface so the orchestrator stays provider-agnostic.

export type LlmProviderKind = 'anthropic' | 'ollama' | 'nvidia';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ── Normalized message types (provider-agnostic) ──────────────────────────────
export type ProviderBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string | ProviderBlock[];
}

export interface ProviderResponse {
  /** All text collected from this turn */
  text: string;
  /** 'end_turn' = done, 'tool_use' = need to execute tools and continue */
  stopReason: 'end_turn' | 'tool_use';
  /** Tool calls the model wants to make (populated when stopReason === 'tool_use') */
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  /** The assistant message to append to conversation history */
  assistantMessage: ProviderMessage;
}

export interface LlmProvider {
  readonly kind: LlmProviderKind;
  /** Whether this provider supports function/tool calling */
  readonly supportsToolUse: boolean;

  sendMessage(params: {
    model: string;
    system: string;
    messages: ProviderMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): Promise<ProviderResponse>;

  /** Build the tool-result message to push after executing tool calls */
  buildToolResultMessage(
    results: Array<{ toolUseId: string; content: string }>
  ): ProviderMessage;
}

// ── Extended orchestrator config ──────────────────────────────────────────────
export interface LlmConfig {
  provider: LlmProviderKind;

  // Anthropic
  anthropicApiKey?: string;

  // Ollama
  ollamaBaseUrl: string;
  ollamaOrchestratorModel: string;
  ollamaSpecialistModel: string;
  ollamaReviewerModel: string;
  ollamaToolUse: boolean;

  // NVIDIA NIM
  nvidiaBaseUrl: string;
  nvidiaApiKey?: string;
  nvidiaOrchestratorModel: string;
  nvidiaSpecialistModel: string;
  nvidiaReviewerModel: string;
}
