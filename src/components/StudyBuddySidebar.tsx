import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Send,
  Loader2,
  RefreshCw,
  Layers,
  HelpCircle,
  X,
  Target,
  BookOpen,
  MessageSquare,
  Compass,
} from "lucide-react";
import { QuizAttempt, StudyBuddyAdvice, StudyBuddyMessage } from "../types";
import { fetchStudyBuddyAdvice, askStudyBuddy } from "../utils/studyBuddy";

interface StudyBuddySidebarProps {
  attempt: QuizAttempt;
  isOpen: boolean;
  onToggle: () => void;
  onFilterMissedOnly?: () => void;
  onCreateMissedFlashcards?: () => void;
  onLaunchAdaptiveQuiz?: (weakConcepts: string[]) => void;
}

export const StudyBuddySidebar: React.FC<StudyBuddySidebarProps> = ({
  attempt,
  isOpen,
  onToggle,
  onFilterMissedOnly,
  onCreateMissedFlashcards,
  onLaunchAdaptiveQuiz,
}) => {
  const [advice, setAdvice] = useState<StudyBuddyAdvice | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(true);
  const [chatMessages, setChatMessages] = useState<StudyBuddyMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"tips" | "chat">("tips");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load advice when attempt changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAdvice(true);

    fetchStudyBuddyAdvice(attempt)
      .then((data) => {
        if (isMounted) {
          setAdvice(data);
          setIsLoadingAdvice(false);

          // Seed greeting message in chat
          const initialGreeting: StudyBuddyMessage = {
            id: `msg-init-${Date.now()}`,
            sender: "buddy",
            text: `Hi! I've analyzed your score on "${attempt.quizTitle}" (${attempt.percentage}%). ${
              data.struggledTopics.length > 0
                ? `You did well in some parts, but had a tougher time with ${data.struggledTopics.join(", ")}. Let's turn those into strengths! What would you like help with?`
                : "Outstanding work! You showed strong mastery across all topics. Ask me anything to stretch your understanding further!"
            }`,
            timestamp: Date.now(),
          };
          setChatMessages([initialGreeting]);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingAdvice(false);
      });

    return () => {
      isMounted = false;
    };
  }, [attempt.id, attempt.score]);

  useEffect(() => {
    if (activeSubTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeSubTab]);

  const handleRefreshAdvice = async () => {
    setIsLoadingAdvice(true);
    try {
      const fresh = await fetchStudyBuddyAdvice(attempt);
      setAdvice(fresh);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText.trim();
    if (!textToSend || isSendingChat) return;

    const userMsg: StudyBuddyMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    if (!customPrompt) setInputText("");
    setIsSendingChat(true);
    setActiveSubTab("chat");

    try {
      const replyText = await askStudyBuddy(textToSend, attempt, newHistory);
      const buddyMsg: StudyBuddyMessage = {
        id: `msg-buddy-${Date.now()}`,
        sender: "buddy",
        text: replyText,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, buddyMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingChat(false);
    }
  };

  const missedCount = attempt.incorrectCount + attempt.skippedCount;

  return (
    <aside
      id="ai-study-buddy-sidebar"
      className={`transition-all duration-300 ease-in-out ${
        isOpen
          ? "w-full lg:w-84 xl:w-92 shrink-0 opacity-100"
          : "w-0 hidden lg:block lg:w-0 overflow-hidden opacity-0 pointer-events-none"
      }`}
    >
      <div className="sticky top-20 flex flex-col rounded-3xl border border-indigo-200/80 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden h-[calc(100vh-6.5rem)] max-h-[820px]">
        {/* Header */}
        <div className="relative border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner backdrop-blur-sm">
                <Bot className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-700"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold tracking-tight">AI Study Buddy</h3>
                  <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100 font-medium">
                  Personalized Improvement Guidance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRefreshAdvice}
                disabled={isLoadingAdvice}
                title="Refresh AI Analysis"
                className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/15 hover:text-white transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAdvice ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onToggle}
                title="Close Sidebar"
                className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/15 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sub Navigation: Tips vs Interactive Chat */}
          <div className="mt-3 flex rounded-xl bg-indigo-900/40 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("tips")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                activeSubTab === "tips"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Improvement Tips</span>
            </button>
            <button
              onClick={() => setActiveSubTab("chat")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                activeSubTab === "chat"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Ask Buddy</span>
              {chatMessages.length > 1 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">
                  {chatMessages.length - 1}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800 text-xs">
          {isLoadingAdvice ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="font-semibold text-slate-700">
                Analyzing test gaps & formulating tips...
              </p>
              <p className="text-[11px] text-slate-400">
                Examining your incorrect answers and topics to recommend targeted next steps.
              </p>
            </div>
          ) : activeSubTab === "tips" ? (
            <>
              {/* Personalized Headline Banner */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs uppercase tracking-wider text-amber-700 font-extrabold">
                    Personalized Feedback
                  </span>
                </div>
                <p className="text-xs font-bold leading-relaxed text-slate-900">
                  {advice?.headline || "Based on your quiz performance, here are your recommended focus areas:"}
                </p>
              </div>

              {/* Recommended Sub-Topics to Try Next (The core prompt request!) */}
              {advice?.recommendedSubtopics && advice.recommendedSubtopics.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-indigo-600" />
                      Try These Sub-Topics Next:
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                      High Yield
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {advice.recommendedSubtopics.map((subtopic, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendMessage(`Explain "${subtopic}" in simple terms with key exam points.`);
                        }}
                        className="group flex w-full items-center justify-between rounded-xl border border-indigo-200/70 bg-white p-2 text-left hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-2xs transition-all"
                        title="Click to ask AI Study Buddy about this subtopic"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-extrabold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 group-hover:text-indigo-900">
                            {subtopic}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center italic">
                    Tip: Click any subtopic to get an instant explanation
                  </p>
                </div>
              )}

              {/* Struggles & Strengths pills */}
              <div className="space-y-2">
                {advice?.struggledTopics && advice.struggledTopics.length > 0 && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 space-y-1.5">
                    <span className="font-bold text-rose-800 flex items-center gap-1.5 text-[11px]">
                      <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                      Struggled Topics ({advice.struggledTopics.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {advice.struggledTopics.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg bg-rose-100/80 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {advice?.masteredTopics && advice.masteredTopics.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-1.5">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Mastered Areas ({advice.masteredTopics.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {advice.masteredTopics.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actionable Study Tips */}
              {advice?.tips && advice.tips.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Actionable Improvement Tips:
                  </span>
                  <div className="space-y-2">
                    {advice.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-[11px] leading-relaxed text-slate-600 font-medium">
                          {tip}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="space-y-2 pt-1">
                {missedCount > 0 && onFilterMissedOnly && (
                  <button
                    onClick={onFilterMissedOnly}
                    className="flex w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-rose-600" />
                      Filter Reviews to Missed Questions ({missedCount})
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-rose-600" />
                  </button>
                )}

                {missedCount > 0 && onLaunchAdaptiveQuiz && (
                  <button
                    onClick={() => onLaunchAdaptiveQuiz(advice?.struggledTopics || [])}
                    className="flex w-full items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-indigo-600" />
                      Adaptive Quiz on Weak Concepts
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                  </button>
                )}

                {missedCount > 0 && onCreateMissedFlashcards && (
                  <button
                    onClick={onCreateMissedFlashcards}
                    className="flex w-full items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-violet-600" />
                      Create Flashcards for Missed Only
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-violet-600" />
                  </button>
                )}

                <button
                  onClick={() => setActiveSubTab("chat")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat with Study Buddy</span>
                </button>
              </div>
            </>
          ) : (
            /* Chat Sub-Tab */
            <div className="flex flex-col h-full space-y-3">
              {/* Quick Starter Prompt Chips */}
              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
                <button
                  onClick={() => handleSendMessage("Why did I get my missed questions wrong?")}
                  className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  💡 Why did I miss questions?
                </button>
                <button
                  onClick={() => handleSendMessage(`Give me a memory trick/mnemonic for ${attempt.subject}`)}
                  className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  🧠 Memory trick
                </button>
                <button
                  onClick={() => handleSendMessage("What should be my 15-minute revision plan today?")}
                  className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  ⏱️ 15-min plan
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 leading-relaxed text-[11px] ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                          : "bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/70"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {msg.sender === "user" ? "You" : "AI Study Buddy"}
                    </span>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-2.5 text-slate-500 w-fit">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span className="text-[10px] font-medium">Study Buddy is typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Bar (Visible always when in chat sub-tab) */}
        {activeSubTab === "chat" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-slate-100 p-2.5 bg-slate-50/80 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about your quiz..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSendingChat}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
};
