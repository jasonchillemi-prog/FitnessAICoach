# JARVIS — Voice Mode Plan
**Project:** KineticIQ / FitnessAI Coach
**Version:** 1.0
**Last Updated:** June 9, 2026
**Target Phase:** Phase 4+
**Model-Agnostic:** Yes

---

## 1. VISION

Jarvis should be operable entirely by voice. The goal is a hands-free command intelligence — Jason speaks, Jarvis responds, the project moves forward without touching a keyboard.

This is a Phase 4 feature. The architecture is designed now so voice is a drop-in layer, not a rebuild.

---

## 2. ARCHITECTURE PRINCIPLE

> Voice is just text with a different input method.

Every Jarvis command is already text-based. Voice mode adds two layers:
1. **Speech-to-Text (STT)** — converts voice to text
2. **Text-to-Speech (TTS)** — converts Jarvis response to voice

The core Jarvis intelligence layer is unchanged. This means:
- No new model training required
- No new prompt engineering required
- No architecture changes to KineticIQ app required
- Voice can be added, removed, or swapped without touching the agent logic

---

## 3. IMPLEMENTATION LAYERS

```
[ Jason speaks ]
       ↓
[ STT Layer ] — converts audio to text
       ↓
[ Jarvis Intelligence ] — processes text command (unchanged)
       ↓
[ Response text generated ]
       ↓
[ TTS Layer ] — converts text to speech
       ↓
[ Jason hears Jarvis ]
```

---

## 4. STT OPTIONS (RANKED)

| Option | Quality | Latency | Cost | Notes |
|--------|---------|---------|------|-------|
| **OpenAI Whisper (local)** | ⭐⭐⭐⭐⭐ | Medium | Free | Best accuracy, runs offline, preferred |
| **OpenAI Whisper API** | ⭐⭐⭐⭐⭐ | Low | $0.006/min | Cloud version — fast, easy to start |
| **Apple Speech Framework** | ⭐⭐⭐⭐ | Very Low | Free | Native iOS, no latency, good for mobile |
| **Google Speech-to-Text** | ⭐⭐⭐⭐ | Low | Pay per use | Good fallback |
| **Web Speech API** | ⭐⭐⭐ | Very Low | Free | Browser only — not for native iOS |

**Recommended starting point:** Apple Speech Framework for mobile Jarvis (in-app), Whisper API for desktop/Claude Code Jarvis sessions.

---

## 5. TTS OPTIONS (RANKED)

| Option | Quality | Latency | Cost | Notes |
|--------|---------|---------|------|-------|
| **OpenAI TTS (tts-1-hd)** | ⭐⭐⭐⭐⭐ | Low | $0.030/1K chars | Best voice quality, very natural |
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | Low | Pay per use | Best for custom voice cloning |
| **Apple AVSpeechSynthesizer** | ⭐⭐⭐ | Zero | Free | Native iOS, no API call, lower quality |
| **Google TTS** | ⭐⭐⭐⭐ | Low | Pay per use | Good fallback |

**Recommended starting point:** OpenAI TTS for early testing (easy API, great quality). Switch to ElevenLabs if a custom Jarvis voice is desired.

**Target Jarvis Voice Profile:**
- Deep, calm, measured male voice
- Slight synthetic edge — it should sound like an AI, but a sophisticated one
- Not robotic. Not cheerful. Authoritative.
- Reference: a calmer, less theatrical version of the MCU Jarvis

---

## 6. WAKE WORD (PHASE 4B)

Eventually Jarvis should respond to a wake word without pressing a button.

| Option | Notes |
|--------|-------|
| **"Hey Jarvis"** | Natural, on-brand |
| **"Jarvis"** | Shorter, more command-like |
| **Custom wake word** | Requires Picovoice Porcupine or similar |

**Recommended:** Start with button-activated STT (no wake word). Add wake word in Phase 4B using Picovoice Porcupine — runs on-device, no cloud dependency.

---

## 7. VOICE COMMAND CATEGORIES

### Developer Commands (Claude Code / Mac)
```
"Jarvis, status"              → Current phase, next task, open blockers
"Jarvis, next task"           → What's the next thing to build
"Jarvis, log build [X]"       → Add build to release notes
"Jarvis, open blocker [desc]" → Add to blockers list
"Jarvis, close blocker [desc]" → Remove from blockers
"Jarvis, update JARVIS.md"    → Trigger a full state sync
```

### Fitness Commands (In-App — Phase 4+)
```
"Hey Jarvis, what's my workout today"
"Hey Jarvis, log workout complete"
"Hey Jarvis, update my meal plan — skip breakfast"
"Hey Jarvis, how many calories today"
"Hey Jarvis, start workout"
```

### Project Management Commands
```
"Jarvis, what's left in Phase 3"
"Jarvis, what's blocking the App Store"
"Jarvis, add bug — [description]"
"Jarvis, TestFlight status"
```

---

## 8. RESPONSE DESIGN FOR VOICE

Voice responses follow different rules than text responses:

| Rule | Reason |
|------|--------|
| No markdown — no bullets, headers, bold | Not speakable |
| Max 3 sentences for status updates | Listener retention |
| Numbers spoken as words for small values | "Three tasks remain" not "3 tasks remain" |
| Confirmation questions are yes/no | "Should I mark build fifty-six as stable?" |
| Critical info spoken first | Don't bury the lede in audio |
| Silence after key info | Let it land before continuing |

### Text-to-Voice Conversion Rules
Before passing Jarvis text response to TTS:
- Strip all markdown (`**`, `#`, `-`, `` ` ``)
- Convert bullet lists to spoken sentences ("First... Second... Third...")
- Convert build numbers to spoken form ("Build fifty-five point five")
- Convert percentages to spoken form ("ninety-eight percent")
- Remove parenthetical notes — they don't work in audio

---

## 9. PHASE ROLLOUT

| Phase | Feature | When |
|-------|---------|------|
| **4A** | Button-activated STT in Claude Code sessions (Whisper API) | Phase 4 start |
| **4A** | TTS for Jarvis responses (OpenAI TTS) | Phase 4 start |
| **4B** | Voice commands in KineticIQ app (Apple Speech Framework) | Mid Phase 4 |
| **4B** | Fitness-specific voice commands (log workout, check meals) | Mid Phase 4 |
| **4C** | Wake word activation ("Hey Jarvis") via Picovoice | Late Phase 4 |
| **4C** | Custom Jarvis voice via ElevenLabs | Late Phase 4 |
| **5** | Persistent voice memory across sessions | Phase 5 |
| **5** | Proactive voice alerts ("Jason, you haven't logged a workout in 3 days") | Phase 5 |

---

## 10. PRIVACY & DATA RULES

- Voice audio is never stored — transcribed and discarded immediately
- STT processing preference: on-device (Apple Speech) > local Whisper > cloud API
- No voice data sent to third parties beyond the chosen STT provider
- User must explicitly enable voice mode — opt-in only
- Wake word detection runs entirely on-device — no audio leaves the device for wake detection

---

## 11. FAILURE MODES & FALLBACKS

| Failure | Fallback |
|---------|----------|
| STT fails to transcribe | "Didn't catch that. Try again or type your command." |
| TTS service unavailable | Silent mode — text response only |
| Wake word false positive | Jarvis asks for confirmation before acting |
| Ambiguous command | Jarvis repeats back interpretation and asks to confirm |
| No internet for cloud STT | Falls back to Apple Speech Framework automatically |

---

*Voice mode is a Phase 4 feature. No implementation work until Phase 3 is complete. This document exists so the architecture stays voice-ready from day one.*
