import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { HomeView } from "./components/HomeView";
import { QuizSetupView } from "./components/QuizSetupView";
import { QuizView } from "./components/QuizView";
import { ResultsView } from "./components/ResultsView";
import { FlashcardsView } from "./components/FlashcardsView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import {
  ActiveTab,
  Question,
  QuizConfig,
  QuizAttempt,
  FlashcardDeck,
  AppSettings,
} from "./types";
import {
  loadHistory,
  saveQuizAttempt,
  deleteQuizAttempt,
  clearHistory,
  seedSampleHistory,
  loadFlashcardDecks,
  saveFlashcardDeck,
  loadSettings,
  saveSettings,
  loadDraftNotes,
  saveDraftNotes,
  DEFAULT_SETTINGS,
} from "./utils/storage";
import { createInstantQuizFromNotes } from "./utils/localQuizGenerator";
import { AlertCircle, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);

  // Notes & file inputs
  const [notesText, setNotesText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    base64: string;
    previewUrl?: string;
  } | null>(null);

  // Active Quiz State
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    title: "",
    subject: "",
    questionCount: 10,
    difficulty: "medium",
    questionTypes: "all",
    timerEnabled: true,
    timerMinutes: 10,
    instantFeedback: true,
    studyLevel: "Class 11-12 / Competitive Exams",
  });

  const [activeQuiz, setActiveQuiz] = useState<{
    title: string;
    subject: string;
    questions: Question[];
  } | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  // Processing & UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "error" | "info" } | null>(null);

  // Initialize storage on mount
  useEffect(() => {
    const loadedSettings = loadSettings();
    const loadedHist = loadHistory();
    const loadedDecks = loadFlashcardDecks();
    const draft = loadDraftNotes();

    setSettings(loadedSettings);
    setHistory(loadedHist);
    setFlashcardDecks(loadedDecks);
    if (loadedDecks.length > 0) {
      setActiveDeck(loadedDecks[0]);
    }
    if (draft.text) {
      setNotesText(draft.text);
    }

    // Sync default config with settings
    setQuizConfig((prev) => ({
      ...prev,
      questionCount: loadedSettings.defaultQuestionCount,
      difficulty: loadedSettings.defaultDifficulty,
      questionTypes: loadedSettings.defaultQuestionTypes,
      timerEnabled: loadedSettings.timerEnabled,
      timerMinutes: loadedSettings.timerMinutes,
      instantFeedback: loadedSettings.instantFeedback,
      studyLevel: loadedSettings.studyLevel,
    }));
  }, []);

  // Save draft notes automatically
  useEffect(() => {
    if (notesText) {
      saveDraftNotes({ text: notesText });
    }
  }, [notesText]);

  const showToast = (text: string, type: "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Generate Quiz Handler (Fast & Smooth with seamless fallback)
  const handleGenerateQuiz = async (config: QuizConfig, isQuick = false) => {
    if (!notesText.trim() && !uploadedFile) {
      showToast("Please provide study notes or upload a file first.", "error");
      return;
    }

    setIsProcessing(true);
    setQuizConfig(config);
    setProcessingStep("Reading study material and extracting concepts...");

    const stepTimer = setTimeout(() => {
      setProcessingStep("Formulating exam-caliber questions...");
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setProcessingStep("Finalizing options & high-yield explanations...");
    }, 3500);

    const abortController = new AbortController();
    const timeoutDuration = isQuick ? 9000 : 16000;
    const timeoutId = setTimeout(() => abortController.abort(), timeoutDuration);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          notesText,
          fileData: uploadedFile
            ? {
                base64: uploadedFile.base64,
                mimeType: uploadedFile.mimeType,
                fileName: uploadedFile.name,
              }
            : undefined,
          config,
        }),
      });

      clearTimeout(timeoutId);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions returned by server.");
      }

      setActiveQuiz({
        title: data.title || config.title || "Interactive Study Quiz",
        subject: data.subject || config.subject || "Study Notes",
        questions: data.questions,
      });
      setUserAnswers({});
      setIsProcessing(false);
      setActiveTab("quiz");
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      console.warn("Server generation delayed or failed, switching to instant generator:", err);

      // Seamless Instant Local Generation: Guarantees user gets questions immediately with zero stalling
      try {
        const instantQuiz = createInstantQuizFromNotes(notesText, config, uploadedFile?.name);
        if (instantQuiz && instantQuiz.questions.length > 0) {
          setActiveQuiz(instantQuiz);
          setUserAnswers({});
          setIsProcessing(false);
          setActiveTab("quiz");
          showToast("⚡ Questions ready! Smoothly synthesized from your notes.", "info");
          return;
        }
      } catch (fallbackErr) {
        console.error("Local quiz generator error:", fallbackErr);
      }

      showToast("Unable to generate quiz. Please check your notes text.", "error");
      setIsProcessing(false);
    }
  };

  // 1b. Instant 1-Click Quick Quiz (5 Questions)
  const handleQuickQuiz = async () => {
    const quickConfig: QuizConfig = {
      ...quizConfig,
      questionCount: 5,
      title: quizConfig.title || (uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "Quick Check Quiz"),
      timerMinutes: 5,
    };
    await handleGenerateQuiz(quickConfig, true);
  };

  // 2. Generate Flashcards directly from notes
  const handleGenerateFlashcards = async () => {
    if (!notesText.trim() && !uploadedFile) {
      showToast("Please provide study notes or upload a file first.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText,
          fileData: uploadedFile
            ? {
                base64: uploadedFile.base64,
                mimeType: uploadedFile.mimeType,
                fileName: uploadedFile.name,
              }
            : undefined,
          count: 12,
          title: quizConfig.title || "Study Flashcards",
          subject: quizConfig.subject || "Revision Notes",
        }),
      });

      const data = await response.json();
      if (!data.cards || data.cards.length === 0) {
        throw new Error("No flashcards could be generated from the given material.");
      }

      const newDeck: FlashcardDeck = {
        id: `deck-${Date.now()}`,
        title: data.title || "Study Flashcards",
        subject: data.subject || "Key Concepts",
        createdAt: Date.now(),
        cards: data.cards,
      };

      saveFlashcardDeck(newDeck);
      setFlashcardDecks((prev) => [newDeck, ...prev]);
      setActiveDeck(newDeck);
      setIsProcessing(false);
      setActiveTab("flashcards");
    } catch (err: any) {
      console.error("Flashcards generation error:", err);
      showToast(err.message || "Could not generate flashcards.", "error");
      setIsProcessing(false);
    }
  };

  // Adaptive Quiz Generator for Weak Concepts
  const handleLaunchAdaptiveQuiz = (weakConcepts: string[]) => {
    const adaptiveConfig: QuizConfig = {
      ...quizConfig,
      title: `${activeQuiz?.title || "Revision"} - Targeted Focus Quiz`,
      questionCount: Math.min(8, Math.max(4, (weakConcepts.length || 2) * 2)),
      weakConcepts: weakConcepts.length > 0 ? weakConcepts : undefined,
    };
    setQuizConfig(adaptiveConfig);
    showToast(
      `🎯 Generating adaptive exam questions targeting: ${weakConcepts.length > 0 ? weakConcepts.join(", ") : "your review areas"}...`,
      "info"
    );
    handleGenerateQuiz(adaptiveConfig);
  };

  // 3. Quiz submission handler
  const handleSubmitQuiz = (timeTakenSeconds: number) => {
    if (!activeQuiz) return;

    const questions = activeQuiz.questions;
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    const topicPerformance: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      const topic = q.topic || "General";
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { total: 0, correct: 0 };
      }
      topicPerformance[topic].total += 1;

      const userAns = userAnswers[q.id];
      if (!userAns) {
        skippedCount += 1;
      } else {
        const isCorrect =
          userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
          userAns.trim().toLowerCase().includes(q.correctAnswer.trim().toLowerCase());

        if (isCorrect) {
          correctCount += 1;
          topicPerformance[topic].correct += 1;
        } else {
          incorrectCount += 1;
        }
      }
    });

    const score = correctCount;
    const percentage = Math.round((correctCount / questions.length) * 100);

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizTitle: activeQuiz.title,
      subject: activeQuiz.subject,
      difficulty: quizConfig.difficulty,
      timestamp: Date.now(),
      totalQuestions: questions.length,
      questions,
      userAnswers,
      score,
      percentage,
      correctCount,
      incorrectCount,
      skippedCount,
      timeTakenSeconds: Math.max(1, timeTakenSeconds),
      topicPerformance,
    };

    saveQuizAttempt(attempt);
    setHistory((prev) => [attempt, ...prev.filter((h) => h.id !== attempt.id)]);
    setLatestAttempt(attempt);
    setActiveTab("results");
  };

  // 4. Retry same quiz
  const handleRetryQuiz = () => {
    setUserAnswers({});
    setActiveTab("quiz");
  };

  // 5. Retake quiz from history
  const handleRetakeFromHistory = (attempt: QuizAttempt) => {
    setActiveQuiz({
      title: attempt.quizTitle,
      subject: attempt.subject,
      questions: attempt.questions,
    });
    setQuizConfig((prev) => ({
      ...prev,
      difficulty: attempt.difficulty,
      questionCount: attempt.totalQuestions,
      title: attempt.quizTitle,
      subject: attempt.subject,
    }));
    setUserAnswers({});
    setActiveTab("quiz");
  };

  // 6. Convert quiz questions directly to a flashcard deck
  const handleConvertQuizToFlashcards = (customQuestions?: Question[]) => {
    if (!latestAttempt) return;

    const sourceQuestions =
      customQuestions && customQuestions.length > 0
        ? customQuestions
        : latestAttempt.questions;

    const isMissedSubset =
      customQuestions && customQuestions.length < latestAttempt.questions.length;

    const cards = sourceQuestions.map((q, idx) => ({
      id: `quiz-fc-${idx + 1}`,
      front: q.question,
      back: `${q.correctAnswer}\n\nExplanation: ${q.explanation}`,
      topic: q.topic,
      status: "unseen" as const,
    }));

    const deck: FlashcardDeck = {
      id: `quiz-deck-${Date.now()}`,
      title: isMissedSubset
        ? `${latestAttempt.quizTitle} (Missed Focus)`
        : `${latestAttempt.quizTitle} Cards`,
      subject: latestAttempt.subject,
      createdAt: Date.now(),
      cards,
    };

    saveFlashcardDeck(deck);
    setFlashcardDecks((prev) => [deck, ...prev]);
    setActiveDeck(deck);
    setActiveTab("flashcards");
    if (isMissedSubset) {
      showToast(`Created targeted flashcards with ${cards.length} focus questions!`, "info");
    }
  };

  // 7. Delete an item from history
  const handleDeleteAttempt = (id: string) => {
    const updated = deleteQuizAttempt(id);
    setHistory(updated);
    if (latestAttempt?.id === id) {
      setLatestAttempt(null);
    }
  };

  // 8. Clear entire history
  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setLatestAttempt(null);
  };

  // 8b. Seed sample quiz history for immediate demonstration
  const handleSeedSampleHistory = () => {
    const samples = seedSampleHistory();
    setHistory(samples);
    showToast("Loaded 7 demo quiz sessions with progress trajectory!", "info");
  };

  // 9. Save app settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    setQuizConfig((prev) => ({
      ...prev,
      questionCount: newSettings.defaultQuestionCount,
      difficulty: newSettings.defaultDifficulty,
      questionTypes: newSettings.defaultQuestionTypes,
      timerEnabled: newSettings.timerEnabled,
      timerMinutes: newSettings.timerMinutes,
      instantFeedback: newSettings.instantFeedback,
      studyLevel: newSettings.studyLevel,
    }));
  };

  // 10. Clear all local data
  const handleClearAllData = () => {
    clearHistory();
    setHistory([]);
    setLatestAttempt(null);
    setFlashcardDecks([]);
    setActiveDeck(null);
    setNotesText("");
    setUploadedFile(null);
    setActiveTab("home");
    showToast("All stored history and flashcard decks have been reset.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl p-4 text-xs sm:text-sm font-semibold shadow-lg transition-all animate-bounce ${
            toastMessage.type === "error"
              ? "bg-rose-600 text-white shadow-rose-600/30"
              : "bg-slate-900 text-white shadow-slate-900/30"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Header / Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveQuiz={!!activeQuiz && activeTab !== "results"}
        hasResults={!!latestAttempt}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === "home" && (
          <HomeView
            notesText={notesText}
            setNotesText={setNotesText}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            onProceedToSetup={() => setActiveTab("setup")}
            onQuickQuiz={handleQuickQuiz}
            onDirectFlashcards={handleGenerateFlashcards}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === "setup" && (
          <QuizSetupView
            notesText={notesText}
            uploadedFileName={uploadedFile?.name}
            initialConfig={quizConfig}
            onGenerateQuiz={handleGenerateQuiz}
            onBack={() => setActiveTab("home")}
            isProcessing={isProcessing}
            processingStep={processingStep}
          />
        )}

        {activeTab === "quiz" && activeQuiz && (
          <QuizView
            quizTitle={activeQuiz.title}
            subject={activeQuiz.subject}
            questions={activeQuiz.questions}
            config={quizConfig}
            userAnswers={userAnswers}
            setUserAnswers={setUserAnswers}
            onSubmitQuiz={handleSubmitQuiz}
            onExitQuiz={() => setActiveTab("home")}
            soundEffects={settings.soundEffects}
          />
        )}

        {activeTab === "results" && latestAttempt && (
          <ResultsView
            attempt={latestAttempt}
            onRetryQuiz={handleRetryQuiz}
            onNewQuiz={() => {
              setActiveQuiz(null);
              setUserAnswers({});
              setActiveTab("home");
            }}
            onConvertToFlashcards={handleConvertQuizToFlashcards}
            onLaunchAdaptiveQuiz={handleLaunchAdaptiveQuiz}
            soundEffects={settings.soundEffects}
          />
        )}

        {activeTab === "flashcards" && (
          <FlashcardsView
            deck={activeDeck}
            onGenerateFlashcards={handleGenerateFlashcards}
            isProcessing={isProcessing}
            soundEffects={settings.soundEffects}
            hasNotes={notesText.trim().length > 20 || !!uploadedFile}
          />
        )}

        {activeTab === "history" && (
          <HistoryView
            history={history}
            onOpenAttempt={(attempt) => {
              setLatestAttempt(attempt);
              setActiveTab("results");
            }}
            onRetakeAttempt={handleRetakeFromHistory}
            onDeleteAttempt={handleDeleteAttempt}
            onClearAll={handleClearHistory}
            onGoToHome={() => setActiveTab("home")}
            onSeedSampleHistory={handleSeedSampleHistory}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            <strong>Quizify AI</strong> — Grounded revision & test synthesis for Class 9-12 and competitive exams.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab("home")} className="hover:text-indigo-600">
              New Quiz
            </button>
            <button onClick={() => setActiveTab("flashcards")} className="hover:text-indigo-600">
              Flashcards
            </button>
            <button onClick={() => setActiveTab("history")} className="hover:text-indigo-600">
              History
            </button>
            <button onClick={() => setActiveTab("settings")} className="hover:text-indigo-600">
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
