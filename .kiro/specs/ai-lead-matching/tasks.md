# Implementation Plan: AI Lead Matching

## Overview

Additive changes across backend (Node.js/Express) and frontend (Next.js App Router) that introduce a deterministic, chat-based slot-filling lead-capture flow. No external LLM/AI service is used. Work follows a layered order: data model additions → slot schema → LeadFlowEngine (pure) → assistant identity → controller/routes → matching+notify integration → frontend entry → chat rendering + answer templates → results/loop-back → resume.

Reused without modification: `MatchEngineV2`, `LocationNormalizer`, `LeadCaptureService` (match+persist+notify logic), `Notification`.

---

## Tasks

- [ ] 1. Additive data model changes
  - [ ] 1.1 Add `direction` to `models/ExtractedLead.js`
    - Add optional `direction` enum `['buy','sell','rent']` defaulting to `'buy'`
    - Leave all existing fields untouched
    - _Requirements: 11.1, 11.4_

  - [ ] 1.2 Add `isAssistant` and `leadFlowState` to `models/ChatSession.js`
    - Add `isAssistant: Boolean (default false)`
    - Add `leadFlowState { intent, slots (Mixed), currentSlotId, status }` with defaults; absent/empty for normal sessions
    - _Requirements: 10.1, 10.4, 11.2, 11.5_

  - [ ] 1.3 Add `template` object to `models/ChatMessage.js`
    - Add optional `template { slotId, inputType, options (Mixed), unit [String] }`
    - Absent for normal messages; assistant messages use existing `messageType: 'system'`
    - _Requirements: 2.5, 11.3, 11.4_

- [ ] 2. Declarative slot schema
  - [ ] 2.1 Create `config/leadSlotSchema.js`
    - Define intents `['sell','buy','rent']` and the ordered slot list (intent, propertyType, bhk, area, location, city, expectedPrice, possession, urgency, contact)
    - Each slot: `id`, bilingual `question {en, hi}`, `inputType`, `required`, and where relevant `options`, `unit`, `branchIf`, `prefillFromProfile`
    - Encode branch conditions (e.g., `bhk.branchIf = { propertyType: ['flat','villa'] }`)
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [ ] 3. LeadFlowEngine (pure Question Engine)
  - [ ] 3.1 Create `services/LeadFlowEngine.js`
    - Implement `applicableSlots(schema, intent, filledSlots)` honoring `branchIf`
    - Implement `nextSlot(...)` returning the first unfilled applicable required slot, or null
    - Implement `parseAndValidate(slot, rawValue)` per input type (choice ∈ options; number + range; phone 10-digit; text non-empty)
    - Implement `isComplete(...)`, `buildLeadParams(intent, filledSlots)` (maps to `ExtractedLead.params` + `direction` + `transactionType`), and `buildSummary(...)`
    - No DB access, no side effects (location normalization is injected by the controller)
    - _Requirements: 3.3, 3.4, 4.2, 4.3, 4.4, 5.1, 5.2, 7.3_

  - [ ]* 3.2 Property test: branching correctness
    - **Property 3** — for any state where a slot's `branchIf` is unsatisfied, `nextSlot` never returns it (plot/shop/office never asks `bhk`)
    - **Validates: Requirements 3.4, 4.2**

  - [ ]* 3.3 Property test: termination / no re-ask
    - **Property 5** — for any intent and any sequence of valid answers, the engine reaches completion in finite turns and never re-asks a filled required slot
    - **Validates: Requirements 4.4, 7.1**

  - [ ]* 3.4 Property test: validation gate
    - **Property 4** — invalid answers leave state unchanged and re-ask the same slot
    - **Validates: Requirements 5.1, 5.2, 5.6**

  - [ ]* 3.5 Unit test: lead param mapping
    - **Property 6** — `buildLeadParams` sets `direction` = intent and maps every filled slot into `params`; rent → `transactionType:'rent'`, buy → `'buy'`
    - **Validates: Requirements 7.2, 7.3**

- [ ] 4. AI Assistant identity
  - [ ] 4.1 Seed/ensure the reserved AI Assistant user
    - On server start (in `server.js` bootstrap), ensure a single `User` with `isSystemAssistant: true` exists (add the flag to `models/User.js` as an additive optional field)
    - Expose its id via config for the controller
    - _Requirements: 2.1, 2.4_

  - [ ] 4.2 Exclude assistant from human listings in `controllers/chatController.js`
    - Add `isSystemAssistant: { $ne: true }` to the filters in `getContacts` and `getBuildersNetwork`
    - _Requirements: 2.3, 14.2_

  - [ ]* 4.3 Property test: assistant isolation
    - **Property 10** — assistant never appears in `getContacts` / `getBuildersNetwork`
    - **Validates: Requirements 2.3, 14.2**

- [ ] 5. Checkpoint — models, schema, engine, identity
  - Run backend tests; confirm engine unit/property tests pass and no regression in existing chat listing endpoints. Ask the user if questions arise.

- [ ] 6. leadChatController + routes (open / answer)
  - [ ] 6.1 Create `controllers/leadChatController.js` — `openAssistantThread`
    - Find-or-create the User's Assistant Thread (`isAssistant: true`, participants = [user, assistant])
    - If new: init `leadFlowState` and post greeting + intent question `system` messages with `template`
    - Return `{ sessionId, messages, currentQuestion, flowState }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 4.1_

  - [ ] 6.2 `submitAnswer`
    - Load thread (scoped to `req.user`); guard `slotId === leadFlowState.currentSlotId` else `400`
    - Normalize location via `LocationNormalizer` when input type is `location`; store `locationRaw` + `locationCanonical`
    - `parseAndValidate`; if invalid → post corrective `system` message, no state change
    - If valid → save user answer message, update `leadFlowState.slots`, compute `nextSlot`; post next question OR Summary Card (`status='awaiting_confirmation'`)
    - _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 12.2, 12.5, 12.6_

  - [ ] 6.3 Create `routes/leadChat.routes.js` and mount in `server.js`
    - `protect` on all routes; `POST /open`, `POST /answer`, `POST /edit`, `POST /confirm`; mount at `/api/lead-chat`
    - _Requirements: 12.1, 12.2, 12.5_

  - [ ]* 6.4 Property test: single assistant thread
    - **Property 1** — repeated `open` yields exactly one Assistant Thread
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 6.5 Property test: out-of-order answer rejected
    - **Property 12** — answering a non-current slot (not an edit) returns `400`, no mutation
    - **Validates: Requirements 12.6**

- [ ] 7. leadChatController — edit + confirm
  - [ ] 7.1 `editSlot`
    - Re-open a specified filled slot (set `currentSlotId`), retain other slots
    - On submit of the edited value (via `submitAnswer` edit mode), re-evaluate applicable slots; drop values for slots no longer applicable; ask newly-required unfilled slots before returning to Summary
    - _Requirements: 6.1, 6.2, 6.3, 12.3_

  - [ ] 7.2 `confirmLead`
    - Build params via engine; create `ExtractedLead` (`direction`, `source:'direct_chat'`, `sourceRoomModel:'ChatSession'`, `sourceRoom`=thread, `extractedBy`=user, `status:'auto_detected'`, `originalText`=summary)
    - Run matching + persist matches + notify admins by reusing `LeadCaptureService`/`MatchEngineV2` path
    - Post results `system` message with match cards; set `status='completed'`
    - Then post loop-back intent question with fresh `leadFlowState` (`in_progress`)
    - On lead-create failure: post error, keep `awaiting_confirmation`, allow retry. On match failure: keep lead, post "matching pending", still loop back
    - _Requirements: 7.2, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 12.4_

  - [ ]* 7.3 Integration test: full confirm flow
    - **Property 6 + 7 + 8** — sell flow → `ExtractedLead(direction:'sell')`, matches persisted, admin notified, results posted, loop-back intent posted; matching failure keeps the lead
    - **Validates: Requirements 7.2, 8.1, 8.4, 8.5, 9.2, 9.3**

- [ ] 8. Checkpoint — backend end-to-end
  - Exercise open → answer (all slots) → summary → edit → confirm → results → loop-back via API. Confirm resume via `leadFlowState`. Ask the user if questions arise.

- [ ] 9. Frontend API client + entry point
  - [ ] 9.1 Add `leadChatApi` to `src/lib/api.ts`
    - `open()`, `answer({sessionId,slotId,value})`, `edit({sessionId,slotId})`, `confirm({sessionId})`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 9.2 Add "AI Lead Matching" entry on the Overview page
    - Action that navigates to the Chats page and opens the Assistant Thread (calls `leadChatApi.open()`)
    - _Requirements: 1.1_

- [ ] 10. Frontend chat rendering + Answer Templates
  - [ ] 10.1 Render assistant `system` messages in the Assistant Thread
    - Assistant bubbles left, user bubbles right; chronological order
    - _Requirements: 13.1, 1.4_

  - [ ] 10.2 Create `components/chat/AnswerTemplate.tsx`
    - Render control by `template.inputType`: `choice` (chips), `number` (+ unit toggle), `location` (autocomplete), `phone` (prefilled), `text`
    - On submit call `leadChatApi.answer(...)`
    - _Requirements: 13.2, 13.7, 5.5_

  - [ ] 10.3 Typing indicator + progress hint
    - Brief typing indicator before each new assistant question; progress "Sawal X/Y" from applicable slots
    - _Requirements: 13.3, 13.4_

  - [ ] 10.4 Summary Card + Confirm/Edit
    - Render captured values with per-value Edit (calls `leadChatApi.edit`) and a Confirm button (calls `leadChatApi.confirm`)
    - _Requirements: 7.1, 13.5, 6.1_

  - [ ] 10.5 Results + Start New (loop-back)
    - Render match cards inline; "Start New" triggers the loop-back intent question
    - _Requirements: 8.2, 9.1, 13.6_

  - [ ] 10.6 Leave/resume behavior
    - Allow navigating away without losing state; on reopen, re-render current pending question from `flowState`
    - _Requirements: 1.5, 10.2, 10.3, 13.8_

  - [ ]* 10.7 Unit test: template renders correct control per inputType
    - Verify chips for `choice`, numeric+unit for `number`, autocomplete for `location`, prefilled for `phone`
    - **Validates: Requirements 13.2, 13.7**

- [ ] 11. Location autocomplete data source
  - [ ] 11.1 Provide known-locations for autocomplete
    - Expose the `LocationNormalizer` known-locations (loaded from projects) via a lightweight endpoint or reuse an existing one for the `location` template
    - _Requirements: 5.3, 5.4_

- [ ] 12. Final checkpoint — all tests pass
  - Run backend + frontend suites; confirm no regressions to existing chat/lead flows; confirm full AI Lead Matching flow end-to-end (entry → conversation → confirm → matches → loop-back → resume). Ask the user if questions arise.

---

## Notes

- Tasks marked `*` are optional tests; core (un-starred) tasks must be implemented for a working feature.
- All changes are additive — no existing file's core logic is replaced, only extended.
- `LeadFlowEngine` is intentionally pure (no DB, no I/O) so branching/termination can be property-tested cheaply.
- Location normalization stays in the controller (calls `LocationNormalizer`) to keep the engine pure.
- Matching, persistence, and admin notification reuse the existing `LeadCaptureService`/`MatchEngineV2` path rather than reimplementing them.
- Property tests should use `fast-check`, consistent with the captain-portal spec convention.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["3.1", "4.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "4.3"] },
    { "id": 4, "tasks": ["6.1", "6.3"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.5"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1", "11.1"] },
    { "id": 9, "tasks": ["10.2", "10.3"] },
    { "id": 10, "tasks": ["10.4", "10.5", "10.6"] },
    { "id": 11, "tasks": ["10.7"] }
  ]
}
```
