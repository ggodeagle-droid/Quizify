import React, { useState, useEffect } from "react";
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Shuffle,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  Undo2
} from "lucide-react";
import { Flashcard, FlashcardDeck } from "../types";
import { playSuccessSound, playIncorrectSound } from "../utils/audio";

interface FlashcardsViewProps {
  deck: FlashcardDeck | null;
  onGenerateFlashcards: () => void;
  isProcessing: boolean;
  soundEffects: boolean;
  hasNotes: boolean;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  deck,
  onGenerateFlashcards,
  isProcessing,
  soundEffects,
  hasNotes,
}) => {
  const [cards, setCards] = useState<Flashcard[]>(deck?.cards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "review_only">("all");

  useEffect(() => {
    if (deck?.cards) {
      setCards(deck.cards);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [deck]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const activeCards = filterMode === "review_only"
    ? cards.filter((c) => c.status === "review")
    : cards;

  const currentCard = activeCards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < activeCards.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activeCards.length - 1));
  };

  const handleMarkStatus = (status: "know" | "review") => {
    if (!currentCard) return;

    if (soundEffects) {
      if (status === "know") playSuccessSound();
      else playIncorrectSound();
    }

    setCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, status } : c))
    );

    // Auto advance to next card
    setTimeout(() => {
      handleNext();
    }, 200);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  };

  const handleResetProgress = () => {
    setIsFlipped(false);
    setCards((prev) => prev.map((c) => ({ ...c, status: "unseen" })));
    setCurrentIndex(0);
  };

  const knowCount = cards.filter((c) => c.status === "know").length;
  const reviewCount = cards.filter((c) => c.status === "review").length;
  const unseenCount = cards.filter((c) => !c.status || c.status === "unseen").length;

  if (!deck || cards.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
          <Layers className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            No Flashcard Deck Generated Yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {hasNotes
              ? "Convert your current notes directly into an active recall deck with spaced repetition cards."
              : "Paste your study notes or upload a document to generate an instant flashcard deck."}
          </p>
        </div>

        <button
          onClick={onGenerateFlashcards}
          disabled={isProcessing || !hasNotes}
          id="generate-deck-btn"
          className={`inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all ${
            isProcessing || !hasNotes ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{isProcessing ? "Synthesizing Flashcards..." : "Generate AI Flashcards from Notes"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
              {deck.subject || "Flashcards"}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {cards.length} Total Cards
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            {deck.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            title="Shuffle Cards"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>Shuffle</span>
          </button>
          <button
            onClick={handleResetProgress}
            title="Reset Card Progress"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Progress Metrics & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> {knowCount} Mastered
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <RefreshCw className="h-3.5 w-3.5" /> {reviewCount} To Review
          </span>
          <span className="text-slate-500 font-medium">
            {unseenCount} Remaining
          </span>
        </div>

        {reviewCount > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setFilterMode(filterMode === "all" ? "review_only" : "all");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`rounded-lg px-2.5 py-1 font-bold text-xs transition-colors ${
                filterMode === "review_only"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {filterMode === "review_only" ? "Showing Review Only" : `Practice "Review Again" (${reviewCount})`}
            </button>
          </div>
        )}
      </div>

      {/* 3D Flip Flashcard */}
      <div className="perspective-1000">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          id="active-flashcard"
          className={`relative min-h-[320px] sm:min-h-[360px] w-full cursor-pointer rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm transition-all duration-500 flex flex-col justify-between hover:shadow-md ${
            isFlipped ? "bg-indigo-50/20 border-indigo-200" : ""
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Card {currentIndex + 1} of {activeCards.length}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
              {currentCard?.topic || "Concept"}
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isFlipped ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {isFlipped ? "Back: Answer / Explanation" : "Front: Concept / Prompt"}
            </span>
          </div>

          {/* Card Body */}
          <div className="my-auto py-8 text-center space-y-4">
            {!isFlipped ? (
              <div className="space-y-3">
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed max-w-xl mx-auto">
                  {currentCard?.front}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  (Click card or press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 border">Space</kbd> to reveal answer)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg sm:text-xl font-bold text-indigo-950 leading-relaxed max-w-xl mx-auto">
                  {currentCard?.back}
                </p>
                <p className="text-xs font-medium text-indigo-600">
                  Based directly on your uploaded study notes
                </p>
              </div>
            )}
          </div>

          {/* Card Footer Hint */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Undo2 className="h-3.5 w-3.5" /> Tap anywhere to flip
            </span>
            {currentCard?.status && currentCard.status !== "unseen" && (
              <span
                className={`font-bold capitalize ${
                  currentCard.status === "know" ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                Marked: {currentCard.status === "know" ? "Mastered" : "Review Again"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            id="flashcard-prev-btn"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            id="flashcard-flip-btn"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCw className="h-4 w-4 text-indigo-600" />
            <span>Flip Card</span>
          </button>
          <button
            onClick={handleNext}
            id="flashcard-next-btn"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Knowledge Status Assessment Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => handleMarkStatus("review")}
            id="review-again-btn"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span>Review Again</span>
          </button>

          <button
            onClick={() => handleMarkStatus("know")}
            id="know-it-btn"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>I Know It</span>
          </button>
        </div>
      </div>
    </div>
  );
};
