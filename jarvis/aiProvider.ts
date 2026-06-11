/**
 * aiProvider.ts
 *
 * Abstraction layer for all AI provider calls within the Jarvis system.
 * No agent file should import a provider SDK directly — all calls go through here.
 *
 * Supported providers: anthropic, openai, google, local
 * Active provider is set in CONFIG.json — never hardcoded here.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderName = 'anthropic' | 'openai' | 'google' | 'local';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface CompletionResponse {
  content: string;
  provider: ProviderName;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface ProviderConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  baseUrl?: string;
}

interface JarvisConfig {
  aiProvider: {
    provider: ProviderName;
    anthropic: ProviderConfig;
    openai: ProviderConfig;
    google: ProviderConfig;
    local: ProviderConfig & { baseUrl: string };
  };
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

function loadConfig(): JarvisConfig {
  const configPath = path.join(__dirname, 'CONFIG.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(
      'CONFIG.json not found. Copy CONFIG.example.json to CONFIG.json and fill in your values.'
    );
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as JarvisConfig;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callAnthropic(
  config: ProviderConfig,
  request: CompletionRequest
): Promise<CompletionResponse> {
  // Dynamic import so the SDK is only required if this provider is active.
  // Install with: npm install @anthropic-ai/sdk
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.apiKey });

  const messages = request.messages.filter((m) => m.role !== 'system');
  const systemPrompt =
    request.systemPrompt ??
    request.messages.find((m) => m.role === 'system')?.content;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: request.maxTokens ?? config.maxTokens,
    temperature: request.temperature ?? config.temperature,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return {
    content: textBlock?.type === 'text' ? textBlock.text : '',
    provider: 'anthropic',
    model: config.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

async function callOpenAI(
  config: ProviderConfig,
  request: CompletionRequest
): Promise<CompletionResponse> {
  // Install with: npm install openai
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: config.apiKey });

  const messages: Message[] = request.systemPrompt
    ? [{ role: 'system', content: request.systemPrompt }, ...request.messages.filter((m) => m.role !== 'system')]
    : request.messages;

  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: request.maxTokens ?? config.maxTokens,
    temperature: request.temperature ?? config.temperature,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    provider: 'openai',
    model: config.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

async function callGoogle(
  config: ProviderConfig,
  request: CompletionRequest
): Promise<CompletionResponse> {
  // Install with: npm install @google/generative-ai
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(config.apiKey ?? '');
  const model = genAI.getGenerativeModel({ model: config.model });

  const userMessages = request.messages.filter((m) => m.role !== 'system');
  const systemInstruction =
    request.systemPrompt ??
    request.messages.find((m) => m.role === 'system')?.content;

  const chat = model.startChat({
    ...(systemInstruction ? { systemInstruction } : {}),
    history: userMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });

  const lastMessage = userMessages[userMessages.length - 1];
  const result = await chat.sendMessage(lastMessage?.content ?? '');
  const text = result.response.text();

  return {
    content: text,
    provider: 'google',
    model: config.model,
  };
}

async function callLocal(
  config: ProviderConfig & { baseUrl: string },
  request: CompletionRequest
): Promise<CompletionResponse> {
  const messages: Message[] = request.systemPrompt
    ? [{ role: 'system', content: request.systemPrompt }, ...request.messages.filter((m) => m.role !== 'system')]
    : request.messages;

  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages,
      options: {
        num_predict: request.maxTokens ?? config.maxTokens,
        temperature: request.temperature ?? config.temperature,
      },
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local provider error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  return {
    content: data.message?.content ?? '',
    provider: 'local',
    model: config.model,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a completion request using whichever provider is configured in CONFIG.json.
 * This is the only function agents should call — never call provider SDKs directly.
 */
export async function complete(request: CompletionRequest): Promise<CompletionResponse> {
  const config = loadConfig();
  const providerName = config.aiProvider.provider;
  const providerConfig = config.aiProvider[providerName];

  switch (providerName) {
    case 'anthropic':
      return callAnthropic(providerConfig, request);
    case 'openai':
      return callOpenAI(providerConfig, request);
    case 'google':
      return callGoogle(providerConfig, request);
    case 'local':
      return callLocal(config.aiProvider.local, request);
    default:
      throw new Error(`Unknown AI provider: "${providerName}". Check CONFIG.json.`);
  }
}

/**
 * Returns the currently configured provider name and model without making a network call.
 * Useful for logging and health checks.
 */
export function getActiveProvider(): { provider: ProviderName; model: string } {
  const config = loadConfig();
  const providerName = config.aiProvider.provider;
  return {
    provider: providerName,
    model: config.aiProvider[providerName].model,
  };
}
