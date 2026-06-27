import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Send, Bot, Sparkles } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export const CivicBot: React.FC = () => {
  const { settings, issues, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Welcoming messages in selected language
    let welcome = "Hello! I am CivicBot 🤖. I can guide you through reporting infrastructure issues, checking validation queues, and earning XP badges. What can I help you with today?";
    if (settings.language === 'hi') {
      welcome = "नमस्ते! मैं सिविकबॉट हूँ 🤖। मैं आपको सड़क, पानी, या कचरे की समस्याएं दर्ज करने, सत्यापन देखने, और पुरस्कार अर्जित करने में सहायता कर सकता हूँ। आज मैं आपकी क्या सहायता करूँ?";
    } else if (settings.language === 'gu') {
      welcome = "નમસ્તે! હું સિવિકબોટ છું 🤖. હું તમને રસ્તાઓ કે કચરાની સમસ્યાઓ સબમિટ કરવા, ચકાસણી પ્રક્રિયા સમજવા અને એક્સપી મેળવવામાં મદદ કરી શકું છું. હું તમારી શું સેવા કરું?";
    }
    return [{ sender: 'bot', text: welcome, timestamp: new Date().toISOString() }];
  });
  
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!currentUser) return null;

  // Formulate automated responses in selected languages
  const getOfflineResponse = (query: string): string => {
    const q = query.toLowerCase();
    const lang = settings.language;

    if (lang === 'hi') {
      if (q.includes('रिपोर्ट') || q.includes('सड़क') || q.includes('गड्ढा') || q.includes('रजिस्टर') || q.includes('पिक्चर')) {
        return "समस्या रिपोर्ट करने के लिए, 'समस्या दर्ज करें' (Report Issue) टैब पर जाएं। अपनी समस्या की एक तस्वीर अपलोड करें। एआई (Gemini) स्वचालित रूप से श्रेणी और तीव्रता का अनुमान लगाएगा। फिर जीपीएस स्थान सत्यापित करें और जमा करें!";
      }
      if (q.includes('पॉइंट') || q.includes('एक्सपी') || q.includes('बैज') || q.includes('लीडरबोर्ड') || q.includes('इनाम')) {
        return "आप नागरिक क्रियाओं के लिए एक्सपी (XP) कमाते हैं! समस्या की रिपोर्ट करने पर 10 XP, समुदाय सत्यापन पर 5 XP, और जब आपकी समस्या का समाधान (Resolved) होता है तो 15 XP मिलते हैं। शीर्ष नागरिक लीडरबोर्ड पर प्रदर्शित होते हैं!";
      }
      if (q.includes('सत्यापन') || q.includes('वेरिफ़ाई') || q.includes('वोट') || q.includes('कन्फर्म')) {
        return "जब कोई समस्या रिपोर्ट की जाती है, तो 500 मीटर के भीतर के नागरिकों को उसे सत्यापित करने के लिए कहा जाता है। 3 सत्यापित वोट मिलने पर समस्या सीधे म्युनिसिपल ऑफिसर की सूची में 'Verified' होकर पहुंच जाती है।";
      }
      if (q.includes('स्टेटस') || q.includes('ट्रैक') || q.includes('प्रगति')) {
        const count = issues.filter(i => i.reportedBy === currentUser.uid).length;
        return `आपके पास वर्तमान में ${count} सक्रिय शिकायत रिपोर्ट हैं। आप डैशबोर्ड इतिहास में प्रत्येक शिकायत की रीयल-टाइम स्थिति (Submitted > Verified > Assigned > In Progress > Resolved) देख सकते हैं।`;
      }
      return "मुझे खेद है, मैं आपकी बात पूरी तरह समझ नहीं पाया। क्या आप शिकायत दर्ज करने, पुरस्कार (XP), या समाधान की स्थिति के बारे में पूछना चाहते हैं? आप मुझसे हिंदी, अंग्रेजी या गुजराती में बात कर सकते हैं।";
    }

    if (lang === 'gu') {
      if (q.includes('રિપોર્ટ') || q.includes('ખાડો') || q.includes('ફરિયાદ') || q.includes('ફોટો')) {
        return "નવી ફરિયાદ દાખલ કરવા માટે 'સમસ્યા સબમિટ કરો' (Report Issue) ટેબ પર જાઓ. રસ્તા કે ગટરનો ફોટો અપલોડ કરો. એઆઈ એની મેળે કેટેગરી અને ગંભીરતા નક્કી કરશે. ત્યારબાદ લોકેશન ચકાસી સબમિટ કરો!";
      }
      if (q.includes('પોઇન્ટ') || q.includes('એક્સપી') || q.includes('બેજ') || q.includes('લીડરબોર્ડ')) {
        return "રિપોર્ટ કરવા પર 10 XP, વેરીફાઈ કરવા પર 5 XP અને સમસ્યા હલ થવા પર 15 XP મળે છે. વધુ પોઈન્ટ મેળવી તમે બ્રોન્ઝ, સિલ્વર મેડલ જીતી શકો છો અને ડિજિટલ સર્ટિફિકેટ ડાઉનલોડ કરી શકો છો!";
      }
      if (q.includes('વેરિફાય') || q.includes('ચકાસણી') || q.includes('સત્ય')) {
        return "આસપાસના રહીશો (500m માં) ફરિયાદ સાચી છે કે ખોટી તે ચકાસે છે. 3 સ્વતંત્ર વેરિફિકેશન મળતા જ ફરિયાદ 'Verified' સ્ટેટસ સાથે સીધી સરકારી અધિકારી પાસે જાય છે.";
      }
      if (q.includes('સ્ટેટસ') || q.includes('ટ્રેક') || q.includes('નકશો')) {
        const count = issues.filter(i => i.reportedBy === currentUser.uid).length;
        return `તમે હાલમાં ${count} સમસ્યાઓ રિપોર્ટ કરી છે. નકશા કે ડેશબોર્ડમાં તમે રિયલ-ટાઇમ અપડેટ્સ જોઈ શકો છો.`;
      }
      return "માફ કરશો, હું તમારી પૂછપરછ સમજી શક્યો નથી. શું તમે નવી રિપોર્ટ, એક્સપી પોઇન્ટ્સ, કે અધિકારીની કામગીरी વિશે પૂછવા માંગો છો?";
    }

    // Default English Responses
    if (q.includes('report') || q.includes('submit') || q.includes('how to') || q.includes('pothole') || q.includes('image')) {
      return "To report an issue: Navigate to the 'Report Issue' wizard, upload up to 5 photos, let Gemini AI auto-classify it, verify the pin location on the map, describe it (or use voice dictation), and submit. Duplicate checks are active within 100m.";
    }
    if (q.includes('xp') || q.includes('badge') || q.includes('points') || q.includes('reward') || q.includes('leaderboard')) {
      return "You get: 10 XP for submitting a report, +15 XP if verified by the community, 5 XP for validating others' reports, and +15 XP when your report gets fixed. Accumulate XP to unlock Badges (Pothole Spotter, Community Guardian) and civic certificates!";
    }
    if (q.includes('verify') || q.includes('validation') || q.includes('validator') || q.includes('confirm')) {
      return "The community verification system requires 3 validator confirmations from citizens within 500 meters of the issue. Once 3 approvals are obtained, the status promotes to 'Verified' and escalates to municipal officers.";
    }
    if (q.includes('status') || q.includes('track') || q.includes('progress') || q.includes('my report')) {
      const myIssues = issues.filter(i => i.reportedBy === currentUser.uid);
      return `You have submitted ${myIssues.length} reports. You can track their live status lifecycle (Submitted ➔ Under Review ➔ Verified ➔ Assigned ➔ In Progress ➔ Resolved ➔ Closed) on your Dashboard history tab.`;
    }
    return "I am here to assist with CivicPulse questions! Ask me about reporting mechanics, validation quotas, gamification badges, or how officers manage assigned tasks. Keep up the great civic contribution! ⚡";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal;
    setInputVal('');
    setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date().toISOString() }]);
    setIsLoading(true);

    // If API Key is present and Simulated mode is disabled, call Gemini Live!
    if (!settings.simulatedAIMode && settings.geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{
                    text: `You are CivicBot, a friendly and helpful assistant for CivicPulse (Community engagement platform). 
                           Answer the user's question concisely in the language they write in (English, Hindi, or Gujarati).
                           User Info: Ward: ${currentUser.ward}, Current XP: ${currentUser.xp}, Total Reports: ${issues.filter(i => i.reportedBy === currentUser.uid).length}, Open Reports: ${issues.filter(i => i.reportedBy === currentUser.uid && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length}, App Language: ${settings.language}.
                           Platform rules: 10 XP to report, 5 XP to verify, 3 verifications needed to move to Verified.
                           Keep it under 3-4 sentences. Always conclude with an encouraging civic tagline.
                           User message: "${userText}"`
                  }]
                }
              ]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Thank you for reaching out!";
          setMessages(prev => [...prev, { sender: 'bot', text: botText, timestamp: new Date().toISOString() }]);
        } else {
          throw new Error("Gemini API call failed");
        }
      } catch (err) {
        console.error("Gemini chatbot error, using fallback:", err);
        const fallback = getOfflineResponse(userText);
        setMessages(prev => [...prev, { sender: 'bot', text: fallback, timestamp: new Date().toISOString() }]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Offline fallback delay
      setTimeout(() => {
        const botResponse = getOfflineResponse(userText);
        setMessages(prev => [...prev, { sender: 'bot', text: botResponse, timestamp: new Date().toISOString() }]);
        setIsLoading(false);
      }, 700);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-bold shadow-glow-primary border border-brand-500/20 hover:scale-105 transition duration-300"
        >
          <Bot className="w-5 h-5 fill-white/10" />
          <span className="text-xs tracking-wider uppercase font-semibold">CivicBot</span>
        </button>
      )}

      {/* Expanded Chat Console */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[450px] bg-slate-900 border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-brand-750 to-brand-900 px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <Sparkles className="w-4 h-4 text-brand-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">CivicPulse Support</h3>
                <p className="text-[9px] text-brand-300/80 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {!settings.simulatedAIMode && settings.geminiApiKey ? 'GEMINI FLASH ACTIVE' : 'LOCAL MODEL'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Messages Drawer */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/20">
            {messages.map((m, index) => (
              <div
                key={index}
                className={`flex gap-2 max-w-[80%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-md bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-[11.5px] leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-slate-800 border border-white/5 text-slate-300 rounded-tl-none'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 max-w-[50%]">
                <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-brand-450" />
                </div>
                <div className="bg-slate-800 border border-white/5 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-slate-900/60 flex gap-2">
            <input
              type="text"
              placeholder={
                settings.language === 'hi' 
                  ? 'मुझसे कुछ भी पूछें...' 
                  : settings.language === 'gu'
                    ? 'મને પૂછો...'
                    : 'Ask CivicPulse...'
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 text-white disabled:text-slate-500 transition shadow-glow-primary/10 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default CivicBot;
