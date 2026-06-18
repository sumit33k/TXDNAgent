import type { LlmProvider, LlmProviderKind } from './types.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { createOllamaProvider, createNvidiaProvider } from './openai-compatible-provider.js';

export function createProvider(kind?: LlmProviderKind): LlmProvider {
  const resolved = kind ?? (process.env.LLM_PROVIDER as LlmProviderKind | undefined) ?? 'anthropic';

  switch (resolved) {
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);

    case 'ollama':
      return createOllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL,
        supportsToolUse: process.env.OLLAMA_TOOL_USE !== 'false',
      });

    case 'nvidia':
      return createNvidiaProvider({
        baseUrl: process.env.NVIDIA_BASE_URL,
        apiKey: process.env.NVIDIA_API_KEY,
      });

    default:
      throw new Error(`Unknown LLM provider: "${resolved}". Valid values: anthropic | ollama | nvidia`);
  }
}

/**
 * Resolve the right model name for a given agent role and provider.
 * Each provider uses its own model set from env vars.
 */
export function resolveModel(
  agentName: string,
  provider: LlmProvider,
  fallback: { orchestrator: string; specialist: string; reviewer: string }
): string {
  const isOrchestrator = agentName === 'engineering-orchestrator';
  const isReviewer = agentName === 'code-reviewer' || agentName === 'security-engineer';

  switch (provider.kind) {
    case 'ollama':
      if (isOrchestrator) return process.env.OLLAMA_ORCHESTRATOR_MODEL ?? process.env.OLLAMA_MODEL ?? 'glm4:latest';
      if (isReviewer)     return process.env.OLLAMA_REVIEWER_MODEL    ?? process.env.OLLAMA_MODEL ?? 'glm4:latest';
      return                     process.env.OLLAMA_SPECIALIST_MODEL  ?? process.env.OLLAMA_MODEL ?? 'glm4:latest';

    case 'nvidia':
      if (isOrchestrator) return process.env.NVIDIA_ORCHESTRATOR_MODEL ?? 'nvidia/llama-3.1-nemotron-70b-instruct';
      if (isReviewer)     return process.env.NVIDIA_REVIEWER_MODEL     ?? 'nvidia/llama-3.1-nemotron-70b-instruct';
      return                     process.env.NVIDIA_SPECIALIST_MODEL   ?? 'meta/llama-3.1-8b-instruct';

    case 'anthropic':
    default:
      if (isOrchestrator) return fallback.orchestrator;
      if (isReviewer)     return fallback.reviewer;
      return fallback.specialist;
  }
}

/** Fetch available models from a running Ollama instance. Returns [] on failure. */
export async function listOllamaModels(baseUrl?: string): Promise<string[]> {
  const url = (baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/api/tags';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models?: Array<{ name: string }> };
    return (data.models ?? []).map(m => m.name);
  } catch {
    return [];
  }
}

/** Check if an Ollama instance is reachable. */
export async function isOllamaReachable(baseUrl?: string): Promise<boolean> {
  const url = (baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/api/tags';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
