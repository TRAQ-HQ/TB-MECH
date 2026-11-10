import React, { useState } from 'react';
import { Analysis } from '../services/engine';
import { composeAnswer } from '../services/composer';
import { speakClinicalText, stopSpeaking, AudioCaptureService } from '../services/voice';
import { Volume2, VolumeX, Sparkles, Send, Bot, User, ShieldCheck, Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  analysis: Analysis;
  selectedLanguage: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provenance: {
    model: string;
    grounding: string;
    records: string[];
  };
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ analysis, selectedLanguage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Hello. I am the TB-MECH evidence-grounded voice assistant. Based on your current isolate (${analysis.isolate_id || analysis.analysis_id}), I can interpret drug susceptibility calls, explain biological resistance mechanisms, or detail WHO 2023 catalogue confidence tiers. How can I assist your clinical research?`,
      provenance: {
        model: 'Rule-based Clinical Composer',
        grounding: 'WHO 2023 Catalogue 2nd Edition',
        records: ['WHO_Catalogue_2023', 'CRyPTIC_NEJM_2018']
      }
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [isRecordingQuestion, setIsRecordingQuestion] = useState<boolean>(false);
  const questionCaptureRef = React.useRef<AudioCaptureService>(new AudioCaptureService());

  const quickInquiries = [
    { label: 'Why is Rifampicin called resistant?', query: 'Why is Rifampicin called resistant in this isolate?' },
    { label: 'katG S315T mechanism', query: 'What is the molecular mechanism of katG S315T?' },
    { label: 'INH & Ethionamide cross-resistance', query: 'Does this isolate have cross-resistance between Isoniazid and Ethionamide?' },
    { label: 'Role of compensatory rpoC V483G', query: 'What is the role of the compensatory rpoC V483G mutation?' },
    { label: 'Explain in Hindi (हिन्दी व्याख्या)', query: 'इस आइसोलेट के प्रतिरोध का हिंदी में विवरण दें' }
  ];

  const handleSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      provenance: { model: 'User Inquiry', grounding: 'Client Prompt', records: [] }
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Try backend API first, fallback to local composer
    let responseObj: any;
    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysis.analysis_id,
          question: queryText,
          language: selectedLanguage
        })
      });
      if (res.ok) {
        responseObj = await res.json();
      } else {
        responseObj = composeAnswer(analysis, queryText, selectedLanguage, false);
      }
    } catch {
      responseObj = composeAnswer(analysis, queryText, selectedLanguage, false);
    }

    const assistantMsg: Message = {
      id: `asst-${Date.now()}`,
      sender: 'assistant',
      text: responseObj.answer_text,
      provenance: {
        model: responseObj.source === 'evon_v3.3' ? 'Evon v3.3 Sovereign LLM' : 'Template (no LLM)',
        grounding: 'WHO 2023 Catalogue & PubMed Curated KB',
        records: responseObj.evidence_ids || []
      }
    };

    setMessages(prev => [...prev, assistantMsg]);
  };

  const handlePlayVoice = (msg: Message) => {
    if (isPlayingAudio && playingMsgId === msg.id) {
      stopSpeaking();
      setIsPlayingAudio(false);
      setPlayingMsgId(null);
    } else {
      stopSpeaking();
      setIsPlayingAudio(true);
      setPlayingMsgId(msg.id);
      speakClinicalText(msg.text, selectedLanguage, () => {
        setIsPlayingAudio(false);
        setPlayingMsgId(null);
      });
    }
  };

  const handleToggleVoiceQuestion = async () => {
    if (isRecordingQuestion) {
      setIsRecordingQuestion(false);
      questionCaptureRef.current.stopRecording();
    } else {
      setIsRecordingQuestion(true);
      const started = await questionCaptureRef.current.startRecording({
        languageCode: selectedLanguage,
        onLiveTranscript: text => {
          setInputQuery(text);
        },
        onWaveformUpdate: () => {},
        onError: () => {
          setIsRecordingQuestion(false);
        },
        onComplete: data => {
          setIsRecordingQuestion(false);
          if (data.text.trim()) {
            setInputQuery(data.text);
            handleSend(data.text);
          }
        }
      });
      if (!started) {
        setIsRecordingQuestion(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Explanatory Banner */}
      <div className="p-4 bg-white border border-[#e2e7ff] rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fffbeb] border border-[#fde68a] flex items-center justify-center text-[#855300]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#131b2e]">Evidence-Grounded Clinical Consultation</h3>
            <p className="text-xs text-[#515f74]">
              Every response traces strictly to verified knowledge base records. No ungrounded statistical hallucinations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#515f74]">Answer Provenance:</span>
          <span className="font-semibold text-[#855300] bg-[#fffbeb] px-2 py-0.5 rounded border border-[#fde68a]">
            Template (no LLM) / Deterministic KB
          </span>
        </div>
      </div>

      {/* Suggested Quick Questions Chips */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#515f74] block mb-2">
          Suggested Clinical Inquiries
        </span>
        <div className="flex flex-wrap gap-2">
          {quickInquiries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q.query)}
              className="px-3 py-1.5 text-xs bg-white hover:bg-[#f2f3ff] text-[#131b2e] border border-[#e2e7ff] hover:border-[#855300] rounded-lg transition-colors font-medium text-left"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="bg-white border border-[#e2e7ff] rounded-2xl p-6 shadow-xs space-y-6 min-h-[400px] flex flex-col justify-between">
        <div className="space-y-5 overflow-y-auto max-h-[500px] pr-2">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const isPlayingThis = isPlayingAudio && playingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#f2f3ff] border border-[#dae2fd] flex items-center justify-center text-[#855300] shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#855300] text-white rounded-tr-xs'
                        : 'bg-[#faf8ff] border border-[#e2e7ff] text-[#131b2e] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>

                  {/* Provenance Footer for Assistant Messages */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-[#515f74]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#855300]">{msg.provenance.model}</span>
                        <span>·</span>
                        <span>{msg.provenance.grounding}</span>
                        {msg.provenance.records.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[#515f74]">
                              [{msg.provenance.records.join(', ')}]
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handlePlayVoice(msg)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                          isPlayingThis
                            ? 'bg-[#dc2626] text-white font-bold'
                            : 'bg-[#f2f3ff] hover:bg-[#eaedff] text-[#855300]'
                        }`}
                      >
                        {isPlayingThis ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Play (Timbre)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#855300] flex items-center justify-center text-white shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Query Input Bar */}
        <div className="pt-4 border-t border-[#eaedff]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleVoiceQuestion}
              className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                isRecordingQuestion
                  ? 'bg-[#dc2626] text-white animate-pulse border-red-500'
                  : 'bg-white text-[#855300] border-[#dae2fd] hover:bg-[#f2f3ff]'
              }`}
              title={isRecordingQuestion ? 'Stop speaking question' : 'Speak question with microphone'}
            >
              {isRecordingQuestion ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder={isRecordingQuestion ? 'Listening... Speak your question' : 'Ask about resistance mechanisms, codon shifts, or WHO catalogue citations...'}
              className="flex-1 px-4 py-2.5 bg-[#f2f3ff] border border-[#dae2fd] focus:border-[#855300] focus:outline-none rounded-xl text-xs text-[#131b2e] placeholder:text-[#515f74]"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-[#121417] font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Inquire</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
