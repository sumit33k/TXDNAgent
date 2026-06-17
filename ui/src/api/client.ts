import axios from 'axios';
import type { AgentConfig, WorkflowRun, RiskEntry, SystemConfig, WorkflowType } from '../types.ts';

const api = axios.create({ baseURL: '/api' });

export const agentsApi = {
  list: (): Promise<AgentConfig[]> =>
    api.get('/agents').then(r => r.data),
  get: (name: string): Promise<AgentConfig> =>
    api.get(`/agents/${name}`).then(r => r.data),
  update: (name: string, config: Partial<AgentConfig>): Promise<AgentConfig> =>
    api.patch(`/agents/${name}`, config).then(r => r.data),
  resetPrompt: (name: string): Promise<AgentConfig> =>
    api.post(`/agents/${name}/reset-prompt`).then(r => r.data),
};

export const workflowsApi = {
  list: (): Promise<WorkflowRun[]> =>
    api.get('/workflows').then(r => r.data),
  get: (id: string): Promise<WorkflowRun> =>
    api.get(`/workflows/${id}`).then(r => r.data),
  run: (type: WorkflowType, input: Record<string, unknown>): Promise<WorkflowRun> =>
    api.post('/workflows/run', { type, input }).then(r => r.data),
  approve: (id: string, stepAgent: string): Promise<void> =>
    api.post(`/workflows/${id}/approve`, { stepAgent }),
  reject: (id: string, stepAgent: string, reason: string): Promise<void> =>
    api.post(`/workflows/${id}/reject`, { stepAgent, reason }),
};

export const risksApi = {
  list: (): Promise<RiskEntry[]> =>
    api.get('/risks').then(r => r.data),
  update: (id: string, status: RiskEntry['status']): Promise<RiskEntry> =>
    api.patch(`/risks/${id}`, { status }).then(r => r.data),
};

export const configApi = {
  get: (): Promise<SystemConfig> =>
    api.get('/config').then(r => r.data),
  update: (config: Partial<SystemConfig>): Promise<SystemConfig> =>
    api.patch('/config', config).then(r => r.data),
};
