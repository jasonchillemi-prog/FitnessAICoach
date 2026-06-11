'use strict';
/**
 * jarvis/server.js
 *
 * Jarvis Level 3 — live dashboard server.
 * Runtime implementation of the aiProvider.ts interface (pure JS, zero npm deps).
 *
 * Routes:
 *   GET  /           → JARVIS_DASHBOARD.html
 *   GET  /api/data   → live JSON parsed from JARVIS.md + TASKS.md + BUG_TRACKER.md + RELEASE_CHECKLIST.md
 *   POST /api/chat   → { message } → AI provider → { response, provider, model }
 *
 * Requires Node 18+ for native fetch.
 * Config: jarvis/CONFIG.json (provider/model) + jarvis/.env (API keys — never committed)
 */

const http         = require('http');
const fs           = require('fs');
const path         = require('path');
const { exec }     = require('child_process');

const JARVIS_DIR   = __dirname;
const PROJECT_ROOT = path.resolve(JARVIS_DIR, '..');
const PORT         = 3777;

// ── Check Node version ────────────────────────────────────────────────
if (parseInt(process.version.slice(1)) < 18) {
  console.error(`\nJarvis requires Node 18+. Current: ${process.version}\n`);
  process.exit(1);
}

// ── .env loader (inline — no dotenv dependency required) ──────────────
function loadEnv() {
  const p = path.join(JARVIS_DIR, '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  });
}
loadEnv();

// ── Config loader ─────────────────────────────────────────────────────
function loadConfig() {
  const p = path.join(JARVIS_DIR, 'CONFIG.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  }
  return {
    aiProvider: {
      provider: process.env.PROVIDER || 'anthropic',
      anthropic: { model: 'claude-sonnet-4-6', maxTokens: 1024, temperature: 0.3 },
      openai:    { model: 'gpt-4o',            maxTokens: 1024, temperature: 0.3 },
      google:    { model: 'gemini-2.0-flash',   maxTokens: 1024 }
    }
  };
}

// ── File reader (root JARVIS.md preferred, falls back to jarvis/) ─────
function readFile(...segments) {
  const fullPath = path.join(PROJECT_ROOT, ...segments);
  if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath, 'utf8');
  // fallback: same name directly in jarvis/
  const fallback = path.join(JARVIS_DIR, path.basename(segments[segments.length - 1]));
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8');
  return '';
}

// ── Markdown parsers ──────────────────────────────────────────────────

/** Extract rows from a markdown table that follows `sectionMarker` in the text. */
function parseTable(content, sectionMarker) {
  const lines = content.split('\n');
  const rows = [];
  let found = false;
  let headerSkipped = false;
  for (const line of lines) {
    if (!found) { if (line.includes(sectionMarker)) found = true; continue; }
    if (!line.trim().startsWith('|')) { if (rows.length > 0) break; continue; }
    if (/\|[\s-]+\|/.test(line) && line.replace(/[|\s-]/g, '').length === 0) continue; // separator
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (!headerSkipped) { headerSkipped = true; continue; }
    if (cells.every(c => c === '' || c === '*(No bugs currently logged)*' || c.startsWith('*'))) continue;
    rows.push(cells);
  }
  return rows;
}

/** Extract checkbox items under a section. */
function parseCheckboxes(content, sectionMarker) {
  const idx = content.indexOf(sectionMarker);
  if (idx === -1) return [];
  const section = content.slice(idx).split(/\n##/)[0];
  return [...section.matchAll(/^[-*]\s+\[(.)\]\s+(.+)$/gm)].map(m => ({
    done: m[1].toLowerCase() === 'x',
    text: m[2].trim()
  }));
}

/** Extract a value from a single-row markdown table field or bold label. */
function extractField(content, label) {
  const patterns = [
    new RegExp(`\\|\\s*${label}\\s*\\|\\s*([^|\\n]+)`),
    new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`)
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ── Dashboard data builder ────────────────────────────────────────────
function buildDashboardData() {
  const jarvis    = readFile('JARVIS.md');
  const tasks     = readFile('jarvis', 'TASKS.md');
  const bugs      = readFile('jarvis', 'BUG_TRACKER.md');
  const checklist = readFile('jarvis', 'RELEASE_CHECKLIST.md');

  // Current state
  const buildRaw  = extractField(jarvis, 'Stable Build') || '55.5';
  const build     = buildRaw.replace(/\s*\(.*\)/, '').trim();
  const nextBuild = (extractField(jarvis, 'Next Build') || '56').trim();
  const phase     = (extractField(jarvis, 'Current Phase') || 'Phase 3 — Launch Prep').trim();

  // TestFlight / App Store / Play statuses
  const tfRaw  = extractField(jarvis, 'TestFlight')  || '✅ Live — Build 55.5';
  const asRaw  = extractField(jarvis, 'App Store')   || '⏳ Pending resubmission';
  const gpRaw  = extractField(jarvis, 'Google Play') || '⏳ Blocked — identity verification';

  // Phase 3 task queue
  const taskRows = parseTable(jarvis, 'PHASE 3 TASK QUEUE');
  const taskList = taskRows.map(r => ({
    num:      (r[0] || '').replace(/[^0-9]/g, '') || r[0] || '?',
    title:    r[1] || '',
    priority: r[2] || '',
    status:   r[3] || ''
  })).filter(t => t.title);

  // Open bugs
  const bugRows = parseTable(jarvis, 'OPEN BUGS');
  const bugList = bugRows.map(r => ({
    num:      r[0] || '',
    desc:     r[1] || '',
    severity: r[2] || '',
    notes:    r[3] || ''
  })).filter(b => b.desc && !b.desc.includes('No bugs'));

  // Release blockers
  const blockers = parseCheckboxes(jarvis, 'RELEASE BLOCKERS');

  // Firebase health
  const fbRows   = parseTable(jarvis, 'FIREBASE HEALTH');
  const firebase = fbRows.map(r => ({
    service: r[0] || '',
    status:  r[1] || '',
    notes:   r[2] || ''
  })).filter(f => f.service);

  // App Store readiness items
  const asrRows  = parseTable(jarvis, 'APP STORE READINESS');
  const appStore = asrRows.map(r => ({
    item:   r[0] || '',
    status: r[1] || ''
  })).filter(a => a.item);

  // Checklist stats
  const doneCount  = (checklist.match(/- \[x\]/gi) || []).length;
  const totalCount = (checklist.match(/- \[.\]/g)  || []).length;

  // Rate limits
  const rlRows  = parseTable(jarvis, 'Cloud Functions Rate Limits');
  const rateLimits = rlRows.map(r => ({ fn: r[0] || '', limit: r[1] || '' })).filter(r => r.fn);

  return {
    build, nextBuild, phase, tfRaw, asRaw, gpRaw,
    tasks: taskList,
    bugs: bugList,
    blockers,
    firebase,
    appStore,
    rateLimits,
    checklistDone:  doneCount,
    checklistTotal: totalCount || 6,
    lastUpdated: new Date().toISOString()
  };
}

// ── AI provider (mirrors aiProvider.ts — pure JS runtime) ─────────────
async function callAI(message) {
  const cfg      = loadConfig();
  const provider = (cfg.aiProvider?.provider || 'anthropic').toLowerCase();
  const provCfg  = cfg.aiProvider?.[provider] || {};

  // Build system prompt from project files
  const personality = readFile('jarvis', 'JARVIS_PERSONALITY.md');
  const rules       = readFile('jarvis', 'PROJECT_RULES.md');
  const state       = readFile('JARVIS.md') || readFile('jarvis', 'JARVIS.md');

  const systemParts = [];
  if (personality) systemParts.push(personality);
  if (rules)       systemParts.push(`\n\nARCHITECTURE RULES (enforce without exception):\n${rules}`);
  if (state)       systemParts.push(`\n\nCURRENT PROJECT STATE (read before answering):\n${state}`);
  const system = systemParts.join('') || 'You are Jarvis, AI ops layer for KineticIQ. Be direct, concise, and actionable.';

  // ── Anthropic ────────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { error: 'ANTHROPIC_API_KEY not set. Add it to jarvis/.env', provider, model: provCfg.model };
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      provCfg.model      || 'claude-sonnet-4-6',
        max_tokens: provCfg.maxTokens  || 1024,
        temperature: provCfg.temperature ?? 0.3,
        system,
        messages: [{ role: 'user', content: message }]
      })
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error?.message || `API error ${res.status}`, provider, model: provCfg.model };
    return {
      response: json.content?.[0]?.text || 'No response.',
      provider, model: json.model || provCfg.model
    };
  }

  // ── OpenAI ────────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { error: 'OPENAI_API_KEY not set. Add it to jarvis/.env', provider, model: provCfg.model };
    const res  = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       provCfg.model      || 'gpt-4o',
        max_tokens:  provCfg.maxTokens  || 1024,
        temperature: provCfg.temperature ?? 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: message }
        ]
      })
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error?.message || `API error ${res.status}`, provider, model: provCfg.model };
    return {
      response: json.choices?.[0]?.message?.content || 'No response.',
      provider, model: json.model || provCfg.model
    };
  }

  // ── Google ────────────────────────────────────────────────────────────
  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return { error: 'GOOGLE_API_KEY not set. Add it to jarvis/.env', provider, model: provCfg.model };
    const model = provCfg.model || 'gemini-2.0-flash';
    const res   = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: provCfg.maxTokens || 1024 }
        })
      }
    );
    const json = await res.json();
    if (!res.ok) return { error: json.error?.message || `API error ${res.status}`, provider, model };
    return {
      response: json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.',
      provider, model
    };
  }

  return { error: `Unknown provider "${provider}". Set PROVIDER= in jarvis/.env or configure jarvis/CONFIG.json.` };
}

// ── Request handler ───────────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = req.url.split('?')[0];

  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:' + PORT);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // GET / — serve dashboard HTML
  if ((url === '/' || url === '/index.html') && req.method === 'GET') {
    try {
      const html = fs.readFileSync(path.join(JARVIS_DIR, 'JARVIS_DASHBOARD.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch {
      res.writeHead(500); return res.end('Could not read JARVIS_DASHBOARD.html');
    }
  }

  // GET /api/data — live project data
  if (url === '/api/data' && req.method === 'GET') {
    try {
      const data = buildDashboardData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // POST /api/chat — Jarvis command
  if (url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body || '{}');
        if (!message?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'message field required' }));
        }
        const result = await callAI(message.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

// ── Start server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[Jarvis server error]', err.message);
    if (!res.headersSent) { res.writeHead(500); res.end(err.message); }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const cfg      = loadConfig();
  const provider = cfg.aiProvider?.provider || 'anthropic';
  const model    = cfg.aiProvider?.[provider]?.model || '(default)';
  const keyVar   = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', google: 'GOOGLE_API_KEY' }[provider] || 'API_KEY';
  const keyOk    = !!process.env[keyVar];

  console.log('\n──────────────────────────────────────────');
  console.log(`  J.A.R.V.I.S. ONLINE — http://localhost:${PORT}`);
  console.log(`  Provider : ${provider} (${model})`);
  console.log(`  API key  : ${keyOk ? '✓ configured' : `⚠  ${keyVar} not set — chat will error until added to jarvis/.env`}`);
  console.log('──────────────────────────────────────────\n');

  exec(`open http://localhost:${PORT}`, err => {
    if (err) console.log(`  Open manually: http://localhost:${PORT}\n`);
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠  Port ${PORT} already in use — Jarvis may already be running.`);
    console.error(`   Open http://localhost:${PORT} or kill the existing process.\n`);
    exec(`open http://localhost:${PORT}`);
  } else {
    console.error('[Jarvis server error]', err);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nJarvis offline.\n');
  process.exit(0);
});
