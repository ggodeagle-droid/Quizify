import React, { useState } from "react";
import {
  Sparkles,
  Clock,
  Sliders,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  FileText,
  AlertCircle,
  HelpCircle,
  Zap,
  GraduationCap
} from "lucide-react";
import { QuizConfig, DifficultyLevel, QuestionTypeFilter } from "../types";

interface QuizSetupViewProps {
  notesText: string;
  uploadedFileName?: string;
  initialConfig: QuizConfig;
  onGenerateQuiz: (config: QuizConfig) => void;
  onBack: () => void;
  isProcessing: boolean;
  processingStep: string;
}

export const QuizSetupView: React.FC<QuizSetupViewProps> = ({
  notesText,
  uploadedFileName,
  initialConfig,
  onGenerateQuiz,
  onBack,
  isProcessing,
  processingStep,
}) => {
  const [title, setTitle] = useState(initialConfig.title || "");
  const [subject, setSubject] = useState(initialConfig.subject || "");
  const [questionCount, setQuestionCount] = useState<number>(initialConfig.questionCount || 10);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialConfig.difficulty || "medium");
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeFilter>(initialConfig.questionTypes || "all");
  const [timerEnabled, setTimerEnabled] = useState<boolean>(initialConfig.timerEnabled ?? true);
  const [timerMinutes, setTimerMinutes] = useState<number>(initialConfig.timerMinutes || 10);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(initialConfig.instantFeedback ?? true);
  const [studyLevel, setStudyLevel] = useState<string>(initialConfig.studyLevel || "Class 11-12 / Competitive Exams");

  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateQuiz({
      title: title.trim() || (uploadedFileName ? uploadedFileName.replace(/\.[^/.]+$/, "") : "Custom Study Quiz"),
      subject: subject.trim() || "General Studies",
      questionCount,
      difficulty,
      questionTypes,
      timerEnabled,
      timerMinutes,
      instantFeedback,
      studyLevel,
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back button and title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          id="setup-back-btn"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Notes</span>
        </button>

        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
          Step 2: Customize Your Quiz
        </span>
      </div>

      {/* Note summary banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {uploadedFileName ? `File: ${uploadedFileName}` : "Pasted Study Notes"}
            </h3>
            <p className="text-xs text-slate-500">
              {wordCount > 0 ? `${wordCount} words detected in study material` : "Uploaded document ready for processing"}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
        >
          Edit Notes
        </button>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
          {/* Quiz Title and Subject */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quiz Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cellular Respiration Master Quiz"
                id="quiz-title-input"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject / Topic
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology, Physics, World History"
                id="quiz-subject-input"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Target Student Level & Focus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Level
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  id: "Class 10 (Board Exam / Foundation)",
                  title: "Class 10 (Board)",
                  desc: "Core definitions, key concepts & basic formulas",
                },
                {
                  id: "Class 11-12 (School / Boards)",
                  title: "Class 11–12 (School / Boards)",
                  desc: "Standard curriculum, key concepts & examples",
                },
                {
                  id: "Class 11-12 (JEE / NEET / Competitive)",
                  title: "Class 11–12 (JEE / NEET)",
                  desc: "Exam-oriented concepts & practice applications",
                },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setStudyLevel(lvl.id)}
                  id={`studylevel-${lvl.title.replace(/[^a-zA-Z0-9]/g, "-")}`}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    studyLevel === lvl.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{lvl.title}</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 leading-snug">
                    {lvl.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Number of Questions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Number of Questions
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[5, 10, 20, 30].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setQuestionCount(count);
                    // auto-adjust timer: ~1 min per question
                    setTimerMinutes(Math.max(5, count));
                  }}
                  id={`q-count-${count}`}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    questionCount === count
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg font-extrabold">{count}</span>
                  <span className="text-[11px] text-slate-500">
                    {count === 5 ? "Quick Check" : count === 10 ? "Standard" : count === 20 ? "Deep Review" : "Full Exam"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Difficulty Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Difficulty Level
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                { id: "easy" as DifficultyLevel, label: "Easy", desc: "Recall, key terms & definitions" },
                { id: "medium" as DifficultyLevel, label: "Medium", desc: "Conceptual application & reasoning" },
                { id: "hard" as DifficultyLevel, label: "Hard", desc: "In-depth synthesis & subtleties" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  id={`difficulty-${item.id}`}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    difficulty === item.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      item.id === "easy" ? "bg-emerald-500" : item.id === "medium" ? "bg-amber-500" : "bg-rose-500"
                    }`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 leading-snug">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Question Types */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Question Types
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { id: "all" as QuestionTypeFilter, title: "All Question Types", desc: "MCQ + True/False + Short Answer + Fill-in" },
                { id: "mcq" as QuestionTypeFilter, title: "Multiple Choice Only", desc: "Standard 4-option MCQs with distractors" },
                { id: "true_false" as QuestionTypeFilter, title: "True / False Only", desc: "Rapid verification of facts & concepts" },
                { id: "short_answer" as QuestionTypeFilter, title: "Short Answer & Fill-in", desc: "Active recall with key term identification" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setQuestionTypes(type.id)}
                  id={`qtype-${type.id}`}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    questionTypes === type.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-sm font-bold">{type.title}</span>
                  <span className="mt-0.5 text-[11px] text-slate-500">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Timer & Study Mode Options */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Timer & Feedback Options
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Timer Toggle */}
              <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Quiz Timer</p>
                    <p className="text-[11px] text-slate-500">
                      {timerEnabled ? `${timerMinutes} minutes allocated` : "Untimed self-paced mode"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {timerEnabled && (
                    <select
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 bg-white"
                      id="timer-duration-select"
                    >
                      <option value={5}>5 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                    </select>
                  )}
                  <input
                    type="checkbox"
                    checked={timerEnabled}
                    onChange={(e) => setTimerEnabled(e.target.checked)}
                    id="timer-toggle-checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Instant Feedback Toggle */}
              <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Instant Explanations</p>
                    <p className="text-[11px] text-slate-500">
                      {instantFeedback ? "Show explanation right after answering" : "Review only after submitting"}
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={(e) => setInstantFeedback(e.target.checked)}
                  id="feedback-toggle-checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button / Loading */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={isProcessing}
            id="start-generating-quiz-btn"
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 transition-all active:scale-98 ${
              isProcessing ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span>Generate Interactive Quiz ({questionCount} Questions)</span>
          </button>

          {isProcessing && (
            <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-center space-y-2 animate-pulse" id="processing-banner">
              <div className="flex items-center justify-center gap-2 text-indigo-800 font-bold text-sm">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span>{processingStep || "AI is synthesizing your quiz strictly from the notes..."}</span>
              </div>
              <p className="text-xs text-indigo-600">
                Grounding questions in source definitions, formulating plausible distractors, and verifying explanations...
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
