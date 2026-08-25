'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/authContext';

interface DemoLead {
  id: string;
  name: string;
  phone: string;
  project: string;
  stage: string;
  date: string;
  source: string;
}

interface JourneyStage {
  id: string;
  name: string;
  duration: string;
  description: string;
  touchPlan: string;
  nextStep: string;
  scriptMessage: string;
  photos: string[];
}

interface Props {
  lead: DemoLead;
  onBack: () => void;
  stages: string[];
  stageColor: (stage: string) => string;
  onStageChange?: (newStage: string) => void;
}

type JourneyType = 'inbound' | 'outbound' | 'ai';

const INBOUND_JOURNEY: JourneyStage[] = [
  { id: 'in-1', name: 'New Lead', duration: '1 din', description: 'Pehla contact 5 minute ke andar. Sirf reply nikalwana hai. Inbound lead ne khud form bhara hai — intent garam hai.', touchPlan: '0-90 sec: Pehla WhatsApp\n15 min: Call try\nDin 2: Dusre angle se WhatsApp', nextStep: 'Reply aaye to Contacted mein move karo', scriptMessage: 'Namaste {name} ji\n\n{project} ke liye aapki enquiry mili hai\n\nek chhota sawal — khud ke liye dekh rahe hain ya investment ke liye?', photos: [] },
  { id: 'in-2', name: 'Contacted', duration: '2 din', description: 'Client ne reply kiya. Ab requirement samajhna hai — budget, BHK, timeline.', touchPlan: 'Din 1: Requirement call (5 min)\nDin 2: Brochure + pricing WhatsApp', nextStep: 'Requirement clear to Qualified mein move karo', scriptMessage: 'Hi {name} ji, {project} ke liye aapka budget range kya hai?\n2BHK ya 3BHK prefer karenge?', photos: [] },
  { id: 'in-3', name: 'Qualified', duration: '3 din', description: 'Budget, BHK, location clear hai. Ab site visit fix karna hai.', touchPlan: 'Din 1: Site visit offer\nDin 2: Reminder\nDin 3: Urgency create', nextStep: 'Site visit fix to next stage', scriptMessage: '{name} ji, {project} aapke liye perfect match hai.\nKal ya parso site visit ke liye aa sakte hain?', photos: [] },
  { id: 'in-4', name: 'Site Visit Scheduled', duration: '2 din', description: 'Visit schedule ho chuka. Confirm karna hai ki client aayega.', touchPlan: '1 din pehle: Confirmation call\nVisit din: Morning reminder\n30 min pehle: Location share', nextStep: 'Visit complete to next stage', scriptMessage: '{name} ji, kal {project} ka site visit hai.\nMain gate pe milte hain.', photos: [] },
  { id: 'in-5', name: 'Site Visit Done', duration: '3 din', description: 'Client ne site dekh li. Feedback lena hai aur objections handle karne hain.', touchPlan: 'Same day: Thank you + feedback\nDin 2: Concerns address\nDin 3: Price discussion', nextStep: 'Interested to Negotiation mein move karo', scriptMessage: '{name} ji, site visit kaisa laga?\nKoi sawaal ho to batayiye!', photos: [] },
  { id: 'in-6', name: 'Negotiation', duration: '5 din', description: 'Price discussion. Discount, payment plan, offers discuss karo.', touchPlan: 'Din 1: Offer present\nDin 3: Follow-up\nDin 5: Final push', nextStep: 'Token commit to Booking mein move karo', scriptMessage: '{name} ji, {project} mein special offer:\nToken sirf 1 lakh, baaki EMI se.', photos: [] },
  { id: 'in-7', name: 'Booking', duration: '7 din', description: 'Token commit. Documentation aur payment process.', touchPlan: 'Din 1: Token collection\nDin 3: Document verification\nDin 7: Agreement', nextStep: 'Full payment to Won', scriptMessage: '{name} ji, booking confirm!\nDocuments ready rakhiye — Aadhar, PAN, photo.', photos: [] },
  { id: 'in-8', name: 'Won', duration: '—', description: 'Deal close! Referral ask karo.', touchPlan: 'Congratulations call\nReferral ask\nReview request', nextStep: 'Referral lena mat bhoolna!', scriptMessage: 'Congratulations {name} ji!\n{project} mein aapka ghar book ho gaya!', photos: [] },
];

const OUTBOUND_JOURNEY: JourneyStage[] = [
  { id: 'out-1', name: 'New Lead', duration: '3 din', description: 'Cold lead — enquiry nahi ki. Value-first approach use karo. Database/referral/social se aaya hai.', touchPlan: 'Din 1: Value-first WhatsApp (no pitch)\nDin 2: 2nd angle\nDin 3: Direct call', nextStep: 'Reply ya call connect to Contacted', scriptMessage: 'Hi {name} ji\n\nMain {project} area mein advisor hoon.\nEk update — prices 15% badh gayi hain 6 months mein.\nInterest ho toh free consultation de dunga.', photos: [] },
  { id: 'out-2', name: 'Contacted', duration: '3 din', description: 'Baat hui ya reply aaya. Cold se warm. Requirement samjho bina pushy hue.', touchPlan: 'Din 1: Casual conversation\nDin 2: Market insight\nDin 3: Soft requirement ask', nextStep: 'Requirement clear to Qualified. "Abhi nahi" to nurture.', scriptMessage: '{name} ji, baat karke acha laga.\n{project} exactly fit karta hai.\nBrochure bhejun?', photos: [] },
  { id: 'out-3', name: 'Qualified', duration: '4 din', description: 'Requirement clear. Trust zyada banana padta hai. Social proof use karo.', touchPlan: 'Din 1: Comparison (3 options)\nDin 2: Testimonial share\nDin 3: Visit push\nDin 4: Urgency', nextStep: 'Visit fix to next stage', scriptMessage: '{name} ji, aapke budget mein 3 options hain.\nComparison PDF bhej raha hoon.\nSite visit kab karein?', photos: [] },
  { id: 'out-4', name: 'Site Visit Scheduled', duration: '2 din', description: 'No-show rate zyada. Double confirm + pickup offer.', touchPlan: '1 din pehle: Confirm call\nVisit din: Cab offer\n1 hr pehle: On my way message', nextStep: 'Visit done to next. Cancel to reschedule.', scriptMessage: '{name} ji, kal {project} visit hai.\nPickup chahiye toh bata dijiye!', photos: [] },
  { id: 'out-5', name: 'Site Visit Done', duration: '4 din', description: 'Visit ho gayi. Zyada time lagta hai decide karne mein. Patience rakho.', touchPlan: 'Same day: Kaisa laga?\nDin 2: Comparison\nDin 3: Offer hint\nDin 4: Family visit?', nextStep: 'Interest confirm to Negotiation. Confused to 2nd visit.', scriptMessage: '{name} ji, {project} kaisa laga?\nFamily ko dikhana chahein toh arrange kar deta hoon.', photos: [] },
  { id: 'out-6', name: 'Negotiation', duration: '7 din', description: 'Lamba chalta hai. Patience + FOMO carefully.', touchPlan: 'Din 1: Special offer\nDin 3: Social proof\nDin 5: Manager call\nDin 7: Last date', nextStep: 'Token commit to Booking', scriptMessage: '{name} ji, builder se special baat ki:\nAdditional discount + No EMI offer.\nYe sirf limited time hai.', photos: [] },
  { id: 'out-7', name: 'Booking', duration: '7 din', description: 'Token le lo jaldi. Cold feet aata hai. Fast documentation.', touchPlan: 'Din 1: Token + receipt\nDin 2: Doc collection\nDin 4: Agreement draft\nDin 7: Signing', nextStep: 'Agreement done to Won', scriptMessage: '{name} ji, booking confirmed!\nDocuments jaldi de dijiye — smooth process hoga.', photos: [] },
  { id: 'out-8', name: 'Won', duration: '—', description: 'Outbound convert! Referral chances high.', touchPlan: 'Day 1: Congratulations\nWeek 1: Referral ask\nMonth 1: Review + testimonial', nextStep: 'Referral program. Upsell.', scriptMessage: 'Congratulations {name} ji!\nBahut acha decision liya.\nFriends ko bhi referral offer de dunga!', photos: [] },
];

const AI_GUIDE_JOURNEY: JourneyStage[] = [
  { id: 'ai-1', name: 'New Lead', duration: 'Instant', description: 'AI auto-responds 30 sec mein. Intent capture, quality score, priority assign.', touchPlan: '0-30 sec: AI WhatsApp auto-reply\n2 min: AI qualification questions\n5 min: Lead scored + assigned\n15 min: Agent notification', nextStep: 'AI qualifies to auto-Contacted. Low quality to drip.', scriptMessage: '[AI Auto]\nHi {name}! Thanks for interest in {project}.\n\nLooking for:\n1. Self-use\n2. Investment\n3. Just exploring\n\nReply 1, 2, or 3', photos: [] },
  { id: 'ai-2', name: 'Contacted', duration: '1 din', description: 'AI qualified. Human agent takes over with AI-suggested talking points.', touchPlan: 'Immediate: AI summary to agent\n30 min: Agent calls with context\nDin 1: AI follow-up content', nextStep: 'Agent confirms requirement to Qualified', scriptMessage: '[AI Brief]\nLead: {name}\nProject: {project}\nIntent: [Detected]\nBudget: [AI range]\n\nSuggested opener: "{project} ke baare mein batata hoon..."', photos: [] },
  { id: 'ai-3', name: 'Qualified', duration: '2 din', description: 'AI generates personalized content — comparisons, virtual tours, pricing.', touchPlan: 'Immediate: AI personalized brochure\nDin 1: Virtual tour link\nDin 2: AI suggests visit slots', nextStep: 'Response to content to Site Visit', scriptMessage: '[AI Auto-sends]\n{name} ji, personalized report ready:\n- {project} vs 2 alternatives\n- Virtual walkthrough\n- EMI calculator\n\nVisit slots: [AI-SUGGESTED]', photos: [] },
  { id: 'ai-4', name: 'Site Visit Scheduled', duration: '1 din', description: 'AI handles reminders, rescheduling, pre-visit content. Agent prepares.', touchPlan: 'Booking: AI calendar invite\n24hr: AI reminder\n2hr: AI nudge\nNo-show: AI auto-reschedule', nextStep: 'AI tracks arrival. Auto-moves to Visit Done.', scriptMessage: '[AI Sequence]\nCalendar invite sent\nMaps link sent\n"What to expect" guide sent\nReminders: -24hr, -2hr\nNo-show protocol: active', photos: [] },
  { id: 'ai-5', name: 'Site Visit Done', duration: '2 din', description: 'AI captures feedback via survey. Sentiment analysis. Agent gets scored insights.', touchPlan: '2hr after: AI feedback survey\nSame day: AI sentiment analysis\nDin 1: AI targeted content\nDin 2: AI prompts agent', nextStep: 'Positive to Negotiation. Mixed to more content.', scriptMessage: '[AI Survey]\n{name} ji, 3 quick questions:\n1. Experience? (1-5 stars)\n2. Kya pasand aaya?\n3. Koi concern?\n\nSentiment: [SCORE]\nAgent action: [SUGGESTED]', photos: [] },
  { id: 'ai-6', name: 'Negotiation', duration: '4 din', description: 'AI monitors competitors, suggests optimal offer, predicts close probability.', touchPlan: 'Immediate: AI best offer\nDin 2: AI comparison value\nDin 3: AI urgency (real data)\nDin 4: AI final offer', nextStep: 'High probability to push. Low to different strategy.', scriptMessage: '[AI Intel]\nClose probability: [X]%\nPrice sensitivity: [LEVEL]\n\nSuggested offer:\n- Discount: optimal\n- Best angle: [AI-PICKED]\n- Send timing: [PEAK HOUR]', photos: [] },
  { id: 'ai-7', name: 'Booking', duration: '5 din', description: 'AI streamlines docs — auto-fills, checklists, reminders, OCR verification.', touchPlan: 'Day 1: AI doc checklist + upload link\nDay 2: AI OCR verify\nDay 3: AI agreement draft\nDay 4: AI signing slot\nDay 5: AI completion', nextStep: 'All verified + signed to Won', scriptMessage: '[AI Doc Bot]\n{name} ji, upload kariye:\n- Aadhar (front+back)\n- PAN\n- 2 Photos\n- Address Proof\n\nUpload: [LINK]\nStatus: [X/4] done', photos: [] },
  { id: 'ai-8', name: 'Won', duration: '—', description: 'AI auto-triggers referral campaigns, review requests, cross-sell.', touchPlan: 'Day 1: AI congratulations + referral\nWeek 1: AI Google review\nMonth 1: AI cross-sell\nPossession: AI community invite', nextStep: 'AI tracks referrals. Auto-enroll loyalty.', scriptMessage: '[AI Post-Sale]\nCongratulations sent\nReferral link: [GENERATED]\nReview link: [GOOGLE]\nCommunity invite: [LINK]\n\nLifetime tracking: Active', photos: [] },
];

export default function LeadDetailView({ lead, onBack, stages, stageColor, onStageChange }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [journeyType, setJourneyType] = useState<JourneyType>('inbound');
  const [journeyStages, setJourneyStages] = useState<Record<JourneyType, JourneyStage[]>>({
    inbound: INBOUND_JOURNEY,
    outbound: OUTBOUND_JOURNEY,
    ai: AI_GUIDE_JOURNEY,
  });
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ stageId: string; field: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingStageId, setUploadingStageId] = useState<string | null>(null);

  // Note & Reminder state
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null); // stageId
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Record<string, { text: string; date: string }[]>>({});
  const [showReminderInput, setShowReminderInput] = useState<string | null>(null); // stageId
  const [reminderText, setReminderText] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminders, setReminders] = useState<Record<string, { text: string; date: string }[]>>({});

  // Stage change
  const [showStageChange, setShowStageChange] = useState(false);

  const currentStages = journeyStages[journeyType];
  const currentStageIndex = stages.indexOf(lead.stage);
  const currentStep = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;

  const handleFieldEdit = (stageId: string, field: keyof JourneyStage, value: string) => {
    setJourneyStages(prev => ({
      ...prev,
      [journeyType]: prev[journeyType].map(s => s.id === stageId ? { ...s, [field]: value } : s),
    }));
  };

  const handleAddStage = () => {
    const newId = `${journeyType}-${currentStages.length + 1}`;
    const newStage: JourneyStage = { id: newId, name: 'New Stage', duration: '—', description: 'Add description...', touchPlan: 'Define touch plan...', nextStep: 'Define next step...', scriptMessage: 'Add script...', photos: [] };
    setJourneyStages(prev => ({ ...prev, [journeyType]: [...prev[journeyType], newStage] }));
    setExpandedStage(newId);
  };

  const handleDeleteStage = (stageId: string) => {
    setJourneyStages(prev => ({ ...prev, [journeyType]: prev[journeyType].filter(s => s.id !== stageId) }));
    if (expandedStage === stageId) setExpandedStage(null);
  };

  const handlePhotoUpload = (stageId: string, files: FileList | null) => {
    if (!files || !isAdmin) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setJourneyStages(prev => ({
          ...prev,
          [journeyType]: prev[journeyType].map(s =>
            s.id === stageId ? { ...s, photos: [...s.photos, dataUrl] } : s
          ),
        }));
      };
      reader.readAsDataURL(file);
    });
    setUploadingStageId(null);
  };

  const handleDeletePhoto = (stageId: string, photoIndex: number) => {
    if (!isAdmin) return;
    setJourneyStages(prev => ({
      ...prev,
      [journeyType]: prev[journeyType].map(s =>
        s.id === stageId ? { ...s, photos: s.photos.filter((_, i) => i !== photoIndex) } : s
      ),
    }));
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#57534E] hover:text-[#B45309] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Client Dashboard
        </button>
        {isAdmin && (
          <button onClick={() => setIsEditing(!isEditing)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-[#B45309] text-white shadow-sm' : 'border border-[#E7E5E4] text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309]'}`}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* Client card */}
      <div className="rounded-2xl bg-[#1C1917] p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#57534E] flex items-center justify-center text-sm font-bold text-white">{lead.name.split(' ').map(n => n[0]).join('')}</div>
          <div>
            <h3 className="text-base font-bold text-white">{lead.name}</h3>
            <p className="text-xs text-[#B45309]">{lead.phone}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="px-2 py-0.5 rounded bg-[#292524] text-[10px] font-bold text-white border border-[#57534E]">{lead.project}</span>
          <span className="px-2 py-0.5 rounded bg-[#292524] text-[10px] font-bold text-white border border-[#57534E]">{lead.source}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stageColor(lead.stage)}`}>{lead.stage}</span>
        </div>
      </div>

      {/* Stage Change — below client card */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-1">Current Stage</p>
          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${stageColor(lead.stage)}`}>{lead.stage}</span>
        </div>
        {onStageChange && (
          <div className="flex-1">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-1">Move to</p>
            <select
              value={lead.stage}
              onChange={(e) => onStageChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-[#E7E5E4] text-xs font-bold text-[#2A2A2A] bg-white focus:outline-none focus:border-[#B45309]/40 transition-all"
            >
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Pipeline progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Pipeline</span>
          <span className="text-xs font-bold text-[#B45309]">Step {currentStep} of {stages.length}</span>
        </div>
        <div className="flex gap-1">
          {stages.map((_, i) => (<div key={i} className={`flex-1 h-1.5 rounded-full ${i < currentStep ? 'bg-[#B45309]' : 'bg-[#E7E5E4]'}`} />))}
        </div>
      </div>

      {/* Sales Journey */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[#2A2A2A]">Sales Journey</h4>
          <span className="text-xs font-bold text-[#B45309]">Step {currentStep} / {currentStages.length}</span>
        </div>

        {/* Journey type toggle */}
        <div className="flex gap-2 mb-4">
          {(['inbound', 'outbound', 'ai'] as JourneyType[]).map(type => (
            <button key={type} onClick={() => { setJourneyType(type); setExpandedStage(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${journeyType === type ? 'bg-[#1C1917] text-white shadow-sm' : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'}`}>
              {type === 'inbound' ? 'Inbound' : type === 'outbound' ? 'Outbound' : 'AI Guide'}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#A8A29E] mb-3 italic">
          {journeyType === 'inbound' && 'Inbound ka poora rasta lagbhag 23 din. Client ne khud enquiry ki hai.'}
          {journeyType === 'outbound' && 'Outbound rasta 30+ din. Cold leads — trust build karo pehle.'}
          {journeyType === 'ai' && 'AI-assisted — fastest close ~15 din. AI handles repetitive, human handles relationship.'}
        </p>

        {/* Stages */}
        <div className="space-y-2">
          {currentStages.map((stage, idx) => {
            const isExpanded = expandedStage === stage.id;
            const isCurrentOrPast = idx < currentStep;
            return (
              <div key={stage.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-[#B45309]/30 shadow-sm' : 'border-[#E7E5E4]'} ${isCurrentOrPast ? 'bg-white' : 'bg-[#FAF7F2]'}`}>
                <button onClick={() => setExpandedStage(isExpanded ? null : stage.id)} className="w-full flex items-center gap-3 p-3.5 text-left">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrentOrPast ? 'bg-[#B45309] text-white' : 'bg-[#E7E5E4] text-[#A8A29E]'}`}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    {isEditing && editingField?.stageId === stage.id && editingField.field === 'name' ? (
                      <input autoFocus className="text-sm font-bold text-[#2A2A2A] bg-transparent border-b border-[#B45309] outline-none w-full" value={stage.name} onChange={(e) => handleFieldEdit(stage.id, 'name', e.target.value)} onBlur={() => setEditingField(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)} />
                    ) : (
                      <p className="text-sm font-bold text-[#2A2A2A] truncate" onClick={(e) => { if (isEditing) { e.stopPropagation(); setEditingField({ stageId: stage.id, field: 'name' }); } }}>{stage.name}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#B45309] shrink-0">{stage.duration}</span>
                  {isEditing && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }} className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <svg className={`w-4 h-4 text-[#A8A29E] transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#E7E5E4] pt-3">
                    {/* Description */}
                    <div>{isEditing ? <textarea className="w-full text-sm text-[#57534E] bg-[#FAF7F2] border border-[#E7E5E4] rounded-lg p-2.5 focus:outline-none focus:border-[#B45309]/40 resize-none" rows={3} value={stage.description} onChange={(e) => handleFieldEdit(stage.id, 'description', e.target.value)} /> : <p className="text-sm text-[#57534E] leading-relaxed whitespace-pre-line">{stage.description}</p>}</div>

                    {/* Photos section — visible to all, upload only for admin */}
                    {(stage.photos.length > 0 || isAdmin) && (
                      <div className="rounded-lg bg-[#FAF7F2] border border-[#E7E5E4] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Photos / References</p>
                          {isAdmin && (
                            <button
                              onClick={() => { setUploadingStageId(stage.id); fileInputRef.current?.click(); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Upload
                            </button>
                          )}
                        </div>
                        {stage.photos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {stage.photos.map((photo, pIdx) => (
                              <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-[#E7E5E4]">
                                <img src={photo} alt={`Stage photo ${pIdx + 1}`} className="w-full h-20 object-cover" />
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeletePhoto(stage.id, pIdx)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#A8A29E] italic">No photos added yet</p>
                        )}
                      </div>
                    )}

                    {/* Touch Plan */}
                    <div className="rounded-lg bg-[#FAF7F2] border border-[#E7E5E4] p-3">
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">Touch Plan</p>
                      {isEditing ? <textarea className="w-full text-xs text-[#2A2A2A] bg-white border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40 resize-none font-mono" rows={3} value={stage.touchPlan} onChange={(e) => handleFieldEdit(stage.id, 'touchPlan', e.target.value)} /> : <p className="text-xs text-[#2A2A2A] whitespace-pre-line font-medium">{stage.touchPlan}</p>}
                    </div>

                    {/* Next Step */}
                    <div className="rounded-lg bg-[#FAF7F2] border border-[#E7E5E4] p-3">
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">Aage Kab</p>
                      {isEditing ? <textarea className="w-full text-xs text-[#2A2A2A] bg-white border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40 resize-none" rows={2} value={stage.nextStep} onChange={(e) => handleFieldEdit(stage.id, 'nextStep', e.target.value)} /> : <p className="text-xs text-[#2A2A2A] font-medium whitespace-pre-line">{stage.nextStep}</p>}
                    </div>

                    {/* Script */}
                    <div className="rounded-lg border border-[#E7E5E4] bg-white p-3">
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">Script / Message</p>
                      {isEditing ? <textarea className="w-full text-xs text-[#2A2A2A] bg-[#FAF7F2] border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40 resize-none" rows={5} value={stage.scriptMessage} onChange={(e) => handleFieldEdit(stage.id, 'scriptMessage', e.target.value)} /> : <p className="text-xs text-[#2A2A2A] whitespace-pre-line">{stage.scriptMessage.replace(/\{name\}/g, lead.name.split(' ')[0]).replace(/\{project\}/g, lead.project)}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="flex-1 py-2.5 rounded-xl bg-[#1C1917] text-white text-xs font-bold hover:bg-[#292524] transition-colors text-center">Call karo</a>
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(stage.scriptMessage.replace(/\{name\}/g, lead.name.split(' ')[0]).replace(/\{project\}/g, lead.project))}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-opacity text-center">WhatsApp bhejo</a>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowNoteInput(showNoteInput === stage.id ? null : stage.id); setShowReminderInput(null); }} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${showNoteInput === stage.id ? 'border-[#B45309] text-[#B45309] bg-[#B45309]/5' : 'border-[#E7E5E4] text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309]'}`}>Note</button>
                      <button onClick={() => { setShowReminderInput(showReminderInput === stage.id ? null : stage.id); setShowNoteInput(null); }} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${showReminderInput === stage.id ? 'border-[#B45309] text-[#B45309] bg-[#B45309]/5' : 'border-[#E7E5E4] text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309]'}`}>Reminder</button>
                    </div>

                    {/* Note input */}
                    {showNoteInput === stage.id && (
                      <div className="rounded-lg border border-[#B45309]/20 bg-[#B45309]/5 p-3 space-y-2">
                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." rows={2} className="w-full text-xs bg-white border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40 resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => { if (noteText.trim()) { setNotes(prev => ({ ...prev, [stage.id]: [...(prev[stage.id] || []), { text: noteText, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }] })); setNoteText(''); setShowNoteInput(null); } }} disabled={!noteText.trim()} className="px-3 py-1.5 rounded-lg bg-[#B45309] text-white text-[10px] font-bold disabled:opacity-40 hover:bg-[#92400E] transition-all">Save Note</button>
                          <button onClick={() => { setShowNoteInput(null); setNoteText(''); }} className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Reminder input */}
                    {showReminderInput === stage.id && (
                      <div className="rounded-lg border border-[#B45309]/20 bg-[#B45309]/5 p-3 space-y-2">
                        <input type="text" value={reminderText} onChange={(e) => setReminderText(e.target.value)} placeholder="Reminder message..." className="w-full text-xs bg-white border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40" />
                        <input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="w-full text-xs bg-white border border-[#E7E5E4] rounded-lg p-2 focus:outline-none focus:border-[#B45309]/40" />
                        <div className="flex gap-2">
                          <button onClick={() => { if (reminderText.trim() && reminderDate) { setReminders(prev => ({ ...prev, [stage.id]: [...(prev[stage.id] || []), { text: reminderText, date: reminderDate }] })); setReminderText(''); setReminderDate(''); setShowReminderInput(null); } }} disabled={!reminderText.trim() || !reminderDate} className="px-3 py-1.5 rounded-lg bg-[#B45309] text-white text-[10px] font-bold disabled:opacity-40 hover:bg-[#92400E] transition-all">Set Reminder</button>
                          <button onClick={() => { setShowReminderInput(null); setReminderText(''); setReminderDate(''); }} className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Saved notes */}
                    {notes[stage.id] && notes[stage.id].length > 0 && (
                      <div className="space-y-1.5">
                        {notes[stage.id].map((note, nIdx) => (
                          <div key={nIdx} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                            <svg className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[#2A2A2A]">{note.text}</p>
                              <p className="text-[9px] text-[#A8A29E] mt-0.5">{note.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Saved reminders */}
                    {reminders[stage.id] && reminders[stage.id].length > 0 && (
                      <div className="space-y-1.5">
                        {reminders[stage.id].map((rem, rIdx) => (
                          <div key={rIdx} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                            <svg className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[#2A2A2A]">{rem.text}</p>
                              <p className="text-[9px] text-blue-600 mt-0.5">{new Date(rem.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isEditing && (
            <button onClick={handleAddStage} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#B45309]/30 text-[#B45309] text-xs font-bold hover:border-[#B45309] hover:bg-[#B45309]/5 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Journey Stage
            </button>
          )}
        </div>
      </div>

      {/* Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[#2A2A2A]">Full Activity</h4>
          <span className="text-[10px] font-bold text-[#B45309] cursor-pointer hover:underline">Newest first</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B45309] mt-1.5 shrink-0" />
          <div>
            <p className="text-[10px] text-[#A8A29E]">{lead.date}</p>
            <p className="text-xs font-medium text-[#2A2A2A]">Lead Added - {lead.source}</p>
          </div>
        </div>
      </div>

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (uploadingStageId) handlePhotoUpload(uploadingStageId, e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
