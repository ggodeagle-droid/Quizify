import { QuizAttempt, FlashcardDeck, AppSettings } from "../types";

const HISTORY_KEY = "quizify_quiz_history_v1";
const DECKS_KEY = "quizify_flashcard_decks_v1";
const SETTINGS_KEY = "quizify_settings_v1";
const DRAFT_NOTES_KEY = "quizify_draft_notes_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  defaultQuestionCount: 10,
  defaultDifficulty: "medium",
  defaultQuestionTypes: "all",
  timerEnabled: true,
  timerMinutes: 10,
  instantFeedback: true,
  studyLevel: "Class 11-12 / Competitive Exams",
  soundEffects: true,
};

export const SAMPLE_ATTEMPTS: QuizAttempt[] = [
  {
    id: "demo-attempt-1",
    quizTitle: "Cellular Respiration - Quick Check",
    subject: "Biology",
    difficulty: "easy",
    timestamp: Date.now() - 5 * 86400000 + 3600000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-cr-1",
        type: "mcq",
        question: "Where in the eukaryotic cell does glycolysis occur?",
        options: ["Cytoplasm (Cytosol)", "Mitochondrial Matrix", "Inner Membrane", "Nucleus"],
        correctAnswer: "Cytoplasm (Cytosol)",
        explanation: "Glycolysis takes place in the cytosol and does not require oxygen.",
        topic: "Glycolysis",
      },
    ],
    userAnswers: { "q-cr-1": "Cytoplasm (Cytosol)" },
    score: 6,
    percentage: 60,
    correctCount: 6,
    incorrectCount: 4,
    skippedCount: 0,
    timeTakenSeconds: 340,
    topicPerformance: { Glycolysis: { total: 4, correct: 3 }, "Krebs Cycle": { total: 6, correct: 3 } },
  },
  {
    id: "demo-attempt-2",
    quizTitle: "Newton's Laws of Motion - Fundamentals",
    subject: "Physics",
    difficulty: "medium",
    timestamp: Date.now() - 4 * 86400000 + 7200000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-nw-1",
        type: "mcq",
        question: "Which law defines force as the rate of change of momentum?",
        options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation"],
        correctAnswer: "Newton's Second Law",
        explanation: "Newton's second law mathematically states F = dp/dt = ma for constant mass.",
        topic: "Second Law",
      },
    ],
    userAnswers: { "q-nw-1": "Newton's Second Law" },
    score: 7,
    percentage: 70,
    correctCount: 7,
    incorrectCount: 3,
    skippedCount: 0,
    timeTakenSeconds: 410,
    topicPerformance: { "First Law": { total: 3, correct: 2 }, "Second Law": { total: 4, correct: 3 }, "Third Law": { total: 3, correct: 2 } },
  },
  {
    id: "demo-attempt-3",
    quizTitle: "Chemical Bonding & Molecular Shapes",
    subject: "Chemistry",
    difficulty: "medium",
    timestamp: Date.now() - 3 * 86400000 + 10800000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-cb-1",
        type: "mcq",
        question: "What is the bond angle in a regular tetrahedral methane molecule?",
        options: ["104.5°", "107.5°", "109.5°", "120°"],
        correctAnswer: "109.5°",
        explanation: "In methane (CH4), the four sp3 hybrid orbitals repel equally to form a 109.5° angle.",
        topic: "VSEPR Theory",
      },
    ],
    userAnswers: { "q-cb-1": "109.5°" },
    score: 7,
    percentage: 70,
    correctCount: 7,
    incorrectCount: 2,
    skippedCount: 1,
    timeTakenSeconds: 380,
    topicPerformance: { "Ionic Bonding": { total: 4, correct: 3 }, "VSEPR Theory": { total: 6, correct: 4 } },
  },
  {
    id: "demo-attempt-4",
    quizTitle: "Cold War & 20th Century Geopolitics",
    subject: "History",
    difficulty: "medium",
    timestamp: Date.now() - 2 * 86400000 + 14400000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-cw-1",
        type: "mcq",
        question: "Which alliance was established in 1949 by Western nations for collective defense?",
        options: ["Warsaw Pact", "NATO", "League of Nations", "SEATO"],
        correctAnswer: "NATO",
        explanation: "The North Atlantic Treaty Organization was founded in 1949.",
        topic: "Alliances",
      },
    ],
    userAnswers: { "q-cw-1": "NATO" },
    score: 8,
    percentage: 80,
    correctCount: 8,
    incorrectCount: 2,
    skippedCount: 0,
    timeTakenSeconds: 320,
    topicPerformance: { "Marshall Plan": { total: 5, correct: 4 }, Alliances: { total: 5, correct: 4 } },
  },
  {
    id: "demo-attempt-5",
    quizTitle: "Thermodynamics & Carnot Cycle",
    subject: "Physics",
    difficulty: "hard",
    timestamp: Date.now() - 1 * 86400000 + 18000000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-th-1",
        type: "mcq",
        question: "In an adiabatic expansion of an ideal gas, which quantity remains zero?",
        options: ["Work done (W)", "Heat transferred (Q)", "Change in internal energy (ΔU)", "Entropy change (ΔS)"],
        correctAnswer: "Heat transferred (Q)",
        explanation: "By definition, an adiabatic process has no heat exchange: Q = 0.",
        topic: "Adiabatic Processes",
      },
    ],
    userAnswers: { "q-th-1": "Heat transferred (Q)" },
    score: 8,
    percentage: 80,
    correctCount: 8,
    incorrectCount: 2,
    skippedCount: 0,
    timeTakenSeconds: 460,
    topicPerformance: { "First Law": { total: 4, correct: 3 }, "Carnot Engines": { total: 6, correct: 5 } },
  },
  {
    id: "demo-attempt-6",
    quizTitle: "Newton's Laws - Friction & Inclines",
    subject: "Physics",
    difficulty: "hard",
    timestamp: Date.now() - 12 * 3600000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-nw-2",
        type: "mcq",
        question: "What is the acceleration of a block sliding down a frictionless incline of angle θ?",
        options: ["g sin θ", "g cos θ", "g tan θ", "g / sin θ"],
        correctAnswer: "g sin θ",
        explanation: "The component of gravitational force along the incline is mg sin θ, yielding an acceleration of g sin θ.",
        topic: "Inclined Planes",
      },
    ],
    userAnswers: { "q-nw-2": "g sin θ" },
    score: 9,
    percentage: 90,
    correctCount: 9,
    incorrectCount: 1,
    skippedCount: 0,
    timeTakenSeconds: 390,
    topicPerformance: { Friction: { total: 5, correct: 4 }, "Inclined Planes": { total: 5, correct: 5 } },
  },
  {
    id: "demo-attempt-7",
    quizTitle: "Cellular Respiration - Mastery & ATP Yield",
    subject: "Biology",
    difficulty: "hard",
    timestamp: Date.now() - 2 * 3600000,
    totalQuestions: 10,
    questions: [
      {
        id: "q-cr-2",
        type: "mcq",
        question: "Which complex in the electron transport chain transfers electrons directly to oxygen?",
        options: ["Complex I", "Complex II", "Complex III", "Complex IV (Cytochrome c Oxidase)"],
        correctAnswer: "Complex IV (Cytochrome c Oxidase)",
        explanation: "Complex IV catalyzes the reduction of O2 to water in aerobic respiration.",
        topic: "Oxidative Phosphorylation",
      },
    ],
    userAnswers: { "q-cr-2": "Complex IV (Cytochrome c Oxidase)" },
    score: 10,
    percentage: 100,
    correctCount: 10,
    incorrectCount: 0,
    skippedCount: 0,
    timeTakenSeconds: 310,
    topicPerformance: { "Krebs Cycle": { total: 4, correct: 4 }, "Oxidative Phosphorylation": { total: 6, correct: 6 } },
  },
];

export function loadHistory(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      // Seed with initial realistic study attempts so performance charts and analytics render immediately
      localStorage.setItem(HISTORY_KEY, JSON.stringify(SAMPLE_ATTEMPTS));
      return SAMPLE_ATTEMPTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load quiz history:", err);
    return SAMPLE_ATTEMPTS;
  }
}

export function seedSampleHistory(): QuizAttempt[] {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(SAMPLE_ATTEMPTS));
    return SAMPLE_ATTEMPTS;
  } catch (err) {
    console.warn("Failed to seed sample history:", err);
    return SAMPLE_ATTEMPTS;
  }
}

export function saveQuizAttempt(attempt: QuizAttempt): void {
  try {
    const history = loadHistory();
    // Prepend new attempt, keep up to 50 items
    const updated = [attempt, ...history.filter((h) => h.id !== attempt.id)].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save quiz attempt:", err);
  }
}

export function deleteQuizAttempt(id: string): QuizAttempt[] {
  try {
    const history = loadHistory().filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (err) {
    console.warn("Failed to delete quiz attempt:", err);
    return [];
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.warn("Failed to clear history:", err);
  }
}

export function loadFlashcardDecks(): FlashcardDeck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load flashcard decks:", err);
    return [];
  }
}

export function saveFlashcardDeck(deck: FlashcardDeck): void {
  try {
    const decks = loadFlashcardDecks();
    const updated = [deck, ...decks.filter((d) => d.id !== deck.id)].slice(0, 30);
    localStorage.setItem(DECKS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save flashcard deck:", err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save settings:", err);
  }
}

export function loadDraftNotes(): { text: string; fileName?: string } {
  try {
    const raw = localStorage.getItem(DRAFT_NOTES_KEY);
    if (!raw) return { text: "" };
    return JSON.parse(raw);
  } catch (err) {
    return { text: "" };
  }
}

export function saveDraftNotes(data: { text: string; fileName?: string }): void {
  try {
    localStorage.setItem(DRAFT_NOTES_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save draft notes:", err);
  }
}
