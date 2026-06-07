# Mobile Remote Controller

Add a phone-based remote that mirrors every bottom-bar control on the main game screen, synced live via the BroadcastChannel API.

## 1. Sync layer

Create `src/lib/feud-sync.ts`:
- Channel name: `family-feud-sync`.
- Helpers `sendAction(action, payload?)` and `subscribe(handler)`.
- Action union type covering: `REVEAL_ANSWER`, `REVEAL_ALL`, `HIDE_QUESTION`, `NEXT_QUESTION`, `PREV_QUESTION`, `ADD_X` (payload `{ count: 1|2|3 }`), `WIN_TEAM` (`{ team: 1|2 }`), `TOGGLE_MUSIC`, `START_TIMER` (toggle), `RESET_QUESTION`, `UPDATE_SCORE` (`{ team, delta }`), `GO_HOME`, plus internal `REQUEST_STATE` / `STATE` for the display → controller broadcast.
- BroadcastChannel only — same-browser tabs on the same device. Document this limit in a tooltip on the QR modal.

## 2. Main game wiring (`src/components/FamilyFeud.tsx`)

- On mount, subscribe to the channel and dispatch each action onto the existing handlers (`reveal`, `revealAll`, `nextQ`, `prevQ`, score setters, `toggleMusic`, timer start/stop, reset current question, etc.). Add the small missing pieces if absent (hide-question toggle, reset-question helper, add-X-count helper).
- After every state change relevant to the controller (`currentQIndex`, `team1Score`, `team2Score`, `team1Name`, `team2Name`, `revealed`, `timerSec`, `timerRunning`, `musicPlaying`, `questionHidden`, `currentQ.text`), broadcast a `STATE` snapshot. Also respond to `REQUEST_STATE` with the current snapshot so the controller hydrates on open.
- Add a floating bottom-right button `📱 تحكم` that opens a Dialog showing:
  - QR code for `${window.location.origin}/controller` via `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=...` (no new dep).
  - The plain URL with a copy button.
  - One-line note: "افتح الرابط على جوالك في نفس المتصفح/الجهاز".

## 3. Controller route

Create `src/routes/controller.tsx` rendering a new `src/components/FeudController.tsx`.
- RTL, dark navy (`bg-background`), portrait-optimized, scrollable, max-width ~480px centered.
- On mount: subscribe + send `REQUEST_STATE`; keep latest snapshot in local state.
- Header card: current question number / total, question text (or "مخفي"), scores `team1Name: score | team2Name: score`, timer `MM:SS` with running indicator.
- Action grid using existing shadcn `Button` with semantic tokens — no raw hex; add any new tokens to `src/styles.css` if needed (e.g. `--ctrl-red`, `--ctrl-gold`, `--ctrl-blue`, `--ctrl-green`, `--ctrl-purple`, `--ctrl-gray`). Min height 64px, rounded-xl, large text.
- Rows exactly as specified:
  1. `X`, `XX`, `XXX` → `ADD_X {count}` (red).
  2. `فوز {team1Name}`, `فوز {team2Name}` → `WIN_TEAM` (gold).
  3. `🎵 موسيقى` (purple, toggled style when playing), `↺ إعادة` (gray) → `RESET_QUESTION`, `30s ⏱️` (purple, toggled when running) → `START_TIMER`.
  4. `» السابق` / `« التالي` (blue) — note RTL: previous on the right.
  5. `كشف الكل` (blue), `إخفاء السؤال` (green, label flips to `إظهار السؤال` based on state), `🏠` (gray) → `GO_HOME`.
  6. 8-button grid `كشف 1`..`كشف 8` → `REVEAL_ANSWER {index}`; show revealed ones dimmed/checked using snapshot.
  7. Per team: `+10` / `-10` (gold) → `UPDATE_SCORE`.

## 4. New small helpers in FamilyFeud

- `questionHidden` boolean state + toggle, applied to the question card visibility.
- `resetCurrentQuestion()` = clear `revealed`, reset `wrongCount`, reset `timerSec` to 30 & stop timer.
- `addXCount(n)` wrapping existing single-X handler.
- `GO_HOME` = set view back to start screen (reuse existing "home" handler).

## 5. Files

- create `src/lib/feud-sync.ts`
- create `src/components/FeudController.tsx`
- create `src/routes/controller.tsx` (route tree regenerates automatically)
- edit `src/components/FamilyFeud.tsx` (subscribe, broadcast state, QR floating button + modal, small helpers)
- edit `src/styles.css` only if new color tokens are needed

## Out of scope

Cross-device sync over the internet (would need a backend / WebSocket). Current scope is BroadcastChannel only — same browser profile on the same device, or via a tunnel the user sets up. Noted in the QR modal.
