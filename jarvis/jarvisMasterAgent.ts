/**
 * jarvisMasterAgent.ts
 *
 * Jarvis Master Agent — the top-level orchestrator for all Phase 3 operations.
 *
 * Responsibilities:
 * - Load project context from /jarvis markdown files
 * - Accept natural language tasks from the developer
 * - Route tasks to appropriate subagents (planned, not yet built)
 * - Return structured, actionable responses per JARVIS_PERSONALITY.md
 *
 * Subagents are defined below as stubs. They are NOT implemented yet.
 * Build the Master Agent. Get it stable. Then build subagents one at a time.
 */

import * as fs from 'fs';
import * as path from 'path';
import { complete, getActiveProvider, type CompletionResponse } from './aiProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskDomain =
  | 'bug'
  | 'release'
  | 'firebase'
  | 'tester_feedback'
  | 'marketing'
  | 'voice_mode'
  | 'phase_planning'
  | 'general';

export interface JarvisRequest {
  task: string;
  domain?: TaskDomain;
  contextFiles?: string[];
}

export interface JarvisResponse {
  answer: string;
  domain: TaskDomain;
  suggestedNextActions: string[];
  provider: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Context loader
// ---------------------------------------------------------------------------

const JARVIS_DIR = __dirname;

const CONTEXT_FILE_MAP: Record<TaskDomain, string[]> = {
  bug:            ['BUG_TRACKER.md', 'PROJECT_RULES.md'],
  release:        ['RELEASE_CHECKLIST.md', 'PROJECT_RULES.md', 'PROJECT_MEMORY.md'],
  firebase:       ['PROJECT_MEMORY.md', 'BUG_TRACKER.md'],
  tester_feedback:['BUG_TRACKER.md', 'TASKS.md', 'PROJECT_MEMORY.md'],
  marketing:      ['MARKETING_BACKLOG.md', 'PROJECT_MEMORY.md'],
  voice_mode:     ['VOICE_MODE_PLAN.md', 'PROJECT_RULES.md'],
  phase_planning: ['PHASE_3_PLAN.md', 'TASKS.md', 'PROJECT_MEMORY.md', 'PROJECT_RULES.md'],
  general:        ['PROJECT_MEMORY.md', 'PROJECT_RULES.md', 'TASKS.md'],
};

function loadContextFile(filename: string): string {
  const filePath = path.join(JARVIS_DIR, filename);
  if (!fs.existsSync(filePath)) return `[${filename} not found]`;
  const content = fs.readFileSync(filePath, 'utf-8');
  return `--- ${filename} ---\n${content}\n`;
}

function buildContext(domain: TaskDomain, extraFiles: string[] = []): string {
  const files = [...new Set([...(CONTEXT_FILE_MAP[domain] ?? []), ...extraFiles])];
  return files.map(loadContextFile).join('\n');
}

// ---------------------------------------------------------------------------
// Domain classifier
// ---------------------------------------------------------------------------

function classifyDomain(task: string): TaskDomain {
  const lower = task.toLowerCase();
  if (/crash|bug|error|fix|broken|p0|p1|crashlytics/.test(lower)) return 'bug';
  if (/release|checklist|app store|submit|testflight|launch/.test(lower)) return 'release';
  if (/firebase|firestore|function|rule|emulator|deploy/.test(lower)) return 'firebase';
  if (/tester|feedback|review|user report/.test(lower)) return 'tester_feedback';
  if (/market|post|social|content|copy|announcement|screenshot/.test(lower)) return 'marketing';
  if (/voice|speech|stt|microphone|speak/.test(lower)) return 'voice_mode';
  if (/phase|plan|milestone|roadmap|task|backlog/.test(lower)) return 'phase_planning';
  return 'general';
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  const personality = loadContextFile('JARVIS_PERSONALITY.md');
  const rules = loadContextFile('PROJECT_RULES.md');

  return `You are Jarvis, the AI operations layer for KineticIQ.

${personality}

${rules}

You have been given relevant project context files below. Use them to give
specific, grounded, actionable answers. Reference file names, task IDs, and
section headings when they are relevant. Do not invent facts about the project.

Your response format:
1. Direct answer to the task — lead with the most important thing
2. If applicable: recommended actions as a numbered list
3. If applicable: which file to update next

Do not greet the developer. Do not summarize the question back to them.
Do not hedge with "It seems like..." or "You might want to...". Be direct.`;
}

// ---------------------------------------------------------------------------
// Subagent stubs (planned, not yet implemented)
// ---------------------------------------------------------------------------

// These functions are placeholders. When a subagent is ready to be built,
// replace the stub with a real import and call.

async function bugTriageAgent(_task: string): Promise<string> {
  return '[BugTriageAgent not yet built. Log the bug manually in BUG_TRACKER.md.]';
}

async function testerFeedbackAgent(_task: string): Promise<string> {
  return '[TesterFeedbackAgent not yet built. Log feedback manually in PROJECT_MEMORY.md.]';
}

async function releaseGateAgent(_task: string): Promise<string> {
  return '[ReleaseGateAgent not yet built. Review RELEASE_CHECKLIST.md manually.]';
}

async function marketingAgent(_task: string): Promise<string> {
  return '[MarketingAgent not yet built. Review MARKETING_BACKLOG.md manually.]';
}

async function voiceModeAgent(_task: string): Promise<string> {
  return '[VoiceModeAgent not yet built. Review VOICE_MODE_PLAN.md manually.]';
}

async function firebaseAgent(_task: string): Promise<string> {
  return '[FirebaseAgent not yet built. Review Firebase console manually.]';
}

// ---------------------------------------------------------------------------
// Master Agent
// ---------------------------------------------------------------------------

export async function runJarvis(request: JarvisRequest): Promise<JarvisResponse> {
  const domain = request.domain ?? classifyDomain(request.task);
  const context = buildContext(domain, request.contextFiles);
  const systemPrompt = buildSystemPrompt();
  const { provider, model } = getActiveProvider();

  const response: CompletionResponse = await complete({
    systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Project context:\n\n${context}\n\nTask: ${request.task}`,
      },
    ],
  });

  // Parse suggested next actions from the response (lines starting with a number + period/paren)
  const actionLines = response.content
    .split('\n')
    .filter((line) => /^\d+[.)]\s/.test(line.trim()))
    .map((line) => line.trim());

  return {
    answer: response.content,
    domain,
    suggestedNextActions: actionLines,
    provider,
    model,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point (run directly: ts-node jarvisMasterAgent.ts "your task here")
// ---------------------------------------------------------------------------

async function main() {
  const task = process.argv.slice(2).join(' ');
  if (!task) {
    console.error('Usage: ts-node jarvisMasterAgent.ts "your task here"');
    process.exit(1);
  }

  console.log('\n[Jarvis] Processing...\n');

  try {
    const result = await runJarvis({ task });

    console.log(`[Provider: ${result.provider} / ${result.model}]`);
    console.log(`[Domain: ${result.domain}]\n`);
    console.log('─'.repeat(60));
    console.log(result.answer);
    console.log('─'.repeat(60));

    if (result.suggestedNextActions.length > 0) {
      console.log('\nNext actions extracted:');
      result.suggestedNextActions.forEach((a) => console.log(' ', a));
    }
  } catch (err) {
    console.error('[Jarvis Error]', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// Only run main() when executed directly (not when imported as a module)
if (require.main === module) {
  main();
}
