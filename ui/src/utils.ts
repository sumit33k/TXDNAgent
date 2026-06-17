export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const AGENT_ROLE_COLORS: Record<string, string> = {
  orchestration: 'text-violet-400',
  'product-management': 'text-blue-400',
  'product-design': 'text-pink-400',
  'ui-ux': 'text-fuchsia-400',
  architecture: 'text-amber-400',
  implementation: 'text-emerald-400',
  'code-review': 'text-cyan-400',
  security: 'text-red-400',
  devops: 'text-orange-400',
  qa: 'text-teal-400',
};

export const WORKFLOW_META: Record<string, { label: string; icon: string; agents: string[] }> = {
  'feature-design': {
    label: 'Feature Design',
    icon: '✨',
    agents: ['product-manager', 'product-designer', 'ui-ux-expert', 'microservice-architect', 'security-engineer', 'qa-engineer'],
  },
  'microservice-design': {
    label: 'Microservice Design',
    icon: '🏗️',
    agents: ['microservice-architect', 'senior-developer', 'security-engineer', 'devops-engineer', 'qa-engineer'],
  },
  'implementation-planning': {
    label: 'Implementation Planning',
    icon: '📋',
    agents: ['senior-developer', 'ui-ux-expert', 'security-engineer', 'qa-engineer'],
  },
  'code-review': {
    label: 'Code Review',
    icon: '🔍',
    agents: ['code-reviewer', 'security-engineer', 'qa-engineer', 'devops-engineer'],
  },
  'deployment-readiness': {
    label: 'Deployment Readiness',
    icon: '🚀',
    agents: ['devops-engineer', 'security-engineer', 'qa-engineer', 'microservice-architect'],
  },
  'security-review': {
    label: 'Security Review',
    icon: '🔒',
    agents: ['security-engineer', 'code-reviewer'],
  },
};
