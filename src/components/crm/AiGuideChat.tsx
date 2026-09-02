'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Props {
  currentStage: string;
  leadName: string;
  projectName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// AI knowledge base per stage — sample questions + answers for each pipeline stage
const STAGE_KNOWLEDGE: Record<string, { description: string; sampleQuestions: string[]; answers: Record<string, string> }> = {
  'New Lead': {
    description: 'Lead abhi abhi aaya hai. Pehla contact 5 minute ke andar karna hai.',
    sampleQuestions: [
      'Pehla message kya bheju?',
      'Kitni der mein contact karu?',
      'Agar reply nahi aaye toh?',
      'Call karu ya WhatsApp?',
      'Kya information collect karni hai?',
    ],
    answers: {
      'Pehla message kya bheju?': 'Short, personal WhatsApp bhejen:\n\n"Namaste [Name] ji, [Project] ke liye aapki enquiry mili. Ek chhota sawal — khud ke liye dekh rahe hain ya investment ke liye?"\n\nPitch mat karo, sirf reply nikalwana hai.',
      'Kitni der mein contact karu?': '90 seconds ke andar pehla WhatsApp bhejen. Speed hi sab kuch hai inbound lead mein. 5 min ke baad response rate 80% se 30% gir jaata hai.',
      'Agar reply nahi aaye toh?': '15 min baad ek call try karo. Agar call bhi nahi uthaye toh Din 2 pe dusre angle se WhatsApp bhejen — e.g., "Area mein prices badh rahi hain, update share karna tha."',
      'Call karu ya WhatsApp?': 'Pehle WhatsApp (0-90 sec). Phir 15 min baad call. WhatsApp ka reply rate zyada hai aur client apni marzi se reply karta hai.',
      'Kya information collect karni hai?': 'Bas ek cheez: Intent.\n• Self-use ya investment?\n• Budget range (optional)\n\nBaaki sab Contacted stage mein puchna hai. Yahan sirf reply chahiye.',
    },
  },
  'Contacted': {
    description: 'Client ne reply kiya. Ab requirement samajhna hai — budget, BHK, timeline.',
    sampleQuestions: [
      'Kya requirement puchni chahiye?',
      'Client budget nahi bata raha?',
      'Kitne din follow-up karu?',
      'Brochure kab bheju?',
      'Qualified stage mein kab move karu?',
    ],
    answers: {
      'Kya requirement puchni chahiye?': 'Priority order:\n1. Budget range (50L-80L etc.)\n2. BHK preference (2/3/4)\n3. Possession timeline (ready/1yr/2yr)\n4. Location preference\n5. Purpose (self-use/investment)\n\n5 min ki call mein ye sab mil jaana chahiye.',
      'Client budget nahi bata raha?': 'Range deke dekho: "Aapka range 50L ke aas paas hai ya 80L+?"\n\nYa reverse approach: "Ye project 55L se start hota hai, ye range comfortable hai?"',
      'Kitne din follow-up karu?': 'Max 2 din. Day 1: Requirement call. Day 2: Brochure + pricing WhatsApp. Agar Day 2 pe bhi engage nahi kiya toh nurture list mein daalo.',
      'Brochure kab bheju?': 'Call ke baad same day. Bina call ke brochure mat bhejen — client ko overwhelm hota hai. Pehle requirement samjho, phir relevant brochure bhejen.',
      'Qualified stage mein kab move karu?': 'Jab ye 3 cheezein clear ho:\n1. Budget confirmed\n2. BHK/type confirmed\n3. Timeline clear\n\nTab Qualified mein move karo aur site visit push shuru karo.',
    },
  },
  'Qualified': {
    description: 'Budget, BHK, location sab clear. Ab site visit fix karna hai.',
    sampleQuestions: [
      'Site visit kaise fix karu?',
      'Client bol raha "baad mein aaunga"?',
      'Urgency kaise create karu?',
      'Multiple projects suggest karu?',
      'Virtual tour bhejna chahiye?',
    ],
    answers: {
      'Site visit kaise fix karu?': '2 specific options do:\n"Kal 11 AM ya parso 3 PM — kab convenient hai?"\n\nOpen-ended mat rakho. Specific time slots de do toh conversion zyada hota hai.',
      'Client bol raha "baad mein aaunga"?': 'FOMO use karo (sachchi urgency):\n"Ye rate sirf [date] tak hai. Abhi 3 units bache hain is floor pe."\n\nYa: "Weekend pe 5 bookings ho gayi. Dekhna hai toh jaldi aayein."',
      'Urgency kaise create karu?': '3 effective urgency triggers:\n1. "Price revision [date] se" (real hai toh use karo)\n2. "Sirf [X] units bache hain is configuration mein"\n3. "Kal 2 site visits scheduled hain same unit ke liye"',
      'Multiple projects suggest karu?': 'Haan — 2-3 max. Comparison dena better hai:\n"Budget mein 3 options hain: A (best value), B (best location), C (ready possession)."\n\nComparison PDF bhejen.',
      'Virtual tour bhejna chahiye?': 'Haan, especially agar client door hai ya time nahi hai. But clearly bolo: "Ye virtual hai, asli feel ke liye site visit zaroor aayein."\n\nVirtual tour se site visit fix karne ka chance 40% badh jaata hai.',
    },
  },
  'Site Visit Scheduled': {
    description: 'Visit fix ho chuka hai. Confirm karo ki client aayega. No-show se bachna hai.',
    sampleQuestions: [
      'No-show se kaise bachu?',
      'Kya confirm karu ek din pehle?',
      'Client reschedule kar raha hai?',
      'Visit ke din kya prepare karu?',
      'Location kaise share karu?',
    ],
    answers: {
      'No-show se kaise bachu?': '3-touch confirmation:\n1. 1 din pehle: Call — "Kal ka plan confirm hai?"\n2. Visit din subah: WhatsApp — "Aaj milte hain [time] baje"\n3. 30 min pehle: "Main pohoch raha hoon, aap?"\n\nYe 3 touch se no-show rate 60% kam hota hai.',
      'Kya confirm karu ek din pehle?': 'Zaroor. Call karo (WhatsApp nahi — call se commitment stronger hoti hai):\n"[Name] ji, kal [project] ka visit hai [time] baje. Confirm hai na?"\n\nAgar cancel kare toh turant reschedule karo — "Toh parso 11 AM chalega?"',
      'Client reschedule kar raha hai?': 'Ek reschedule acceptable hai. Do baar reschedule kare toh interest low hai.\n\nPehli baar: "No problem, [new date] fix karte hain."\nDusri baar: "Main samajh sakta hoon. Jab time ho tab batayiye, main arrange kar dunga."',
      'Visit ke din kya prepare karu?': '5-point checklist:\n1. Site ready hai (clean, lights on)\n2. Brochure/floor plan hard copy\n3. Pricing sheet latest\n4. Calculator (EMI calculation ke liye)\n5. Comparison sheet (agar puche toh)',
      'Location kaise share karu?': 'Google Maps pin bhejen + landmarks:\n"[Project Name], [Address]\nMaps: [link]\nLandmark: [Nearest known place] ke paas\nMain gate pe milte hain."\n\n30 min pehle ek "On my way" message bhejen.',
    },
  },
  'Site Visit Done': {
    description: 'Client ne site dekh li. Feedback lena hai, objections handle karne hain.',
    sampleQuestions: [
      'Feedback kaise lu?',
      'Client ne "sochke batata hoon" bola?',
      'Objection handle kaise karu?',
      'Price discussion kab start karu?',
      'Follow-up kab karu visit ke baad?',
    ],
    answers: {
      'Feedback kaise lu?': '2 hours ke andar WhatsApp:\n"[Name] ji, site visit kaisa laga? Koi sawaal ho toh batayiye!"\n\nAgar reply aaye toh specific pucho: "Flat pasand aaya? Floor/facing theek laga?"',
      'Client ne "sochke batata hoon" bola?': 'Normal hai. 2 din do. Phir:\n"[Name] ji, koi specific concern hai? Main help kar sakta hoon — pricing, loan, comparison — kuch bhi."\n\nDirect "haan ya na" mat pucho — "Kya help chahiye?" pucho.',
      'Objection handle kaise karu?': 'Common objections:\n• "Mehenga hai" → EMI break karo, total cost comparison do\n• "Location door hai" → Development plan, future value batao\n• "Ready nahi hai" → Possession timeline + penalty clause\n• "Family se puchna hai" → "Family ko bhi dikhayein? Arrange kar deta hoon."',
      'Price discussion kab start karu?': 'Visit ke Din 3 pe start karo. Din 1-2 pe feedback/concerns address karo. Client pehle emotionally decide karta hai, phir rationally (price). Jaldi price discuss karne se "mehenga" objection aata hai.',
      'Follow-up kab karu visit ke baad?': 'Timeline:\n• Same day (2hr): Thank you + "kaisa laga?"\n• Din 2: Concerns address + comparison\n• Din 3: Price/offer discussion start\n\n3 din ke andar engagement na ho toh interest low hai — last push do aur move on.',
    },
  },
  'Negotiation': {
    description: 'Price discussion chal rahi hai. Discount, payment plan, offers discuss ho rahe hain.',
    sampleQuestions: [
      'Best offer kaise present karu?',
      'Client zyada discount maang raha?',
      'Payment plan kaise explain karu?',
      'Deal close kaise karu?',
      'Competitor se compare kar raha hai?',
    ],
    answers: {
      'Best offer kaise present karu?': 'Structure:\n"[Name] ji, builder se special baat ki:\n✅ ₹[X]L discount (limited time)\n✅ No EMI till possession\n✅ Token sirf ₹1L mein lock\n\nYe offer [date] tak hai."\n\nAlways deadline do.',
      'Client zyada discount maang raha?': 'Negotiate, but value add karo:\n"Discount mein limit hai, but ye extra de sakta hoon:\n• Free modular kitchen\n• 1 year maintenance free\n• Parking free\n• Registry charges covered"\n\nHar "no" ke saath ek alternative do.',
      'Payment plan kaise explain karu?': 'Visual banao:\n"Total: ₹75L\n• Token: ₹1L (today)\n• Booking: ₹5L (7 days mein)\n• Construction linked: ₹30L (stages mein)\n• Possession: ₹39L (loan se)\n\nEMI: ~₹35K/month (20yr loan)"\n\nEMI calculator use karo.',
      'Deal close kaise karu?': '3 closing techniques:\n1. Assumptive close: "Toh token kal de denge? Main receipt ready rakhta hoon."\n2. Urgency close: "Ye unit pe 2 aur enquiry hain. Kal tak lock nahi kiya toh..."\n3. Concession close: "Builder se last push karta hoon — agar aaj confirm ho toh extra [X] mil sakta hai."',
      'Competitor se compare kar raha hai?': 'Comparison sheet ready rakho:\n"Samajhta hoon, comparison zaroori hai. Main ek honest comparison bhejta hoon."\n\nApna project highlight karo: location, RERA, builder reputation, amenities, price/sqft.\n\nNever badmouth competitor — apni strength pe focus karo.',
    },
  },
  'Booking': {
    description: 'Token/booking amount commit ho gayi. Documentation aur payment process chal raha hai.',
    sampleQuestions: [
      'Token ke baad kya karu?',
      'Documents kaunse chahiye?',
      'Client cold feet dikha raha?',
      'Agreement kab ready hoga?',
      'Loan process kaise guide karu?',
    ],
    answers: {
      'Token ke baad kya karu?': 'Immediate:\n1. Receipt share karo\n2. Document list bhejen (same day)\n3. Agreement draft timeline batao\n4. Congratulate karo — "Great decision!"\n\nSpeed important hai — jitna jaldi paperwork ho utna cancellation risk kam.',
      'Documents kaunse chahiye?': 'Standard list:\n• Aadhar Card (front + back)\n• PAN Card\n• 2 Passport size photos\n• Address proof (utility bill/bank statement)\n• Income proof (agar loan hai)\n• IT returns (2 years)\n\nCheckbox format mein bhejen WhatsApp pe.',
      'Client cold feet dikha raha?': 'Common hai. Reassure karo:\n"[Name] ji, bahut achha decision liya hai. Main har step pe saath hoon. Koi bhi concern ho — call karo."\n\nAgar cancellation ki baat kare: "Kya specific concern hai? Shayad solve ho sake." Problem solve karo, emotional decision mat hone do.',
      'Agreement kab ready hoga?': 'Standard timeline:\n• Token: Day 1\n• Documents: Day 3 tak collect\n• Agreement draft: Day 4-5\n• Review: Day 5-6\n• Signing: Day 7\n\nClient ko timeline advance mein do toh anxiety kam hoti hai.',
      'Loan process kaise guide karu?': 'Step-by-step guide do:\n1. Bank shortlist (2-3 options with rates)\n2. Pre-approval letter (1-2 days)\n3. Property documents bank ko submit\n4. Technical valuation\n5. Sanction letter\n6. Disbursement\n\n"Main ek loan advisor connect kar deta hoon — free consultation hai."',
    },
  },
  'Won': {
    description: 'Deal close ho gayi! Referral lena hai, relationship maintain karna hai.',
    sampleQuestions: [
      'Referral kaise mangu?',
      'Google review kaise lu?',
      'Possession tak kya karu?',
      'Cross-sell kaise karu?',
      'Client unhappy hai delivery mein?',
    ],
    answers: {
      'Referral kaise mangu?': 'Best time: Booking ke 1 week baad (excitement high hai).\n\n"[Name] ji, congratulations again! Ek request — agar koi friend/relative bhi property dekh raha ho toh unhe refer karein. Special referral offer hai — ₹[X] cashback dono ko!"\n\n2-3 specific names pucho: "Koi yaad aa raha hai?"',
      'Google review kaise lu?': 'Simple link bhejen:\n"[Name] ji, aapka experience kaisa raha? 2-line review denge toh bahut help hogi.\n[Pre-filled Google link]\n\nBas 30 seconds lagenge!"\n\nBest time: Booking confirmed hone ke 2-3 din baad.',
      'Possession tak kya karu?': 'Quarterly touchpoint:\n1. Construction update photos\n2. Festival wishes\n3. Community group invite\n4. Referral remind\n\nPossession time: Housewarming wish + small gift (sweet box/plant).',
      'Cross-sell kaise karu?': 'Natural opportunities:\n• "Parking extra chahiye? Abhi ₹[X] mein mil jaayegi, baad mein nahi milegi."\n• "Modular kitchen ka package hai — ₹[X] mein full furnished."\n• New project launch: "Aapke investment ke liye perfect hai."',
      'Client unhappy hai delivery mein?': 'Immediate action:\n1. Listen — pura suno bina interrupt kiye\n2. Acknowledge — "Main samajh sakta hoon, ye frustrating hai."\n3. Action — "Main builder se baat karta hoon aaj hi."\n4. Follow-up — 24hr mein update do\n\nNever defensive ho. Client ka trust bachana hai future referral ke liye.',
    },
  },
  'Lost': {
    description: 'Deal nahi hui. Reason samjho aur future ke liye learn karo.',
    sampleQuestions: [
      'Lost lead ko dobara kaise approach karu?',
      'Loss reason kaise track karu?',
      'Kitne din baad retry karu?',
      'Kya nurture campaign chalani chahiye?',
      'Win-back strategy kya hai?',
    ],
    answers: {
      'Lost lead ko dobara kaise approach karu?': '30 din baad ek soft message:\n"[Name] ji, kaise hain? Property ka kuch socha? Market mein kuch naye options aaye hain — interested hain toh batayiye."\n\nNever "kyu nahi liya" mat pucho. Fresh start do.',
      'Loss reason kaise track karu?': 'Categories:\n• Budget mismatch (too expensive)\n• Location issue\n• Bought elsewhere (competitor)\n• Timing wrong (not ready)\n• Bad experience (our fault)\n\nHar lost lead ke saath reason note karo. Monthly pattern dekhne se improvement hota hai.',
      'Kitne din baad retry karu?': 'Depends on reason:\n• Budget: 3-6 months (new launches mein cheaper option ho sakta hai)\n• Timing: 2-3 months\n• Competitor: 6 months (possession issues aa sakte hain)\n• Location: Only if new project in their preferred area',
      'Kya nurture campaign chalani chahiye?': 'Haan! Monthly value content:\n• Market updates (price trends)\n• New project launches\n• Investment tips\n• Area development news\n\nSoft touch — pitch mat karo, value do. 6 months mein 10-15% wapas aate hain.',
      'Win-back strategy kya hai?': 'Top 3:\n1. New inventory: "Ye naya option aaya hai jo pehle available nahi tha."\n2. Price drop: "Builder ne ₹[X] reduce kiya hai — ab budget mein aa raha hai."\n3. Urgency: "Last 5 units hain, phir ye project close."\n\nBest trigger: Life event (marriage, baby, job change) — tab property need revive hoti hai.',
    },
  },
};

export default function AiGuideChat({ currentStage, leadName, projectName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stageData = STAGE_KNOWLEDGE[currentStage] || STAGE_KNOWLEDGE['New Lead'];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add initial AI greeting on mount
  useEffect(() => {
    const greeting: ChatMessage = {
      id: 'greeting',
      role: 'ai',
      text: `Main aapka AI Sales Assistant hoon. Aap "${currentStage}" stage pe hain.\n\n${stageData.description}\n\nKoi bhi sawal pucho — main guide karunga.`,
    };
    setMessages([greeting]);
  }, [currentStage, stageData.description]);

  const getAiResponse = (question: string): string => {
    // Check if the question matches any sample answer (fuzzy match)
    const lowerQ = question.toLowerCase().trim();
    for (const [sampleQ, answer] of Object.entries(stageData.answers)) {
      const lowerSample = sampleQ.toLowerCase();
      if (lowerQ.includes(lowerSample.slice(0, 15)) || lowerSample.includes(lowerQ.slice(0, 15))) {
        return answer.replace(/\[Name\]/g, leadName.split(' ')[0]).replace(/\[name\]/g, leadName.split(' ')[0]).replace(/\{name\}/g, leadName.split(' ')[0]).replace(/\{project\}/g, projectName).replace(/\[Project\]/g, projectName);
      }
    }

    // Generic keyword-based responses
    if (lowerQ.includes('call') || lowerQ.includes('phone')) {
      return `"${currentStage}" stage mein call approach:\n${stageData.answers[Object.keys(stageData.answers)[0]] || 'Call ke liye pehle WhatsApp bhejen, phir 15 min baad call try karo.'}\n\nClient ka time respect karo — forceful mat ho.`;
    }
    if (lowerQ.includes('whatsapp') || lowerQ.includes('message')) {
      return `WhatsApp message "${currentStage}" ke liye:\n\nShort rakho, personal rakho. Client ka naam use karo. Ek clear CTA do (question ya next step).\n\nGeneric template mat bhejen — personalize karo.`;
    }
    if (lowerQ.includes('next') || lowerQ.includes('aage') || lowerQ.includes('move')) {
      return `"${currentStage}" se aage jaane ke liye:\n\nCheck karo ki stage ka goal complete hua ya nahi. Stage change tab karo jab clear signal mile.\n\nJaldi mat karo — client ready nahi hai toh pressure se deal kharab hoti hai.`;
    }

    // Default response
    return `"${currentStage}" ke context mein:\n\n${stageData.description}\n\nIs stage ka goal achieve karne ke liye focus rakho. Specific sawal pucho toh better guide kar sakta hoon — e.g., "message kya bheju?" ya "objection kaise handle karu?"`;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getAiResponse(input.trim());
      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: 'ai', text: response };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleSampleClick = (q: string) => {
    setInput(q);
    // Auto-send
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      const response = getAiResponse(q);
      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: 'ai', text: response };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
    setInput('');
  };

  return (
    <div className="rounded-xl border border-[#E7E5E4] bg-white overflow-hidden flex flex-col" style={{ minHeight: '400px', maxHeight: '500px' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1C1917] text-white">
        <div className="w-8 h-8 rounded-full bg-[#B45309] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold">AI Sales Assistant</p>
          <p className="text-[10px] text-[#B45309]">Stage: {currentStage}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">Online</span>
        </div>
      </div>

      {/* Sample questions */}
      <div className="px-3 py-2 border-b border-[#E7E5E4] bg-[#FAF7F2]">
        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-wider mb-1.5">Quick Questions</p>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {stageData.sampleQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSampleClick(q)}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAF7F2]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'
                ? 'bg-[#B45309] text-white rounded-br-md'
                : 'bg-white border border-[#E7E5E4] text-[#2A2A2A] rounded-bl-md shadow-sm'
            }`}>
              <p className="text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E7E5E4] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-[#E7E5E4] bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Apna sawal puchiye..."
            className="flex-1 px-3 py-2 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm placeholder:text-[#A8A29E] focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-[#B45309] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#92400E] transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
