import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Send,
  Sparkles,
  BookOpen,
  Pause,
  Play,
  RotateCcw
} from "lucide-react";
import { Question, QuizConfig } from "../types";
import { playSuccessSound, playIncorrectSound } from "../utils/audio";
import { checkIsAnswerCorrect, getSafeNormalizedString } from "../utils/answerUtils";
import { DistractorExplanationView } from "./DistractorExplanationView";

interface QuizViewProps {
  quizTitle: string;
  subject: string;
  questions: Question[];
  config: QuizConfig;
  userAnswers: Record<string, string>;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmitQuiz: (timeTakenSeconds: number) => void;
  onExitQuiz: () => void;
  soundEffects: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quizTitle,
  subject,
  questions,
  config,
  userAnswers,
  setUserAnswers,
  onSubmitQuiz,
  onExitQuiz,
  soundEffects,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Timer state
  const totalAllocatedSeconds = (config.timerMinutes || 10) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalAllocatedSeconds);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentAnswer = userAnswers[currentQ?.id] || "";

  // Synchronize short answer input when changing question
  useEffect(() => {
    setShowHint(false);
    if (currentQ) {
      setShortAnswerInput(userAnswers[currentQ.id] || "");
    }
  }, [currentIndex, currentQ]);

  // Timer countdown
  useEffect(() => {
    if (!config.timerEnabled || isTimerPaused) return;

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit when time expires
          onSubmitQuiz(totalAllocatedSeconds);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.timerEnabled, isTimerPaused, totalAllocatedSeconds, onSubmitQuiz]);

  if (!currentQ) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-slate-600">No questions available in this quiz.</p>
        <button
          onClick={onExitQuiz}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleSelectOption = (option: string) => {
    if (userAnswers[currentQ.id]) {
      // If already answered and instant feedback is on, prevent overriding or allow changing
      return;
    }

    const isCorrect = checkIsAnswerCorrect(option, currentQ.correctAnswer);
    if (soundEffects) {
      if (isCorrect) playSuccessSound();
      else playIncorrectSound();
    }

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: option,
    }));
  };

  const handleTextAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortAnswerInput.trim()) return;

    const trimmed = shortAnswerInput.trim();
    const isCorrect = checkIsAnswerCorrect(trimmed, currentQ.correctAnswer);

    if (soundEffects) {
      if (isCorrect) playSuccessSound();
      else playIncorrectSound();
    }

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: trimmed,
    }));
  };

  // Helper formatting for timer mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isAnswered = !!currentAnswer;
  const isCorrect = isAnswered && checkIsAnswerCorrect(currentAnswer, currentQ.correctAnswer);
  const normalizedCorrect = getSafeNormalizedString(currentQ.correctAnswer);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Bar: Title, Subject, Timer, Exit */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
              {subject || "Quiz"}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 capitalize">
              {config.difficulty} Mode
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {quizTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Display */}
          {config.timerEnabled && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-extrabold border transition-colors ${
                secondsRemaining < 60
                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTime(secondsRemaining)}</span>
              <button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                title={isTimerPaused ? "Resume Timer" : "Pause Timer"}
                className="text-slate-400 hover:text-slate-700 ml-1"
              >
                {isTimerPaused ? <Play className="h-3.5 w-3.5 text-emerald-600" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to exit the quiz? Unsaved progress will be lost.")) {
                onExitQuiz();
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress Bar & Indicators */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Question <span className="text-indigo-600 font-extrabold">{currentIndex + 1}</span> of {totalQuestions}
          </span>
          <span>
            {answeredCount} of {totalQuestions} answered ({Math.round((answeredCount / totalQuestions) * 100)}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6" id="active-question-card">
        {/* Question Header & Subtopic & Cognitive Level */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {currentQ.type === "mcq"
                ? "Multiple Choice"
                : currentQ.type === "true_false"
                ? "True or False"
                : currentQ.type === "fill_blank"
                ? "Fill in the Blank"
                : "Short Answer"}
            </span>

            {currentQ.cognitiveLevel && (
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize ${
                  currentQ.cognitiveLevel === "reasoning"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : currentQ.cognitiveLevel === "application"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : currentQ.cognitiveLevel === "understanding"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-800 border border-slate-200"
                }`}
                title={`Cognitive Level: ${currentQ.cognitiveLevel}`}
              >
                {currentQ.cognitiveLevel === "reasoning"
                  ? "🧠 Higher-Order Reasoning"
                  : currentQ.cognitiveLevel === "application"
                  ? "⚙️ Application"
                  : currentQ.cognitiveLevel === "understanding"
                  ? "💡 Understanding"
                  : "📖 Recall"}
              </span>
            )}
          </div>

          {currentQ.topic && (
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md">
              Topic: {currentQ.topic}
            </span>
          )}
        </div>

        {/* Question Prompt */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug" id="question-text">
            {currentQ.question}
          </h3>
        </div>

        {/* Hint Disclosure */}
        {currentQ.hint && (
          <div>
            {!showHint ? (
              <button
                onClick={() => setShowHint(true)}
                id="show-hint-btn"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Need a hint?</span>
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Hint:</strong> {currentQ.hint}</span>
              </div>
            )}
          </div>
        )}

        {/* 1. Multiple Choice Options */}
        {currentQ.type === "mcq" && (
          <div className="grid grid-cols-1 gap-3 sm:gap-3.5" id="mcq-options-container">
            {currentQ.options?.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = currentAnswer === option;
              const isOptionCorrect = checkIsAnswerCorrect(option, currentQ.correctAnswer);

              // If instant feedback is active and user answered
              let optionStyle = "border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 text-slate-800";
              let badgeStyle = "bg-white border-slate-200 text-slate-700";

              if (isAnswered && config.instantFeedback) {
                if (isOptionCorrect) {
                  optionStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20";
                  badgeStyle = "bg-emerald-600 text-white border-emerald-600";
                } else if (isSelected && !isOptionCorrect) {
                  optionStyle = "border-rose-400 bg-rose-50/80 text-rose-950 ring-2 ring-rose-400/20";
                  badgeStyle = "bg-rose-600 text-white border-rose-600";
                } else {
                  optionStyle = "border-slate-200 bg-slate-50/30 text-slate-400 opacity-60";
                }
              } else if (isSelected) {
                optionStyle = "border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-600/20 font-bold";
                badgeStyle = "bg-indigo-600 text-white border-indigo-600";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswered && config.instantFeedback}
                  id={`mcq-option-${letter}`}
                  className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${optionStyle}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${badgeStyle}`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed pt-0.5">
                    {option}
                  </span>
                  {isAnswered && config.instantFeedback && isOptionCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 ml-auto mt-0.5" />
                  )}
                  {isAnswered && config.instantFeedback && isSelected && !isOptionCorrect && (
                    <XCircle className="h-5 w-5 text-rose-600 shrink-0 ml-auto mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. True / False Options */}
        {currentQ.type === "true_false" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" id="tf-options-container">
            {["True", "False"].map((choice) => {
              const isSelected = String(currentAnswer).toLowerCase() === choice.toLowerCase();
              const isChoiceCorrect = choice.toLowerCase() === normalizedCorrect;

              let choiceStyle = "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-800";

              if (isAnswered && config.instantFeedback) {
                if (isChoiceCorrect) {
                  choiceStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20";
                } else if (isSelected && !isChoiceCorrect) {
                  choiceStyle = "border-rose-400 bg-rose-50/80 text-rose-950 ring-2 ring-rose-400/20";
                } else {
                  choiceStyle = "border-slate-200 bg-slate-50/30 text-slate-400 opacity-60";
                }
              } else if (isSelected) {
                choiceStyle = "border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-600/20 font-bold";
              }

              return (
                <button
                  key={choice}
                  onClick={() => handleSelectOption(choice)}
                  disabled={isAnswered && config.instantFeedback}
                  id={`tf-choice-${choice.toLowerCase()}`}
                  className={`flex items-center justify-center gap-3 rounded-xl border p-5 text-center font-bold text-base transition-all ${choiceStyle}`}
                >
                  <span>{choice}</span>
                  {isAnswered && config.instantFeedback && isChoiceCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  {isAnswered && config.instantFeedback && isSelected && !isChoiceCorrect && (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Short Answer & Fill in the Blank Inputs */}
        {(currentQ.type === "short_answer" || currentQ.type === "fill_blank") && (
          <form onSubmit={handleTextAnswerSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Your Answer
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  disabled={isAnswered && config.instantFeedback}
                  placeholder={
                    currentQ.type === "fill_blank"
                      ? "Type the missing word or phrase..."
                      : "Type your answer based on the notes..."
                  }
                  id="short-answer-input"
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {(!isAnswered || !config.instantFeedback) && (
                  <button
                    type="submit"
                    disabled={!shortAnswerInput.trim()}
                    id="submit-answer-btn"
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>Submit</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Instant Feedback Explanation Box */}
        {isAnswered && config.instantFeedback && (
          <div
            className={`rounded-xl border p-4 sm:p-5 transition-all space-y-3 ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                : "border-amber-200 bg-amber-50/70 text-amber-950"
            }`}
            id="instant-explanation-box"
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 text-xs sm:text-sm flex-1">
                <p className="font-extrabold text-sm sm:text-base">
                  {isCorrect ? "Correct! Well done." : `Not quite. Correct answer: "${String(currentQ.correctAnswer)}"`}
                </p>
                <div className="rounded-lg bg-white/90 p-3 border border-slate-200/80 text-slate-800 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                    <span>💡 Teaching Explanation:</span>
                  </p>
                  <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                    {currentQ.explanation}
                  </p>
                  <DistractorExplanationView distractorExplanations={currentQ.distractorExplanations} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          id="quiz-prev-btn"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {/* Question Palette Dropdown / Jumper */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-1">
          {questions.map((q, idx) => {
            const hasAns = !!userAnswers[q.id];
            const isCurr = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isCurr
                    ? "bg-indigo-600 text-white shadow-xs scale-105 ring-2 ring-indigo-600/30"
                    : hasAns
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title={`Jump to Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              id="quiz-next-btn"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitModal(true)}
              id="quiz-submit-btn"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Ready to Submit Your Quiz?
            </h3>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs sm:text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unanswered / Skipped:</span>
                <span className="font-bold text-amber-600">
                  {totalQuestions - answeredCount}
                </span>
              </div>
              {config.timerEnabled && (
                <div className="flex justify-between">
                  <span>Time Remaining:</span>
                  <span className="font-bold">{formatTime(secondsRemaining)}</span>
                </div>
              )}
            </div>

            {totalQuestions - answeredCount > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>You have {totalQuestions - answeredCount} unanswered questions. They will be marked as skipped.</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Quiz
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  onSubmitQuiz(secondsElapsed);
                }}
                id="confirm-submit-quiz-btn"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm"
              >
                Confirm & View Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
