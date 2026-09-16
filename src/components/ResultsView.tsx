import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  PlusCircle,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  Share2,
  TrendingUp,
  BarChart2,
  FileDown,
  Loader2,
  Check,
  Bot,
  Sparkles,
  Filter,
  MessageSquare,
  Target,
} from "lucide-react";
import { QuizAttempt, Question } from "../types";
import { playCompleteSound } from "../utils/audio";
import { generateQuizResultPdf } from "../utils/pdfExport";
import { StudyBuddySidebar } from "./StudyBuddySidebar";

interface ResultsViewProps {
  attempt: QuizAttempt;
  onRetryQuiz: () => void;
  onNewQuiz: () => void;
  onConvertToFlashcards: (specificQuestions?: Question[]) => void;
  onLaunchAdaptiveQuiz?: (weakConcepts: string[]) => void;
  soundEffects: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  attempt,
  onRetryQuiz,
  onNewQuiz,
  onConvertToFlashcards,
  onLaunchAdaptiveQuiz,
  soundEffects,
}) => {
  const [showAllReviews, setShowAllReviews] = useState(true);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<"all" | "correct" | "missed">("all");
  const [isStudyBuddyOpen, setIsStudyBuddyOpen] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      // Allow slight render tick for button feedback
      await new Promise((resolve) => setTimeout(resolve, 80));
      generateQuizResultPdf(attempt);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    // Trigger festive confetti if score is >= 60%
    if (attempt.percentage >= 60) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"],
        });
      } catch (e) {
        // Confetti fallback
      }
    }
    if (soundEffects) {
      playCompleteSound();
    }
  }, [attempt.percentage, soundEffects]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const getPerformanceRemark = (pct: number) => {
    if (pct >= 90) return { title: "Outstanding Mastery!", desc: "Exceptional command over your notes. You're exam-ready!" };
    if (pct >= 75) return { title: "Great Performance!", desc: "Strong conceptual understanding with only minor gaps." };
    if (pct >= 50) return { title: "Good Effort!", desc: "Solid foundation. Review the highlighted explanations to lock in tricky terms." };
    return { title: "Needs Revision", desc: "Don't worry! Try practicing with the flashcards and retake the quiz to reinforce key concepts." };
  };

  const remark = getPerformanceRemark(attempt.percentage);

  // Filter questions based on topic and status
  const filteredQuestions = attempt.questions.filter((q) => {
    if (selectedTopicFilter !== "all" && q.topic !== selectedTopicFilter) {
      return false;
    }

    const userAns = attempt.userAnswers[q.id];
    const isSkipped = !userAns || userAns.trim() === "";
    const isCorrect =
      !isSkipped &&
      (userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
        userAns.trim().toLowerCase().includes(q.correctAnswer.trim().toLowerCase()));

    if (reviewStatusFilter === "correct") return isCorrect;
    if (reviewStatusFilter === "missed") return !isCorrect;
    return true;
  });

  const missedQuestionsList = attempt.questions.filter((q) => {
    const userAns = attempt.userAnswers[q.id];
    if (!userAns || userAns.trim() === "") return true;
    return (
      userAns.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase() &&
      !userAns.trim().toLowerCase().includes(q.correctAnswer.trim().toLowerCase())
    );
  });

  const handleCreateMissedCards = () => {
    if (missedQuestionsList.length > 0) {
      onConvertToFlashcards(missedQuestionsList);
    } else {
      onConvertToFlashcards();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Mobile/Tablet Toggle Bar for AI Study Buddy */}
      <div className="lg:hidden flex items-center justify-between rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-white p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">AI Study Buddy</p>
            <p className="text-[10px] text-slate-500">Personalized improvement tips</p>
          </div>
        </div>

        <button
          onClick={() => setIsStudyBuddyOpen(!isStudyBuddyOpen)}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
        >
          {isStudyBuddyOpen ? "Hide Buddy" : "View Tips"}
        </button>
      </div>

      {/* Main Two-Column Layout: Results Dashboard on Left, AI Study Buddy on Right */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Left Column: Results Dashboard */}
        <div className="flex-1 w-full space-y-8 min-w-0" id="results-dashboard">
          {/* Hero Score Card */}
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-500/10 via-white to-purple-500/10 p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
              <Award className="h-4 w-4 text-indigo-600" />
              <span>{attempt.subject} • {attempt.difficulty.toUpperCase()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {attempt.quizTitle}
            </h1>

            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-indigo-600 bg-white shadow-lg">
                <div className="text-center">
                  <span className="text-3xl sm:text-4xl font-black text-indigo-600 tracking-tight">
                    {attempt.percentage}%
                  </span>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Accuracy
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-extrabold text-slate-900">{remark.title}</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1">
                  {remark.desc}
                </p>
              </div>
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-200/60">
              <button
                onClick={() => setIsStudyBuddyOpen(!isStudyBuddyOpen)}
                id="toggle-study-buddy-btn"
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-xs transition-all active:scale-95 ${
                  isStudyBuddyOpen
                    ? "border-purple-300 bg-purple-50 text-purple-800 ring-2 ring-purple-400/30"
                    : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                }`}
                title="Toggle AI Study Buddy personalized tips sidebar"
              >
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>{isStudyBuddyOpen ? "AI Study Buddy (Open)" : "Open AI Study Buddy"}</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                id="download-pdf-report-btn"
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-xs transition-all active:scale-95 ${
                  pdfSuccess
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
                title="Download PDF report with your score, stats, and question-by-question explanations"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    <span>Generating PDF...</span>
                  </>
                ) : pdfSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 text-indigo-600" />
                    <span>Export PDF Report</span>
                  </>
                )}
              </button>

              {attempt.incorrectCount + attempt.skippedCount > 0 && onLaunchAdaptiveQuiz && (
                <button
                  onClick={() => {
                    const missedTopics = Object.keys(attempt.topicPerformance || {}).filter(
                      (t) => attempt.topicPerformance[t].correct < attempt.topicPerformance[t].total
                    );
                    onLaunchAdaptiveQuiz(missedTopics);
                  }}
                  id="adaptive-quiz-action-btn"
                  className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-900 hover:bg-indigo-100 shadow-xs transition-all active:scale-95"
                  title="Generate a targeted quiz focused on the concepts you missed"
                >
                  <Target className="h-4 w-4 text-indigo-600" />
                  <span>Adaptive Weak Areas Quiz</span>
                </button>
              )}

              <button
                onClick={onRetryQuiz}
                id="retry-quiz-btn"
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 shadow-xs transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4 text-indigo-600" />
                <span>Retry Quiz</span>
              </button>

              <button
                onClick={() => onConvertToFlashcards()}
                id="convert-flashcards-btn"
                className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-100 shadow-xs transition-all active:scale-95"
              >
                <Layers className="h-4 w-4 text-violet-600" />
                <span>Flashcards</span>
              </button>

              <button
                onClick={onNewQuiz}
                id="new-quiz-btn"
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          {/* 5 Core Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Score</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {attempt.score} <span className="text-sm font-semibold text-slate-400">/ {attempt.totalQuestions}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Correct</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{attempt.correctCount}</p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Incorrect</p>
              <p className="mt-1 text-2xl font-black text-rose-700">{attempt.incorrectCount}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Skipped</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{attempt.skippedCount}</p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Time Taken</p>
              <p className="mt-1 text-2xl font-black text-indigo-600">
                {formatTime(attempt.timeTakenSeconds)}
              </p>
            </div>
          </div>

          {/* Topic-Wise Performance Breakdown */}
          {attempt.topicPerformance && Object.keys(attempt.topicPerformance).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4" id="topic-performance-section">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Topic-Wise Performance Breakdown
                </h3>
              </div>

              <div className="space-y-3.5">
                {Object.entries(attempt.topicPerformance).map(([topic, val]) => {
                  const data = val as { total: number; correct: number };
                  const topicPct = Math.round((data.correct / (data.total || 1)) * 100);
                  return (
                    <div key={topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-semibold text-slate-800">{topic}</span>
                        <span className="font-bold text-slate-600">
                          {data.correct} / {data.total} correct ({topicPct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            topicPct >= 80 ? "bg-emerald-500" : topicPct >= 50 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${topicPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review Answers Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6" id="review-answers-section">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Review Answers & Notes Explanations
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Download results and explanations as PDF"
                >
                  <FileDown className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <span>{showAllReviews ? "Collapse All" : "Expand All"}</span>
                  {showAllReviews ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setReviewStatusFilter("all")}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    reviewStatusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({attempt.questions.length})
                </button>
                <button
                  onClick={() => setReviewStatusFilter("correct")}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    reviewStatusFilter === "correct"
                      ? "bg-white text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  Correct ({attempt.correctCount})
                </button>
                <button
                  onClick={() => setReviewStatusFilter("missed")}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    reviewStatusFilter === "missed"
                      ? "bg-white text-rose-800 shadow-2xs"
                      : "text-slate-600 hover:text-rose-700"
                  }`}
                >
                  Needs Focus / Missed ({missedQuestionsList.length})
                </button>
              </div>

              {/* Topic dropdown if multiple topics */}
              {attempt.topicPerformance && Object.keys(attempt.topicPerformance).length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedTopicFilter}
                    onChange={(e) => setSelectedTopicFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:outline-hidden"
                  >
                    <option value="all">All Topics</option>
                    {Object.keys(attempt.topicPerformance).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Detailed Question Review List */}
            {showAllReviews && (
              <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                    <p className="text-sm font-semibold">No questions match the current filter.</p>
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const userAns = attempt.userAnswers[q.id];
                    const isSkipped = !userAns || userAns.trim() === "";
                    const isCorrect =
                      !isSkipped &&
                      (userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
                        userAns.trim().toLowerCase().includes(q.correctAnswer.trim().toLowerCase()));

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-4 sm:p-5 transition-all space-y-3 ${
                          isCorrect
                            ? "border-emerald-200 bg-emerald-50/30"
                            : isSkipped
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-rose-200 bg-rose-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {q.type.replace("_", " ")}
                            </span>
                            {q.cognitiveLevel && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                  q.cognitiveLevel === "reasoning"
                                    ? "bg-purple-100 text-purple-800"
                                    : q.cognitiveLevel === "application"
                                    ? "bg-blue-100 text-blue-800"
                                    : q.cognitiveLevel === "understanding"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {q.cognitiveLevel}
                              </span>
                            )}
                            {q.topic && (
                              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                {q.topic}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                isCorrect
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isSkipped
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                                </>
                              ) : isSkipped ? (
                                <>
                                  <HelpCircle className="h-3.5 w-3.5" /> Skipped
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5" /> Incorrect
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm sm:text-base font-bold text-slate-900">
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm pt-1">
                          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-200/60">
                            <span className="font-semibold text-slate-500 block text-[11px]">Your Answer:</span>
                            <span
                              className={`font-bold ${
                                isCorrect ? "text-emerald-700" : isSkipped ? "text-amber-700 italic" : "text-rose-700"
                              }`}
                            >
                              {userAns || "No answer provided"}
                            </span>
                          </div>

                          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-200/60">
                            <span className="font-semibold text-slate-500 block text-[11px]">Correct Answer:</span>
                            <span className="font-bold text-emerald-800">{q.correctAnswer}</span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white p-3 border border-slate-200/80 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                          <p className="font-bold text-indigo-700">Explanation from Notes:</p>
                          <p className="leading-relaxed whitespace-pre-line">{q.explanation}</p>
                          {q.distractorExplanations && (
                            <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                              <span className="font-bold text-rose-700 block mb-0.5">⚠️ Common Misconception / Distractor Trap:</span>
                              <p className="leading-relaxed">{q.distractorExplanations}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Study Buddy Sidebar */}
        <StudyBuddySidebar
          attempt={attempt}
          isOpen={isStudyBuddyOpen}
          onToggle={() => setIsStudyBuddyOpen(!isStudyBuddyOpen)}
          onFilterMissedOnly={() => setReviewStatusFilter("missed")}
          onCreateMissedFlashcards={handleCreateMissedCards}
          onLaunchAdaptiveQuiz={onLaunchAdaptiveQuiz}
        />
      </div>
    </div>
  );
};
