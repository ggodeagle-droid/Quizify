export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionTypeFilter = 'all' | 'mcq' | 'true_false' | 'short_answer';
export type CognitiveLevel = 'recall' | 'understanding' | 'application' | 'reasoning';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // 4 options for MCQ, or ['True', 'False'] for true_false
  correctAnswer: string;
  explanation: string;
  distractorExplanations?: Record<string, string> | string; // Explains why wrong options are incorrect
  topic?: string;
  hint?: string;
  cognitiveLevel?: CognitiveLevel;
  qualityScore?: number; // 0-10 internal exam quality score
}

export interface QuizConfig {
  title: string;
  subject: string;
  questionCount: number; // 5, 10, 20, 30
  difficulty: DifficultyLevel;
  questionTypes: QuestionTypeFilter;
  timerEnabled: boolean;
  timerMinutes: number;
  instantFeedback: boolean;
  studyLevel?: string;
  weakConcepts?: string[]; // Optional targeted concepts for adaptive re-quizzing
}

export interface QuizAttempt {
  id: string;
  quizTitle: string;
  subject: string;
  difficulty: DifficultyLevel;
  timestamp: number;
  totalQuestions: number;
  questions: Question[];
  userAnswers: Record<string, string>;
  score: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  topicPerformance: Record<string, { total: number; correct: number }>;
}

export interface Flashcard {
  id: string;
  front: string; // Question or Concept
  back: string; // Answer or Explanation
  topic?: string;
  status?: 'unseen' | 'know' | 'review';
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  createdAt: number;
  cards: Flashcard[];
}

export interface AppSettings {
  defaultQuestionCount: number;
  defaultDifficulty: DifficultyLevel;
  defaultQuestionTypes: QuestionTypeFilter;
  timerEnabled: boolean;
  timerMinutes: number;
  instantFeedback: boolean;
  studyLevel: string; // 'Class 9-10' | 'Class 11-12' | 'Competitive / College'
  soundEffects: boolean;
}

export type ActiveTab = 'home' | 'setup' | 'quiz' | 'results' | 'flashcards' | 'history' | 'settings';

export interface StudyBuddyAdvice {
  headline: string;
  struggledTopics: string[];
  recommendedSubtopics: string[];
  masteredTopics: string[];
  tips: string[];
  encouragement: string;
  recommendedAction: string;
  source?: 'ai' | 'heuristic';
}

export interface StudyBuddyMessage {
  id: string;
  sender: 'user' | 'buddy';
  text: string;
  timestamp: number;
}
