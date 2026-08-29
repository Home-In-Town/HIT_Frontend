# Requirements Document

## Introduction

AI Lead Matching adds a conversational, chat-based lead-capture flow to the Home In Town platform. When a user (builder/captain/agent) selects "AI Lead Matching" from the Overview page, they are directed into the Chats page where a persistent AI Assistant conversation is already open. The assistant asks a sequence of questions using tappable answer templates (chips, buttons, number inputs, location autocomplete). The captured answers are assembled into a structured lead, persisted as an `ExtractedLead`, and run through the existing matching pipeline (`MatchEngineV2`) so the user immediately sees matching inventory/leads.

The conversation engine is deterministic (rule/state-machine slot-filling) — NO external LLM or AI API is used. "AI" here refers to the conversational experience and the existing matching intelligence, not a generative model. The feature reuses the existing chat infrastructure (`ChatSession`, `ChatMessage`), the existing lead model (`ExtractedLead`), the existing matching services (`MatchEngineV2`, `LocationNormalizer`), and the existing admin notification path. All changes are additive and backward-compatible.

The conversation follows the "Option 1" model: a single persistent AI Assistant chat thread per user. After a lead is completed, the assistant loops back to the intent question so the user can start another lead in the same thread. The user can leave (toggle back to Overview/other chats) at any time; the thread persists and resumes where it left off.

## Glossary

- **System**: The combined Home In Town backend (Node.js/Express) and frontend (Next.js App Router).
- **User**: An authenticated actor using AI Lead Matching; typically a `captain`, `builder`, or `agent`.
- **AI Assistant**: A reserved system participant that sends questions and posts results inside the AI Lead Matching chat thread. Not a real human user.
- **Assistant Thread**: The single persistent `ChatSession` between a User and the AI Assistant, reused across all of that User's lead conversations.
- **Slot**: A single piece of structured data to collect (e.g., `intent`, `propertyType`, `bhk`, `location`, `expectedPrice`).
- **Slot Schema**: The declarative configuration defining all slots — their question text, input type, options, validation rules, required flag, and branch conditions.
- **Intent**: The top-level purpose of a lead conversation, one of `sell`, `buy`, or `rent`. It is the first slot and determines branching.
- **Question Engine**: The backend logic that, given the current filled slots and the Slot Schema, determines the next unfilled required slot to ask.
- **Answer Template**: The UI control rendered for a question — chips/buttons, number input, unit toggle, location autocomplete, or phone input.
- **Lead Flow State**: The per-conversation state tracking intent, filled slots, current slot, and status; stored on the Assistant Thread.
- **Conversation Turn**: One question from the assistant plus the User's answer to it.
- **ExtractedLead**: The existing MongoDB model that stores captured leads and their match results.
- **MatchEngineV2**: The existing backend service that finds matching published projects for a lead's params.
- **LocationNormalizer**: The existing backend service that normalizes and validates location text against known locations.
- **ChatSession / ChatMessage**: The existing chat models reused for the Assistant Thread and its messages.
- **direction**: A new field on `ExtractedLead` capturing whether the lead is a `sell`, `buy`, or `rent` lead.
- **Summary Card**: A recap message shown at the end of slot collection listing all captured values with a Confirm and an Edit affordance.

---

## Requirements

### Requirement 1: Entry into AI Lead Matching

**User Story:** As a builder/captain/agent, I want to open AI Lead Matching from the Overview page and land directly in a chat with the AI Assistant, so that I can start capturing a lead without extra navigation.

#### Acceptance Criteria

1. WHEN an authenticated User selects "AI Lead Matching" from the Overview page, THE System SHALL navigate the User to the Chats page with the AI Assistant thread open and focused.
2. IF the User has no existing Assistant Thread, THEN THE System SHALL create exactly one Assistant Thread for that User and post the assistant greeting message followed by the first question (intent).
3. IF the User already has an Assistant Thread, THEN THE System SHALL open that existing thread and SHALL NOT create a duplicate thread.
4. WHEN the Assistant Thread is opened, THE System SHALL display prior messages of the thread in chronological order (oldest first).
5. THE System SHALL allow the User to navigate away from the Assistant Thread (back to Overview or another chat) at any time without deleting or resetting the thread.

---

### Requirement 2: AI Assistant Participant

**User Story:** As a system architect, I want a reserved AI Assistant participant, so that assistant questions and results appear as chat messages within the existing chat infrastructure without impersonating a real user.

#### Acceptance Criteria

1. THE System SHALL provide a single reserved AI Assistant identity used as a participant in every Assistant Thread.
2. WHEN the assistant posts a question or result, THE System SHALL store it as a `ChatMessage` with `messageType: 'system'` and sender set to the AI Assistant identity.
3. THE System SHALL NOT expose the AI Assistant in the normal chat contacts list (`GET /api/chat/contacts`) or the builders network list.
4. THE Assistant Thread SHALL have exactly two participants: the User and the AI Assistant.
5. IF a message in an Assistant Thread is authored by the AI Assistant, THEN THE System SHALL attach the current question's Answer Template metadata to that message so the frontend can render the correct input control.

---

### Requirement 3: Slot Schema and Intent

**User Story:** As a product owner, I want the questions defined as a declarative slot schema with an intent that drives branching, so that questions can be added, reordered, or conditionally shown without code changes to the engine.

#### Acceptance Criteria

1. THE System SHALL define a Slot Schema as declarative configuration, where each slot specifies at minimum: a unique `id`, question text, input type, required flag, and (optionally) options, validation rules, and branch conditions.
2. THE System SHALL treat `intent` as the first slot, with allowed values `sell`, `buy`, and `rent`.
3. WHEN the User answers the `intent` slot, THE Question Engine SHALL select the subsequent slots applicable to that intent according to the schema's branch conditions.
4. WHERE a slot's branch condition is not satisfied by the currently filled slots (e.g., `bhk` when `propertyType` is `plot`), THE Question Engine SHALL skip that slot and SHALL NOT ask it.
5. THE Slot Schema SHALL support at least the following input types: single-choice buttons/chips, number with optional unit toggle, free text, location autocomplete, and phone.
6. THE System SHALL support question text in both English and Romanized Hindi (Hinglish) for each slot.

---

### Requirement 4: Question Engine and Turn Flow

**User Story:** As a User, I want the assistant to ask one question at a time and move to the next based on my answers, so that the conversation feels natural and focused.

#### Acceptance Criteria

1. WHEN a lead conversation begins, THE Question Engine SHALL post the greeting and then the `intent` question as the first Conversation Turn.
2. WHEN the User submits a valid answer to the current slot, THE Question Engine SHALL persist the answer into Lead Flow State and post the next applicable unfilled required slot as a new assistant message.
3. THE Question Engine SHALL ask exactly one question per assistant Conversation Turn.
4. IF all required slots for the current intent are filled, THEN THE Question Engine SHALL post the Summary Card instead of another question.
5. WHILE a question is pending an answer, THE System SHALL render only that question's Answer Template as the active input control.
6. WHERE the schema marks a slot as optional, THE Question Engine SHALL still offer the question but SHALL allow the User to skip it, and skipping SHALL NOT block reaching the Summary Card.

---

### Requirement 5: Answer Parsing, Validation, and Normalization

**User Story:** As a User, I want my answers validated and understood, so that bad input is caught early and locations/prices are captured cleanly.

#### Acceptance Criteria

1. WHEN the User answers a single-choice slot, THE System SHALL accept only a value present in that slot's options; any other value SHALL be rejected with a re-ask.
2. WHEN the User answers a number slot (e.g., `expectedPrice`, `area`), THE System SHALL validate the value is numeric and within the slot's configured range; if invalid, THE System SHALL re-ask the same slot with a corrective hint and SHALL NOT advance.
3. WHEN the User answers a location slot, THE System SHALL normalize the input via `LocationNormalizer` and store both the raw text (`locationRaw`) and the normalized canonical value (`locationCanonical`).
4. IF a location cannot be normalized to a known location with sufficient confidence, THEN THE System SHALL still accept the raw text, store it, and continue (no data loss), consistent with the existing lead-capture behavior.
5. WHEN the User answers the phone slot, THE System SHALL validate it as a 10-digit Indian mobile number and SHALL prefill the User's profile phone as the default.
6. IF an answer fails validation, THEN THE System SHALL post a corrective assistant message and re-render the same Answer Template without advancing the Lead Flow State.

---

### Requirement 6: Edit and Correction

**User Story:** As a User, I want to change a previous answer, so that I can correct mistakes without restarting the whole conversation.

#### Acceptance Criteria

1. WHEN the User chooses to edit a specific slot from the Summary Card, THE System SHALL re-open that slot's question with its Answer Template and SHALL retain all other filled slots.
2. WHEN the User submits a new value for an edited slot, THE System SHALL update only that slot in Lead Flow State and return the User to the Summary Card.
3. IF editing a slot changes a branch condition (e.g., changing `propertyType` from `flat` to `plot`), THEN THE Question Engine SHALL re-evaluate applicable slots, ask any newly-required unfilled slots, and drop answers for slots that no longer apply.

---

### Requirement 7: Confirmation and Lead Persistence

**User Story:** As a User, I want to confirm my captured lead and have it saved, so that it enters the matching pipeline and reaches admins.

#### Acceptance Criteria

1. WHEN all required slots are filled, THE System SHALL post a Summary Card listing every captured value with a Confirm affordance and an Edit affordance.
2. WHEN the User confirms the Summary Card, THE System SHALL create an `ExtractedLead` document populated from the filled slots, with `source: 'direct_chat'`, `sourceRoomModel: 'ChatSession'`, `sourceRoom` set to the Assistant Thread, `extractedBy` set to the User, and `direction` set to the conversation's intent.
3. WHEN creating the `ExtractedLead` from a `sell` or `rent` intent, THE System SHALL map slot values into `params` (`propertyType`, `bhkType`, `location`/`locationRaw`/`locationCanonical`, `city`, `budget`/`budgetMax`, `area`/`areaUnit`, `possessionNeeded`, `urgency`) and SHALL set `transactionType` to `rent` for rent intent and `buy` for buy intent (preserving the existing enum), while `direction` records `sell`/`buy`/`rent` distinctly.
4. WHEN the `ExtractedLead` is created, THE System SHALL set `status: 'auto_detected'` and `originalText` to a generated summary of the conversation for audit.
5. IF `ExtractedLead` creation fails, THEN THE System SHALL post an assistant error message, SHALL NOT lose the collected Lead Flow State, and SHALL allow the User to retry confirmation.

---

### Requirement 8: Matching and Results

**User Story:** As a User, I want to see matches right after confirming, so that the captured lead delivers immediate value.

#### Acceptance Criteria

1. WHEN an `ExtractedLead` is successfully created on confirmation, THE System SHALL run the existing matching pipeline (`MatchEngineV2`) against the lead's `params` and persist the results on the `ExtractedLead` (`matches`, `matchCount`, `bestMatchScore`) consistent with the existing lead-capture flow.
2. WHEN matching completes, THE System SHALL post an assistant result message summarizing the number of matches and rendering match cards inside the Assistant Thread.
3. IF matching returns zero results, THEN THE System SHALL post an assistant message indicating no matches were found yet and SHALL still retain the saved lead.
4. WHEN a lead is created and matched, THE System SHALL notify admins using the existing notification path, consistent with current behavior for captured leads.
5. IF the matching pipeline throws an error, THEN THE System SHALL still retain the saved `ExtractedLead`, post an assistant message that matching is pending, and SHALL NOT crash the conversation.

---

### Requirement 9: Loop-Back for Multiple Leads (Option 1)

**User Story:** As a User, I want to start another lead in the same chat after finishing one, so that I can capture multiple leads without leaving the thread.

#### Acceptance Criteria

1. WHEN results have been posted for a completed lead, THE System SHALL post an assistant prompt offering to start another lead by re-asking the `intent` question (e.g., "Kuch aur? Bechna / Kharidna / Rent").
2. WHEN the User selects a new intent after completion, THE Question Engine SHALL begin a new lead conversation within the same Assistant Thread, with fresh Lead Flow State, without deleting prior messages.
3. THE System SHALL persist each completed lead as its own `ExtractedLead` document, so multiple sequential leads in one thread produce multiple lead records.
4. WHILE a lead conversation is in progress, THE System SHALL NOT start a new intent until the current conversation is confirmed, discarded, or explicitly restarted by the User.

---

### Requirement 10: Resume and State Persistence

**User Story:** As a User on mobile, I want my in-progress conversation to be remembered if I leave, so that I can resume without losing entered answers.

#### Acceptance Criteria

1. THE System SHALL persist Lead Flow State (intent, filled slots, current slot, status) on the Assistant Thread so it survives navigation and reload.
2. WHEN the User re-opens the Assistant Thread with an in-progress lead conversation, THE System SHALL re-render the current pending question and its Answer Template using the persisted Lead Flow State.
3. WHEN the User re-opens the Assistant Thread with no in-progress conversation, THE System SHALL present the `intent` question to start a new lead.
4. THE System SHALL represent Lead Flow State `status` as one of `in_progress`, `awaiting_confirmation`, or `completed`.

---

### Requirement 11: Data Model Extensions (Additive)

**User Story:** As a system architect, I want additive, backward-compatible schema changes, so that existing chat and lead functionality is unaffected.

#### Acceptance Criteria

1. THE System SHALL add an optional `direction` field to `ExtractedLead` with allowed values `buy`, `sell`, `rent`, defaulting such that existing documents remain valid.
2. THE System SHALL add an optional `leadFlowState` object to `ChatSession` capturing `intent`, `slots` (filled values), `currentSlotId`, and `status`, defaulting to empty/absent for non-assistant sessions.
3. THE System SHALL add an optional `template` object to `ChatMessage` capturing the Answer Template metadata (slot id, input type, options, unit choices) for assistant question messages, absent for normal messages.
4. THE System SHALL leave all existing fields of `ExtractedLead`, `ChatSession`, and `ChatMessage` unchanged.
5. THE System SHALL ensure existing chat flows (`qualifyAndConnect`, `getSessions`, `getMessages`) behave identically for non-assistant sessions after these additions.

---

### Requirement 12: Backend Endpoints

**User Story:** As a frontend developer, I want clear endpoints to drive the conversation, so that the chat UI can start, answer, edit, and confirm.

#### Acceptance Criteria

1. THE System SHALL provide an endpoint to open/create the Assistant Thread and return its current state and messages.
2. THE System SHALL provide an endpoint to submit an answer to the current slot, returning the next assistant message (question, Summary Card, or results) and the updated Lead Flow State.
3. THE System SHALL provide an endpoint to edit a specific already-filled slot, returning the re-opened question.
4. THE System SHALL provide an endpoint to confirm the Summary Card, which persists the `ExtractedLead`, runs matching, notifies admins, and returns the results message.
5. THE System SHALL restrict all AI Lead Matching endpoints to authenticated users, and SHALL scope every operation to the authenticated User's own Assistant Thread.
6. IF an answer is submitted for a slot that is not the current pending slot (and is not an explicit edit), THEN THE System SHALL reject the request with a `400` response and SHALL NOT mutate Lead Flow State.

---

### Requirement 13: Chat UI

**User Story:** As a User, I want a chat interface that feels like an AI conversation with tap-first answers, so that capturing a lead is fast and easy on mobile.

#### Acceptance Criteria

1. THE Chat UI SHALL render assistant messages as left-aligned bubbles and User answers as right-aligned bubbles within the Assistant Thread.
2. WHEN a question message is the latest pending question, THE Chat UI SHALL render its Answer Template (chips/buttons, number input with unit toggle, location autocomplete, or phone input) below the conversation.
3. THE Chat UI SHALL show a brief "typing" indicator before each new assistant question to convey a conversational feel.
4. THE Chat UI SHALL display a progress hint (e.g., "Sawal 3/7") derived from the applicable slots for the current intent.
5. WHEN the assistant posts a Summary Card, THE Chat UI SHALL render each captured value with a per-value Edit affordance and a prominent Confirm action.
6. WHEN the assistant posts results, THE Chat UI SHALL render match cards inline and offer a "Start New" action that triggers the loop-back intent question.
7. THE Chat UI SHALL prefer tappable controls over free typing for every slot whose input type supports options, and SHALL use free text only for location autocomplete and any explicitly text-typed slots.
8. THE Chat UI SHALL allow the User to navigate back to Overview or other chats at any time without losing the in-progress conversation.

---

### Requirement 14: Backward Compatibility and Isolation

**User Story:** As an existing platform user, I want all existing functionality to remain unchanged, so that AI Lead Matching does not disrupt current flows.

#### Acceptance Criteria

1. THE System SHALL leave the request shape, response shape, and status codes of all existing chat and lead endpoints unchanged for non-assistant sessions.
2. THE System SHALL exclude the AI Assistant identity from existing contact/network listings so it does not appear as a chattable human.
3. THE System SHALL ensure that leads captured via AI Lead Matching appear in the existing extracted-leads admin views alongside chat-captured leads, distinguished by `direction`.
4. THE System SHALL NOT alter the behavior of the existing NLP/auto-capture flow for group and direct chats.
