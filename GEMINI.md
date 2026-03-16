# DOMAIN_EXPANSION [V1.0-STAGING]

High-performance, brutalist deck-building engine implementing the full Base (2nd Ed) and Intrigue (2nd Ed) card sets.

## 1. PROJECT_MANIFEST
- **AESTHETIC:** Brutalist / High-Contrast Binary (#000000 / #FFFFFF).
- **TYPOGRAPHY:** JetBrains Mono (Data/Values), Sharp Sans-Serif (Titles).
- **INTERACTION:** Inversion model (Black on White) for hover/active states. Sharp 90-degree corners.
- **ARCHITECTURE:** Event-driven state machine with Promise-based interaction interrupts.

## 2. TECHNICAL_SPECIFICATION

### 2.1 PLAYER_STATE_SCHEMA [COMPLETED]
Strictly typed JSON payload representing local player state:
```json
{
  "player_id": "usr_xxxxxx",
  "display_name": "OPERATOR_01",
  "turn_state": { "is_active_turn": true, "phase": "ACTION", "counters": { "actions": 1, "buys": 1, "coins": 0 } },
  "zones": { "deck": [], "hand": [], "play_area": [], "discard_pile": [], "aside": [] },
  "active_modifiers": { "cost_reduction": 0, "immune_to_attack": false }
}
```

### 2.2 ENGINE_CORE [COMPLETED]
- **SUPPLY_LOGIC:** Strict 2-player/3-player/4-player card counts (e.g., 8 Victory cards for 2P).
- **TURN_LOOP:** ACTION -> BUY -> CLEANUP sequence enforcement.
- **INTERRUPT_FLOW:** `resolveAttack` handler with Reaction window (e.g., Moat reveal) and immunity management.
- **BOT_INTERFACE:** Multi-tier AI (Easy/Medium/Hard) integrated via standard player interface.

## 3. IMPLEMENTATION_STATUS

### PHASE_01: SCAFFOLDING [100%]
- [X] Frontend/Backend repo initialization.
- [X] Socket.io real-time synchronization.

### PHASE_02: VISUAL_REFAC [100%]
- [X] Brutalist CSS framework implementation.
- [X] Terminal-style "System Log" for event tracking.
- [X] Inversion-state interaction logic.

### PHASE_03: CARDS_&_MECHANICS [90%]
- [X] Base Set (2nd Ed) logic (26/26 cards).
- [X] Intrigue Set (2nd Ed) logic (26/26 cards).
- [X] Multi-player interaction system for Attacks/Reactions.
- [ ] Final validation of complex Attack chains (e.g., Torturer stack).

## 4. EXEC_COMMANDS
- `npm run start:server` (Backend :3001)
- `npm run start:ui` (Frontend :3000)

## 5. ROADMAP_V1.0
1. **REFACT_ATTACKS:** Update all Attack cards in `cards.ts` to utilize the new `resolveAttack` stack.
2. **VALIDATE_ENGINE:** Run exhaustive test suite on Interaction Promise resolution.
3. **PRODUCTION_STABILIZATION:** Final build check for V1.0 release.
