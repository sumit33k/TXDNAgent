import fs from 'fs';
import path from 'path';
import type { AnthropicTool } from '../types.js';

const REPO_PATH = process.env.TXDNA_REPO_PATH || '/Users/sumitsrivastava/transactionDNAPRod';
const ENTERPRISE_PATH = process.env.ENTERPRISEOS_REPO_PATH || '/Users/sumitsrivastava/EnterpriseOS';

export function buildRepositoryContextTools(): AnthropicTool[] {
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a file from the TransactionDNA or EnterpriseOS repository.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to the repository root, e.g. backend/src/main/java/com/txdna/service/ExceptionService.java',
          },
          repo: {
            type: 'string',
            enum: ['txdna', 'enterpriseos'],
            description: 'Which repository to read from',
          },
          start_line: {
            type: 'number',
            description: 'Optional: line number to start reading from',
          },
          end_line: {
            type: 'number',
            description: 'Optional: line number to end reading at',
          },
        },
        required: ['path', 'repo'],
      },
    },
    {
      name: 'list_directory',
      description: 'List files and directories in a repository path.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path relative to the repository root',
          },
          repo: {
            type: 'string',
            enum: ['txdna', 'enterpriseos'],
            description: 'Which repository to list',
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list recursively (depth limited to 3)',
          },
        },
        required: ['path', 'repo'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for files or text patterns in the repository.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Search pattern (file glob or text to grep for)',
          },
          search_type: {
            type: 'string',
            enum: ['filename', 'content'],
            description: 'Whether to search by filename or file content',
          },
          repo: {
            type: 'string',
            enum: ['txdna', 'enterpriseos', 'both'],
            description: 'Which repository to search',
          },
          directory: {
            type: 'string',
            description: 'Optional: restrict search to this directory',
          },
        },
        required: ['pattern', 'search_type', 'repo'],
      },
    },
    {
      name: 'get_latest_flyway_version',
      description: 'Get the latest Flyway migration version number in the repository.',
      input_schema: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            enum: ['txdna', 'enterpriseos'],
            description: 'Which repository to check',
          },
        },
        required: ['repo'],
      },
    },
  ];
}

export function executeRepositoryTool(
  toolName: string,
  input: Record<string, unknown>
): string {
  try {
    switch (toolName) {
      case 'read_file':
        return executeReadFile(input);
      case 'list_directory':
        return executeListDirectory(input);
      case 'search_files':
        return executeSearchFiles(input);
      case 'get_latest_flyway_version':
        return executeGetLatestFlywayVersion(input);
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function getRepoRoot(repo: string): string {
  if (repo === 'txdna') return REPO_PATH;
  if (repo === 'enterpriseos') return ENTERPRISE_PATH;
  throw new Error(`Unknown repo: ${repo}`);
}

function executeReadFile(input: Record<string, unknown>): string {
  const repoRoot = getRepoRoot(input.repo as string);
  const filePath = path.join(repoRoot, input.path as string);

  if (!filePath.startsWith(repoRoot)) {
    return 'Error: path traversal not allowed';
  }

  if (!fs.existsSync(filePath)) {
    return `File not found: ${input.path}`;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const startLine = (input.start_line as number | undefined) ?? 1;
  const endLine = (input.end_line as number | undefined) ?? Math.min(lines.length, startLine + 199);

  const slice = lines.slice(startLine - 1, endLine);
  return slice.map((l, i) => `${startLine + i}: ${l}`).join('\n');
}

function executeListDirectory(input: Record<string, unknown>): string {
  const repoRoot = getRepoRoot(input.repo as string);
  const dirPath = path.join(repoRoot, (input.path as string) || '');

  if (!dirPath.startsWith(repoRoot)) {
    return 'Error: path traversal not allowed';
  }

  if (!fs.existsSync(dirPath)) {
    return `Directory not found: ${input.path}`;
  }

  const recursive = input.recursive as boolean | undefined;
  const entries: string[] = [];

  function listDir(dir: string, depth: number, prefix: string): void {
    if (depth > 3) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'target') continue;
      const rel = path.join(prefix, item.name);
      entries.push(item.isDirectory() ? `${rel}/` : rel);
      if (recursive && item.isDirectory() && depth < 3) {
        listDir(path.join(dir, item.name), depth + 1, rel);
      }
    }
  }

  listDir(dirPath, 0, '');
  return entries.join('\n') || '(empty directory)';
}

function executeSearchFiles(input: Record<string, unknown>): string {
  const pattern = input.pattern as string;
  const searchType = input.search_type as string;
  const repoArg = input.repo as string;
  const directory = input.directory as string | undefined;

  const repos: string[] = repoArg === 'both'
    ? [REPO_PATH, ENTERPRISE_PATH]
    : [getRepoRoot(repoArg)];

  const results: string[] = [];

  for (const repoRoot of repos) {
    const searchRoot = directory ? path.join(repoRoot, directory) : repoRoot;

    if (!searchRoot.startsWith(repoRoot)) continue;
    if (!fs.existsSync(searchRoot)) continue;

    function walkDir(dir: string): void {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'target') continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          walkDir(fullPath);
        } else {
          const rel = path.relative(repoRoot, fullPath);
          if (searchType === 'filename') {
            if (item.name.includes(pattern) || rel.includes(pattern)) {
              results.push(rel);
            }
          } else {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              if (content.includes(pattern)) {
                const lineNum = content.split('\n').findIndex(l => l.includes(pattern)) + 1;
                results.push(`${rel}:${lineNum}`);
              }
            } catch {
              // skip binary files
            }
          }
        }
      }
    }

    walkDir(searchRoot);
  }

  if (results.length === 0) return 'No results found';
  return results.slice(0, 50).join('\n') + (results.length > 50 ? `\n... and ${results.length - 50} more` : '');
}

function executeGetLatestFlywayVersion(input: Record<string, unknown>): string {
  const repoRoot = getRepoRoot(input.repo as string);
  const migrationDirs = [
    'backend/src/main/resources/db/migration',
    'src/main/resources/db/migration',
  ];

  for (const dir of migrationDirs) {
    const fullDir = path.join(repoRoot, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter(f => /^V\d+__.+\.sql$/.test(f));
    if (files.length === 0) continue;

    const versions = files.map(f => {
      const match = f.match(/^V(\d+)__/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const latest = Math.max(...versions);
    const latestFile = files.find(f => f.startsWith(`V${latest}__`));
    return `Latest Flyway version: V${latest} (${latestFile})\nNext version should be: V${latest + 1}`;
  }

  return 'Could not find Flyway migration directory';
}
