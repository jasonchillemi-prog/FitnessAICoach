# Jarvis — AI Operations Layer for KineticIQ

> **Start here every session:** Read `JARVIS.md` in the project root first.
> It is the persistent memory file — current phase, next task, open blockers.

Jarvis is the internal AI assistant and master agent system for the KineticIQ app.
It is model-agnostic — it works with Anthropic, OpenAI, Google, or any local model.
It is not part of the app itself — it is an operational intelligence layer that helps
the developer manage Phase 3: launch prep, bugs, Firebase, tester feedback,
App Store submission, and marketing.

## What Jarvis Does

- Acts as a Master Agent that coordinates all project work in Phase 3
- Tracks bugs, tasks, and release blockers
- Manages tester feedback loops
- Plans and tracks marketing initiatives
- Plans voice mode integration
- Bridges between Firebase/Crashlytics data and actionable dev tasks
- Routes tasks to planned subagents (not yet built)

## What Jarvis Does NOT Do

- Jarvis does not rebuild the app from scratch
- Jarvis does not migrate the app back to Expo
- Jarvis does not connect paid APIs until explicitly authorized
- Jarvis does not hardcode any single AI model or provider

## File Structure

```
/jarvis
├── README.md                  # This file
├── PROJECT_RULES.md           # Hard rules governing all Jarvis decisions
├── PROJECT_MEMORY.md          # Persistent project context and state
├── PHASE_3_PLAN.md            # Phase 3 goals, milestones, and strategy
├── TASKS.md                   # Active task list
├── BUG_TRACKER.md             # Known bugs and status
├── RELEASE_CHECKLIST.md       # iOS App Store release readiness checklist
├── MARKETING_BACKLOG.md       # Marketing tasks and launch content backlog
├── VOICE_MODE_PLAN.md         # Plan for voice mode feature
├── JARVIS_PERSONALITY.md      # Jarvis tone, persona, and communication style
├── JARVIS_VISUAL_IDENTITY.md  # Visual design language for Jarvis UI
├── CONFIG.example.json        # AI provider and model configuration template
├── aiProvider.ts              # AI provider abstraction layer
└── jarvisMasterAgent.ts       # Jarvis Master Agent orchestrator
```

## Getting Started

1. Read `JARVIS.md` (project root) — current phase, next task, open blockers
2. Copy `CONFIG.example.json` to `CONFIG.json` and fill in your provider credentials
3. Review `PROJECT_RULES.md` before making any changes
4. Check `TASKS.md` and `BUG_TRACKER.md` for current active work
5. See `PHASE_3_PLAN.md` for the full Phase 3 task queue

## Current Phase

**Phase 1 — COMPLETE**
**Phase 2 — COMPLETE**
**Phase 3 — IN PROGRESS** (Launch Prep)
**Phase 4 — PLANNED** (Voice mode, subagents, Android)

See `PHASE_3_PLAN.md` for the ordered task queue.
See `JARVIS.md` for the current live state.
