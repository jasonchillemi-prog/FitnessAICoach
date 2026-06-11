# JARVIS — Visual Identity Guide
**Project:** KineticIQ / FitnessAI Coach
**Version:** 1.0
**Last Updated:** June 9, 2026
**Model-Agnostic:** Yes — no dependency on any specific AI provider

---

## 1. VISUAL INSPIRATION ANALYSIS

The reference image establishes a clear aesthetic language:

- **Dark command center** — near-black background with deep navy undertones
- **Electric blue as the dominant accent** — glowing, pulsing, alive
- **Holographic data panels** — information feels projected, not printed
- **Central orb / core** — a glowing energy sphere that acts as the visual heartbeat
- **Scan lines and grid overlays** — subtle, technical, not overwhelming
- **Circular gauges and arc meters** — system health shown as radial progress
- **Clean monospaced + sans-serif typography** — data feels precise
- **Ambient glow** — panels bleed soft light rather than having hard edges
- **Personal greeting** — "GOOD MORNING, JASON CHILLEMI" — Jarvis knows who it's talking to

---

## 2. JARVIS COLOR PALETTE

### Primary Colors
| Role | Hex | Description |
|------|-----|-------------|
| Background | `#050A12` | Near-black with deep navy — not pure black |
| Surface | `#0A1628` | Panel background — slightly lighter than base |
| Surface Elevated | `#0F1F3A` | Cards, modals, active panels |
| Primary Accent | `#00A8FF` | Electric blue — the Jarvis signature color |
| Accent Glow | `#0066CC` | Deeper blue for shadows and glow halos |
| Accent Bright | `#40C4FF` | Highlight on hover, active states |
| Core Orb | `#00CFFF` | The central energy orb — brightest element |

### Secondary Colors
| Role | Hex | Description |
|------|-----|-------------|
| Text Primary | `#E8F4FF` | Near-white with blue tint |
| Text Secondary | `#7BA7C4` | Muted blue-grey for labels |
| Text Dim | `#3D5A6E` | Inactive, placeholder |
| Success | `#00E5A0` | Teal-green for online / healthy |
| Warning | `#FFB300` | Amber for caution states |
| Critical | `#FF4444` | Red for errors, offline, threats |
| Grid Lines | `#0D2137` | Subtle panel borders |

### KineticIQ Brand Integration
| Element | Value |
|---------|-------|
| KineticIQ Accent | `#FF6B35` (warm orange — energy, movement) |
| KineticIQ + Jarvis combined | Use KineticIQ orange for fitness data; Jarvis blue for AI/system data |
| Never mix orange and blue at equal weight | One always dominates per screen context |

---

## 3. TYPOGRAPHY

| Role | Font | Weight | Size |
|------|------|--------|------|
| Jarvis Name / Logo | `JetBrains Mono` or `Space Mono` | Bold | 18–24px |
| Section Headers | `Inter` or `SF Pro Display` | SemiBold | 13–15px uppercase |
| Data Values | `JetBrains Mono` | Regular | 24–48px |
| Body / Labels | `Inter` | Regular | 12–14px |
| Status Text | `JetBrains Mono` | Light | 11px |

**Rules:**
- Headers in ALL CAPS with wide letter-spacing (0.15em+)
- Numbers always monospaced — they should feel like readouts
- Never use serif fonts in Jarvis UI

---

## 4. INTERFACE COMPONENTS

### The Core Orb
- Central animated element — a glowing blue sphere with pulsing rings
- Represents Jarvis's active state
- Rings expand when Jarvis is speaking or processing
- Dims and slows when idle
- In KineticIQ context: orb color shifts from blue (AI mode) to orange (workout mode)

### Data Panels
- Dark surface cards with 1px blue-tinted border
- Subtle inner glow on active panels
- Arc/radial progress meters for percentages (not flat bars)
- Numbers appear as if counting up on load

### Navigation
- Left sidebar — minimal icon-only in collapsed state
- Icons glow blue on hover/active
- Current section has a vertical blue bar accent on left edge

### Status Indicators
- "I AM ONLINE" style — pill badge with pulsing green dot
- All system states communicated with color + icon + short text
- Never just color alone

### Voice Waveform
- Horizontal waveform animation in the bottom bar when voice is active
- Flat line when idle, animated bars when listening or speaking

---

## 5. KINETICIQ ADAPTATION

Jarvis inside KineticIQ is not a generic AI dashboard — it's a **fitness command center**.

### Recontextualized Panels
| Reference Panel | KineticIQ Version |
|----------------|-------------------|
| Network Activity | Weekly Workout Activity |
| System Overview | Body Stats Overview (weight, steps, calories) |
| Mission Overview | Weekly Goals Progress |
| Schedule Overview | Today's Workout + Meals |
| Threat Level | Recovery / Overtraining Risk |
| Data Storage | Plan Progress (% of week complete) |

### Logo Treatment
- `J.A.R.V.I.S.` wordmark kept — styled in monospaced, letter-spaced caps
- Subtitle: `K I N E T I C I Q  //  A I  C O A C H`
- KineticIQ logo mark appears in top right; Jarvis wordmark top left

### Screen Contexts
- **Coach Screen** — Jarvis is front and center; orb pulses with voice
- **Dashboard** — Jarvis ambient; data panels dominate; orb small in corner
- **WorkoutDetail** — Jarvis accent only; fitness data primary
- **Progress Screen** — Jarvis-style radial gauges for streaks + completion

---

## 6. MOTION & ANIMATION PRINCIPLES

- Everything loads with a **scan-in effect** — data appears line by line, not all at once
- Orb is always slightly animated — never fully static
- Transitions use **fade + slight upward drift** — not slides or bounces
- Numbers **count up** to their value on load
- Glow intensifies on interaction — tapping a panel briefly brightens its border
- Voice waveform is the only element that moves at full speed — everything else is calm

---

## 7. WHAT JARVIS DOES NOT LOOK LIKE

- Not iOS default — no rounded white cards, no SF Symbols blue
- Not Material Design — no shadows, no color fills on buttons
- Not neon cyberpunk — not aggressive, not chaotic, not RGB gaming
- Not clinical white — this is a cockpit, not a hospital
- Not chatbot bubble UI — Jarvis speaks through the whole interface, not just a message box

---

*This file is the visual law for Jarvis. Any UI built for Jarvis — web dashboard, mobile overlay, voice visualizer — references this document first.*
