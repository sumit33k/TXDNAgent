import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), 'prompts');

export function loadContextFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  const contextFiles = [
    'transaction-dna-context.md',
    'enterpriseos-context.md',
    'shared-engineering-rules.md',
  ];

  for (const filename of contextFiles) {
    const filePath = path.join(PROMPTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const key = filename.replace('.md', '');
      files[key] = fs.readFileSync(filePath, 'utf-8');
    }
  }

  return files;
}
