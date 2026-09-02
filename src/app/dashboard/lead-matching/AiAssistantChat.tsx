'use client';

/**
 * AiAssistantChat
 *
 * The AI Lead Matching conversational UI (Approach A — deterministic slot
 * filling). Renders the persistent AI Assistant thread as a polished chat:
 *   - assistant questions (left bubbles) with tappable answer templates
 *   - user answers (right bubbles)
 *   - a Summary Card with per-value edit + confirm
 *   - inline match results and a loop-back "start new" prompt
 *
 * All conversation logic lives on the backend; this component only renders the
 * latest question's template and posts answers.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  leadChatApi,
  LeadChatMessage,
  LeadFlowState,
  LeadChatOption,
} from '@/lib/api';
import toast from 'react-hot-toast';

const ASSISTANT_TYPING_MS = 650;

// Friendly labels for answered slots, used by the "Edit an answer" control so
// a user can correct a previous answer without waiting for the Summary Card.
// Mirrors the backend leadSlotSchema ids (stable, small set).
const SLOT_LABELS: Record<string, string> = {
  intent: 'Intent',
  category: 'Category',
  propertyTypeDetailed: 'Property type',
  propertyType: 'Property type',
  bhk: 'BHK',
  area: 'Area',
  location: 'Location',
  city: 'City',
  projectStatus: 'Construction status',
  possession: 'Possession',
  expectedPrice: 'Price / budget',
  reraApproved: 'RERA approved',
  reraNumber: 'RERA number',
  bankLoanAvailable: 'Bank loan',
  amenities: 'Amenities',
  urgency: 'Urgency',
  contact: 'Contact number',
};



// Icons for property-type / intent options so choices feel tangible.
const OPTION_ICONS: Record<string, string> = {
  sell: '🏷️', buy: '🔍', rent: '🔑',
  flat: '🏢', plot: '🌱', villa: '🏡', shop: '🏪', office: '🏬',
  '1BHK': '🛏️', '2BHK': '🛏️', '3BHK': '🛏️', '4BHK+': '🛏️',
  ready: '✅', under_construction: '🚧',
  normal: '🙂', urgent: '⚡', very_urgent: '🔥',
};

// A user message can be in-flight, delivered, or failed to send. `failed`
// messages keep the payload needed to retry the exact same submission.
interface FailedPayload { slotId: string; value: unknown; displayText: string }

export default function AiAssistantChat({ onBack }: { onBack?: () => void } = {}) {
  const [messages, setMessages] = useState<LeadChatMessage[]>([]);
  const [flowState, setFlowState] = useState<LeadFlowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  // Map of optimistic-message _id → the payload that failed, so a "Retry"
  // affordance on the bubble can re-send exactly what the user chose.
  const [failed, setFailed] = useState<Record<string, FailedPayload>>({});
  const sessionIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Load / resume the assistant thread ────────────────────────────────
  const openThread = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await leadChatApi.open();
      sessionIdRef.current = data.sessionId;
      setMessages(data.messages || []);
      setFlowState(data.flowState);
    } catch (err: unknown) {
      setLoadError(true);
      toast.error(errMsg(err, 'Failed to open assistant'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    openThread();
  }, [openThread]);

  // Smooth auto-scroll to newest.
  useEffect(() => {
    const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    return () => clearTimeout(t);
  }, [messages, typing]);

  const lastAssistant = [...messages].reverse().find(m => m.messageType === 'system' && m.template);
  const activeTemplate = lastAssistant?.template;
  const progress = activeTemplate?.progress;
  const progressPct = progress && progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

  // Most recently answered slot (for the "Previous" button on the question
  // template). flowState.slots is insertion-ordered, so the last answered slot
  // that isn't the current/editing one is the natural "go back" target.
  const answeredIds = flowState?.slots
    ? Object.keys(flowState.slots).filter(id => id !== flowState.currentSlotId && id !== flowState.editingSlotId)
    : [];
  const previousSlotId = answeredIds.length ? answeredIds[answeredIds.length - 1] : null;
  const previousSlotLabel = previousSlotId ? (SLOT_LABELS[previousSlotId] || previousSlotId) : null;

  const revealWithTyping = useCallback((appendMsgs: LeadChatMessage[]) => {
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, ...appendMsgs]);
      setTyping(false);
    }, ASSISTANT_TYPING_MS);
  }, []);

  // Core send. `existingId` reuses an already-rendered optimistic bubble
  // (used by Retry) instead of appending a new one.
  const sendAnswer = useCallback(async (
    slotId: string, value: unknown, displayText: string, existingId?: string,
  ) => {
    if (!sessionIdRef.current || sending) return;
    setSending(true);

    const msgId = existingId ?? `tmp-${Date.now()}`;
    if (existingId) {
      // Retrying: clear the failed flag on the existing bubble.
      setFailed(prev => { const next = { ...prev }; delete next[msgId]; return next; });
    } else {
      const optimistic: LeadChatMessage = {
        _id: msgId,
        session: sessionIdRef.current,
        sender: 'me',
        content: displayText,
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
    }

    try {
      const res = await leadChatApi.answer({ sessionId: sessionIdRef.current, slotId, value });
      setFlowState(res.flowState);
      revealWithTyping([res.message]);
    } catch (err: unknown) {
      // Keep the bubble, mark it failed, and stash the payload for retry.
      setFailed(prev => ({ ...prev, [msgId]: { slotId, value, displayText } }));
      toast.error(errMsg(err, 'Could not submit answer'));
    } finally {
      setSending(false);
    }
  }, [sending, revealWithTyping]);

  const submit = useCallback(
    (slotId: string, value: unknown, displayText: string) => sendAnswer(slotId, value, displayText),
    [sendAnswer],
  );

  const retry = useCallback((msgId: string) => {
    const payload = failed[msgId];
    if (payload) sendAnswer(payload.slotId, payload.value, payload.displayText, msgId);
  }, [failed, sendAnswer]);

  const edit = useCallback(async (slotId: string) => {
    if (!sessionIdRef.current) return;
    try {
      const res = await leadChatApi.edit({ sessionId: sessionIdRef.current, slotId });
      setFlowState(res.flowState);
      revealWithTyping([res.message]);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Could not edit'));
    }
  }, [revealWithTyping]);

  const confirm = useCallback(async () => {
    if (!sessionIdRef.current || sending) return;
    setSending(true);
    try {
      const res = await leadChatApi.confirm(sessionIdRef.current);
      setFlowState(res.flowState);
      revealWithTyping([res.resultsMessage, res.closingMessage, res.actionsMessage]);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Could not confirm'));
    } finally {
      setSending(false);
    }
  }, [sending, revealWithTyping]);

  // Start a fresh lead on demand (from the closing "New requirement" action).
  const startNewLead = useCallback(async () => {
    if (!sessionIdRef.current || sending) return;
    setSending(true);
    try {
      const res = await leadChatApi.newLead(sessionIdRef.current);
      setFlowState(res.flowState);
      revealWithTyping([res.message]);
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Could not start a new requirement'));
    } finally {
      setSending(false);
    }
  }, [sending, revealWithTyping]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0B141A]" role="status" aria-live="polite">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0E7C66] to-[#075E54] flex items-center justify-center text-2xl shadow-lg animate-pulse" aria-hidden="true">🤖</div>
        </div>
        <p className="mt-4 text-sm text-white/50">Assistant load ho raha hai…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#ECE5DD] px-6 text-center" role="alert">
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm" aria-hidden="true">⚠️</div>
        <p className="mt-4 text-[15px] font-semibold text-[#0B2B1E]">Assistant khul nahi paaya</p>
        <p className="mt-1 text-[13px] text-[#57534E]">Connection issue lag raha hai. Dobara try karein.</p>
        <button
          onClick={openThread}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-[#0A7360] to-[#075E54] text-white text-[14px] font-semibold shadow-md active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Retry
        </button>
        {onBack && (
          <button onClick={onBack} className="mt-2 text-[13px] font-medium text-[#57534E] hover:text-[#0B2B1E]">
            Go back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#ECE5DD]">
      {/* Scoped styles / animations */}
      <style>{styles}</style>

      {/* ─── Header ─── */}
      <div className="relative z-10 bg-gradient-to-r from-[#075E54] to-[#0A7360] shadow-md">
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="p-1.5 -ml-1 hover:bg-white/10 rounded-full transition-colors active:scale-90" title="Back" aria-label="Back">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          ) : (
            <a href="/dashboard" className="p-1.5 -ml-1 hover:bg-white/10 rounded-full transition-colors sm:hidden" aria-label="Back to dashboard">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </a>
          )}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-xl shadow-inner ring-2 ring-white/20" aria-hidden="true">🤖</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2 border-[#075E54]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[15px] font-bold text-white leading-tight">HIT Assistant</h1>
              <svg className="w-4 h-4 text-[#7DD3FC]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
            </div>
            <p className="text-[11px] text-white/70">{typing ? 'typing…' : 'online • Lead Matching'}</p>
          </div>
          <div className="hidden sm:flex flex-shrink-0 w-9 h-9 rounded-full bg-white/10 items-center justify-center" aria-hidden="true">
            <svg className="text-white/80" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
        </div>

        {/* Progress bar */}
        {progress && progress.total > 1 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Step {progress.current} of {progress.total}</span>
              <span className="text-[10px] font-bold text-[#7DD3FC]">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#25D366] to-[#7DD3FC] rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Messages ─── */}
      <div ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation with HIT Assistant" className="ai-scroll relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3.5 sm:px-6 sm:py-4 space-y-2.5">
        {messages.map((msg, idx) => {
          const isSystem = msg.messageType === 'system';
          const isMe = !isSystem;

          if (isSystem && msg.template?.inputType === 'summary') {
            return <SummaryBubble key={msg._id} msg={msg} onEdit={edit} onConfirm={confirm} sending={sending} />;
          }
          if (isSystem && msg.template?.inputType === 'results') {
            return <ResultsBubble key={msg._id} msg={msg} />;
          }
          if (isSystem && msg.template?.inputType === 'actions') {
            return <ActionsBubble key={msg._id} msg={msg} onNewLead={startNewLead} disabled={sending} />;
          }

          // Group consecutive assistant messages (hide avatar on follow-ups).
          const prev = messages[idx - 1];
          const showAvatar = isSystem && (!prev || prev.messageType !== 'system' || (prev.template && ['summary', 'results', 'actions'].includes(prev.template.inputType || '')));

          const isFailed = isMe && !!failed[msg._id];

          return (
            <div key={msg._id} className={`flex items-end gap-2 ai-msg-in ${isMe ? 'justify-end' : 'justify-start'}`}>
              {isSystem && (
                <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-sm shadow-sm ${showAvatar ? '' : 'opacity-0'}`} aria-hidden="true">🤖</div>
              )}
              <div className="flex flex-col items-end gap-0.5 max-w-[85%] sm:max-w-[70%]">
                <div className={`group px-3.5 py-2.5 shadow-sm relative ${isMe
                  ? isFailed
                    ? 'bg-[#FEE2E2] text-[#7F1D1D] rounded-2xl rounded-br-md ring-1 ring-[#FCA5A5]'
                    : 'bg-gradient-to-br from-[#DCF8C6] to-[#D1F4C0] text-[#0B2B1E] rounded-2xl rounded-br-md'
                  : 'bg-white text-[#111B21] rounded-2xl rounded-bl-md'}`}>
                  <p className="text-[14px] sm:text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  <span className="block text-[10px] text-right mt-0.5 select-none text-[#5A6B73]">
                    {formatTime(msg.createdAt)}
                    {isMe && !isFailed && <span className="ml-1 text-[#3A9FD4]" aria-label="Sent">✓✓</span>}
                    {isFailed && <span className="ml-1 text-[#B91C1C]" aria-label="Failed to send">⚠︎ Not sent</span>}
                  </span>
                </div>
                {isFailed && (
                  <button
                    onClick={() => retry(msg._id)}
                    disabled={sending}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B91C1C] hover:text-[#7F1D1D] disabled:opacity-50"
                    aria-label="Retry sending this answer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Tap to retry
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-end gap-2 justify-start ai-msg-in">
            <span className="sr-only">Assistant is typing</span>
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-sm" aria-hidden="true">🤖</div>
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center" aria-hidden="true">
                <span className="w-2 h-2 bg-gray-400 rounded-full ai-dot" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full ai-dot" style={{ animationDelay: '160ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full ai-dot" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} className="h-2" />
      </div>

      {/* ─── Active answer template ─── */}
      {!typing && activeTemplate && activeTemplate.inputType &&
        !['summary', 'results', 'actions'].includes(activeTemplate.inputType) && (
          <div className="relative z-10 ai-input-in">
            {previousSlotId && (
              <div className="px-2.5 sm:px-6 pt-2 pb-0 bg-white/85 backdrop-blur-md flex">
                <PreviousButton
                  slotId={previousSlotId}
                  label={previousSlotLabel}
                  disabled={sending}
                  onPrevious={edit}
                />
              </div>
            )}
            <AnswerTemplate template={activeTemplate} disabled={sending} onSubmit={submit} />
          </div>
        )}
    </div>
  );
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function errMsg(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

// "← Previous" control shown on the question template. Re-opens the most
// recently answered slot for editing via the existing /lead-chat/edit endpoint.
function PreviousButton({ slotId, label, disabled, onPrevious }: {
  slotId: string; label: string | null; disabled: boolean; onPrevious: (slotId: string) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onPrevious(slotId)}
      aria-label={label ? `Go back and edit: ${label}` : 'Go back to previous question'}
      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#57534E] hover:text-[#0B2B1E] disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      Previous{label ? `: ${label}` : ''}
    </button>
  );
}

// Sentinel matching the backend's SKIP_VALUE — tells the engine an optional
// slot was intentionally skipped (so it isn't re-asked).
const SKIP_VALUE = '__skipped__';

// A small "Skip" button shown for optional (skippable) slots.
function SkipButton({ slotId, disabled, onSubmit }: {
  slotId: string; disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onSubmit(slotId, SKIP_VALUE, 'Skipped')}
      aria-label="Skip this question"
      className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-[#6B6560] hover:text-[#44403C] disabled:opacity-50"
    >
      Skip this
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
    </button>
  );
}

// Compact "type your own + add" row, used when a slot allows custom values.
function CustomInline({ placeholder, disabled, onAdd }: {
  placeholder: string; disabled: boolean; onAdd: (value: string) => void;
}) {
  const [val, setVal] = useState('');
  const add = () => { const t = val.trim(); if (t) { onAdd(t); setVal(''); } };
  return (
    <div className="mt-2.5 flex items-center gap-2">
      <div className="flex-1 flex items-center bg-white rounded-full border border-dashed border-[#075E54]/40 px-3.5">
        <svg className="w-4 h-4 text-[#075E54]/60 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.5-9.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          maxLength={60}
          className="flex-1 py-2 text-[14px] bg-transparent focus:outline-none placeholder:text-gray-400"
        />
      </div>
      <button
        onClick={add}
        disabled={disabled || !val.trim()}
        className="px-4 py-2 rounded-full bg-[#075E54] text-white text-[13px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANSWER TEMPLATE
// ═══════════════════════════════════════════════════════════

function AnswerTemplate({
  template,
  disabled,
  onSubmit,
}: {
  template: NonNullable<LeadChatMessage['template']>;
  disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  const slotId = template.slotId || '';
  const skippable = !!template.skippable;

  // Multi-select (e.g. amenities) — accumulate then submit.
  if (template.inputType === 'multichoice') {
    return <MultiChoiceInput template={template} disabled={disabled} onSubmit={onSubmit} />;
  }

  if (template.inputType === 'choice') {
    const options: LeadChatOption[] = Array.isArray(template.options) ? template.options : [];
    // Big option cards for the intent step, compact chips for the rest.
    const isIntent = slotId === 'intent';
    return (
      <div className="px-2.5 sm:px-6 py-3 sm:py-3.5 bg-white/85 backdrop-blur-md border-t border-black/5" role="group" aria-label="Answer options">
        <div className={isIntent ? 'grid grid-cols-1 gap-2' : 'flex flex-wrap gap-2'}>
          {options.map((opt, i) => {
            const label = opt.label.hi || opt.label.en;
            const icon = OPTION_ICONS[opt.value];
            if (isIntent) {
              return (
                <button
                  key={opt.value}
                  disabled={disabled}
                  onClick={() => onSubmit(slotId, opt.value, label)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="ai-opt-in flex items-center gap-3 w-full px-3.5 py-3 sm:py-3.5 rounded-2xl border border-[#075E54]/20 bg-white text-left shadow-sm hover:border-[#075E54] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#075E54]/8 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#0B2B1E] truncate">{label}</p>
                    <p className="text-[11px] text-[#57534E] truncate">{opt.label.en}</p>
                  </div>
                  <svg className="w-5 h-5 text-[#075E54]/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              );
            }
            return (
              <button
                key={opt.value}
                disabled={disabled}
                onClick={() => onSubmit(slotId, opt.value, label)}
                style={{ animationDelay: `${i * 45}ms` }}
                className="ai-opt-in inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#075E54]/25 text-[#075E54] text-[13.5px] font-semibold bg-white shadow-sm hover:bg-[#075E54] hover:text-white hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {icon && <span className="text-base">{icon}</span>}
                {label}
              </button>
            );
          })}
        </div>
        {template.allowCustom && (
          <CustomInline
            placeholder="Or type your own…"
            disabled={disabled}
            onAdd={(v) => onSubmit(slotId, v, v)}
          />
        )}
        {skippable && <SkipButton slotId={slotId} disabled={disabled} onSubmit={onSubmit} />}
      </div>
    );
  }

  if (template.inputType === 'number') {
    return <NumberInput slotId={slotId} units={template.unit || []} skippable={skippable} disabled={disabled} onSubmit={onSubmit} />;
  }
  if (template.inputType === 'phone') {
    return <PhoneInput slotId={slotId} prefill={template.prefill} disabled={disabled} onSubmit={onSubmit} />;
  }
  return <TextInput slotId={slotId} inputType={template.inputType} skippable={skippable} disabled={disabled} onSubmit={onSubmit} />;
}

// ── Multi-select (amenities): tap presets + add custom, then submit / skip ──
function MultiChoiceInput({ template, disabled, onSubmit }: {
  template: NonNullable<LeadChatMessage['template']>;
  disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  const slotId = template.slotId || '';
  const options: LeadChatOption[] = Array.isArray(template.options) ? template.options : [];
  const presetValues = options.map((o) => o.value);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (v: string) =>
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  // Add a typed custom amenity (deduped, case-insensitive).
  const addCustom = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setSelected((prev) => (prev.some((x) => x.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
  };

  const submit = () => {
    if (selected.length === 0) return;
    onSubmit(slotId, selected, selected.join(', '));
  };

  // Custom (non-preset) selections, shown as removable chips.
  const customs = selected.filter((v) => !presetValues.includes(v));

  return (
    <div className="px-2.5 sm:px-6 py-3 sm:py-3.5 bg-white/85 backdrop-blur-md border-t border-black/5">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all active:scale-95 disabled:opacity-50 ${on
                ? 'bg-[#075E54] text-white border-[#075E54]'
                : 'bg-white text-[#075E54] border-[#075E54]/25 hover:bg-[#075E54]/5'}`}
            >
              {on && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
              {opt.label.en}
            </button>
          );
        })}
        {/* Custom selections as removable chips */}
        {customs.map((c) => (
          <button
            key={c}
            disabled={disabled}
            onClick={() => toggle(c)}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[13px] font-semibold border border-[#B45309] bg-[#B45309] text-white active:scale-95 transition-all disabled:opacity-50"
          >
            {c}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        ))}
      </div>

      {template.allowCustom && (
        <CustomInline placeholder="Add another amenity…" disabled={disabled} onAdd={addCustom} />
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          disabled={disabled || selected.length === 0}
          onClick={submit}
          className="px-5 py-2 rounded-full bg-gradient-to-br from-[#0A7360] to-[#075E54] text-white text-[13.5px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-40"
        >
          Add {selected.length > 0 ? `(${selected.length})` : ''}
        </button>
        {template.skippable && <SkipButton slotId={slotId} disabled={disabled} onSubmit={onSubmit} />}
      </div>
    </div>
  );
}

function InputShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 sm:px-6 py-3 sm:py-3.5 bg-white/85 backdrop-blur-md border-t border-black/5">
      {children}
    </div>
  );
}

function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label="Send answer" className="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-[#0A7360] to-[#075E54] text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg active:scale-90 transition-all disabled:opacity-40 disabled:shadow-none">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
    </button>
  );
}

function NumberInput({ slotId, units, skippable, disabled, onSubmit }: {
  slotId: string; units: string[]; skippable?: boolean; disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  const [val, setVal] = useState('');
  const [unit, setUnit] = useState(units[0] || '');
  const send = () => {
    if (!val.trim()) return;
    const value = units.length ? { value: val.trim(), unit } : val.trim();
    const display = units.length ? `${val.trim()} ${unit}` : val.trim();
    onSubmit(slotId, value, display);
    setVal('');
  };
  return (
    <InputShell>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white rounded-full border border-black/10 shadow-sm px-4 focus-within:ring-2 focus-within:ring-[#075E54]/30 transition-all">
          <input
            type="number" inputMode="decimal" autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Enter amount"
            className="flex-1 py-2.5 text-[15px] bg-transparent focus:outline-none placeholder:text-gray-400"
          />
        </div>
        <SendButton onClick={send} disabled={disabled || !val.trim()} />
      </div>
      {/* Prominent unit options — tap to choose the unit, type the amount above */}
      {units.length > 0 && (
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[12px] text-[#57534E]">Unit:</span>
          {units.map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all active:scale-95 ${unit === u
                ? 'bg-[#075E54] text-white border-[#075E54] shadow-sm'
                : 'bg-white text-[#075E54] border-[#075E54]/30 hover:bg-[#075E54]/5'}`}
            >
              {u}
            </button>
          ))}
        </div>
      )}
      {skippable && <SkipButton slotId={slotId} disabled={disabled} onSubmit={onSubmit} />}
    </InputShell>
  );
}

function PhoneInput({ slotId, prefill, disabled, onSubmit }: {
  slotId: string; prefill?: string; disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  const [val, setVal] = useState(prefill || '');
  const send = () => { if (val.trim()) onSubmit(slotId, val.trim(), val.trim()); };
  return (
    <InputShell>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white rounded-full border border-black/10 shadow-sm px-4 focus-within:ring-2 focus-within:ring-[#075E54]/30 transition-all">
          <span className="text-[15px] text-[#57534E] font-medium mr-1">+91</span>
          <input
            type="tel" inputMode="numeric" maxLength={10} autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="10-digit mobile"
            className="flex-1 py-2.5 text-[15px] bg-transparent focus:outline-none placeholder:text-gray-400 tracking-wide"
          />
        </div>
        <SendButton onClick={send} disabled={disabled || val.trim().length < 10} />
      </div>
      {prefill && <p className="mt-1.5 ml-4 text-[11px] text-[#57534E]">Aapke profile ka number bhara hai — badal sakte hain.</p>}
    </InputShell>
  );
}

function TextInput({ slotId, inputType, skippable, disabled, onSubmit }: {
  slotId: string; inputType?: string; skippable?: boolean; disabled: boolean;
  onSubmit: (slotId: string, value: unknown, displayText: string) => void;
}) {
  const [val, setVal] = useState('');
  const isLocation = inputType === 'location';
  const send = () => { if (val.trim()) { onSubmit(slotId, val.trim(), val.trim()); setVal(''); } };
  return (
    <InputShell>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white rounded-full border border-black/10 shadow-sm px-4 focus-within:ring-2 focus-within:ring-[#075E54]/30 transition-all">
          {isLocation && (
            <svg className="w-4.5 h-4.5 text-[#075E54] mr-2 flex-shrink-0" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          )}
          <input
            type="text" autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={isLocation ? 'e.g. Manish Nagar' : 'Type your answer'}
            className="flex-1 py-2.5 text-[15px] bg-transparent focus:outline-none placeholder:text-gray-400"
          />
        </div>
        <SendButton onClick={send} disabled={disabled || !val.trim()} />
      </div>
      {skippable && <SkipButton slotId={slotId} disabled={disabled} onSubmit={onSubmit} />}
    </InputShell>
  );
}

// ═══════════════════════════════════════════════════════════
// SUMMARY BUBBLE
// ═══════════════════════════════════════════════════════════

function SummaryBubble({ msg, onEdit, onConfirm, sending }: {
  msg: LeadChatMessage;
  onEdit: (slotId: string) => void;
  onConfirm: () => void;
  sending: boolean;
}) {
  const values: { slotId: string; label: string; display: string; skipped?: boolean }[] = msg.template?.options?.values || [];
  return (
    <div className="flex items-end gap-2 justify-start ai-msg-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-sm">🤖</div>
      <div className="max-w-[88%] w-full sm:max-w-[400px] bg-white rounded-2xl rounded-bl-md shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-[#075E54] to-[#0A7360] flex items-center gap-2">
          <svg className="w-5 h-5 text-[#7DD3FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="text-white text-[14px] font-bold leading-tight">Confirm your details</p>
            <p className="text-white/60 text-[10px]">Review karke matches paayein</p>
          </div>
        </div>
        <div className="divide-y divide-black/5">
          {values.map((v) => (
            <div key={v.slotId} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#FAF7F2] transition-colors">
              <div className="min-w-0">
                <p className="text-[10px] text-[#57534E] uppercase tracking-wide">{v.label}</p>
                <p className={`text-[14px] font-semibold truncate ${v.skipped ? 'text-[#A8A29E] italic font-normal' : 'text-[#0B2B1E]'}`}>{v.skipped ? 'Not provided' : v.display}</p>
              </div>
              <button onClick={() => onEdit(v.slotId)} className="ml-3 flex-shrink-0 flex items-center gap-1 text-[#B45309] text-[12px] font-semibold px-2.5 py-1 rounded-full hover:bg-[#B45309]/10 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {v.skipped ? 'Add' : 'Edit'}
              </button>
            </div>
          ))}
        </div>
        <div className="p-3">
          <button
            onClick={onConfirm}
            disabled={sending}
            className="w-full py-3 bg-gradient-to-r from-[#B45309] to-[#92400E] text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Finding matches…</>
            ) : (
              <>Confirm &amp; Find Matches
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RESULTS BUBBLE
// ═══════════════════════════════════════════════════════════

function ResultsBubble({ msg }: { msg: LeadChatMessage }) {
  const matches: { projectId: string; projectName: string; city?: string; location?: string; score: number; slug?: string }[] =
    msg.template?.options?.matches || [];
  const hasMatches = matches.length > 0;
  return (
    <div className="flex items-end gap-2 justify-start ai-msg-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-sm">🤖</div>
      <div className="max-w-[88%] w-full sm:max-w-[400px] space-y-2">
        <div className={`rounded-2xl rounded-bl-md px-4 py-3 shadow-sm ${hasMatches ? 'bg-gradient-to-br from-emerald-50 to-white border border-emerald-100' : 'bg-white'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{hasMatches ? '🎯' : '⏳'}</span>
            <p className="text-[14px] font-semibold text-[#0B2B1E]">{msg.content}</p>
          </div>
        </div>
        {matches.map((m, i) => (
          <div key={m.projectId} style={{ animationDelay: `${i * 80}ms` }} className="ai-opt-in bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B45309]/10 to-[#B45309]/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m-5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4m-4 0h4" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#0B2B1E] truncate">{m.projectName || 'Project'}</p>
              <p className="text-[11px] text-[#57534E] truncate">📍 {[m.location, m.city].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <ScoreRing score={m.score} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 75 ? '#059669' : clamped >= 50 ? '#B45309' : '#78716C';
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#F1F1F0" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 113} 113`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>{clamped}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACTIONS BUBBLE — closing quick-action tray (not a forced question)
// ═══════════════════════════════════════════════════════════

function ActionsBubble({ msg, onNewLead, disabled }: {
  msg: LeadChatMessage;
  onNewLead: () => void;
  disabled: boolean;
}) {
  const actions: { action: string; label: { en: string; hi: string }; icon?: string }[] =
    msg.template?.options?.actions || [];

  const handle = (action: string) => {
    if (action === 'new_lead') onNewLead();
    else if (action === 'view_leads') window.location.assign('/dashboard/lead-matching?tab=leads');
  };

  const iconFor = (icon?: string) => {
    if (icon === 'plus') return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
    if (icon === 'list') return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
    return null;
  };

  return (
    <div className="flex items-end gap-2 justify-start ai-msg-in">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#0E9F6E] flex items-center justify-center text-sm">🤖</div>
      <div className="max-w-[88%] w-full sm:max-w-[400px] bg-white rounded-2xl rounded-bl-md shadow-sm p-3">
        {msg.content && <p className="text-[13.5px] text-[#57534E] mb-2.5 px-1">{msg.content}</p>}
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => {
            const primary = a.action === 'new_lead';
            return (
              <button
                key={a.action}
                disabled={disabled}
                onClick={() => handle(a.action)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`ai-opt-in inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13.5px] font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50 ${primary
                  ? 'bg-gradient-to-br from-[#0A7360] to-[#075E54] text-white hover:shadow-md'
                  : 'bg-white border border-[#075E54]/25 text-[#075E54] hover:bg-[#075E54]/5'}`}
              >
                {iconFor(a.icon)}
                {a.label.hi || a.label.en}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Scoped CSS
// ═══════════════════════════════════════════════════════════

const styles = `
/* Smooth, contained momentum scrolling for the message pane so the chat
   doesn't rubber-band the page behind it and feels native on touch. */
.ai-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

/* GPU-accelerated entrance animations (translate3d + will-change) keep
   bubbles and option chips buttery on low-end phones. */
@keyframes aiMsgIn {
  from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.98); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
.ai-msg-in { animation: aiMsgIn 0.28s cubic-bezier(0.22,1,0.36,1) both; will-change: transform, opacity; }
@keyframes aiOptIn {
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.ai-opt-in { animation: aiOptIn 0.32s cubic-bezier(0.22,1,0.36,1) both; will-change: transform, opacity; }
@keyframes aiInputIn {
  from { opacity: 0; transform: translate3d(0, 16px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.ai-input-in { animation: aiInputIn 0.3s ease-out both; will-change: transform, opacity; }
@keyframes aiDot {
  0%,60%,100% { transform: translate3d(0, 0, 0); opacity: 0.4; }
  30% { transform: translate3d(0, -5px, 0); opacity: 1; }
}
.ai-dot { animation: aiDot 1.2s infinite ease-in-out; }

/* Crisp, instant tap feedback on option chips / buttons.
   A short transition on press makes taps feel responsive without lag. */
.ai-opt-in,
button {
  -webkit-tap-highlight-color: transparent;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
.ai-opt-in:active { transform: scale(0.96); transition-duration: 0.06s; }

/* Respect reduced-motion inside the chat too. */
@media (prefers-reduced-motion: reduce) {
  .ai-msg-in, .ai-opt-in, .ai-input-in, .ai-dot { animation: none !important; }
  .ai-scroll { scroll-behavior: auto; }
}
`;
