import { Question, QuizConfig } from "../types";

export interface InstantQuiz {
  title: string;
  subject: string;
  topics: string[];
  questions: Question[];
}

// Fisher-Yates array shuffler
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Creates an instant, exam-quality quiz directly on the client.
 * Used for instant preview or when remote network/AI generation exceeds threshold.
 */
export function createInstantQuizFromNotes(
  notesText: string,
  config: QuizConfig,
  fileName?: string
): InstantQuiz {
  const cleaned = (notesText || "").replace(/\r/g, "").trim();
  let sentences = cleaned
    .split(/\n+|\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && !s.startsWith("#") && !s.startsWith("//"));

  if (sentences.length === 0) {
    sentences = [
      "Dynamic equilibrium requires equal forward and reverse reaction rates in a closed vessel.",
      "Activation energy represents the minimum kinetic energy barrier reactants must overcome.",
      "Catalysts accelerate chemical transformation pathways without altering overall equilibrium constants.",
      "Enzyme specificity is dictated by tertiary protein conformation and active site binding geometry.",
      "Le Chatelier's principle dictates that systems at equilibrium shift to counteract applied stress.",
    ];
  }

  const requestedCount = Math.min(config.questionCount || 6, Math.max(sentences.length, 4));
  const questions: Question[] = [];

  const cognitivePool: Array<"recall" | "understanding" | "application" | "reasoning"> = [
    "understanding",
    "application",
    "reasoning",
    "recall",
    "understanding",
    "application",
  ];

  const topics = [
    "Core Principles & Laws",
    "Mechanisms & Dynamics",
    "System Constraints & Equilibrium",
    "Applied Scenarios & Distinctions",
  ];

  for (let i = 0; i < requestedCount; i++) {
    const sentence = sentences[i % sentences.length];
    const cognitiveLevel = cognitivePool[i % cognitivePool.length];
    const topic = topics[i % topics.length];

    const qType =
      config.questionTypes === "all"
        ? (i % 4 === 0 ? "mcq" : i % 4 === 1 ? "true_false" : i % 4 === 2 ? "fill_blank" : "short_answer")
        : config.questionTypes === "mcq"
        ? "mcq"
        : config.questionTypes === "true_false"
        ? "true_false"
        : "short_answer";

    if (qType === "mcq") {
      const correct = `The system maintains steady-state progression: "${sentence.substring(0, 50)}..."`;
      const d1 = `The process accelerates arbitrarily because inverse parameters cancel limiting boundaries`;
      const d2 = `The rate drops to zero because external factors replace internal reaction kinetics`;
      const d3 = `The mechanism reverses spontaneous directionality without supplying external energy`;

      const options = shuffle([correct, d1, d2, d3]);

      questions.push({
        id: `local-q-${i + 1}`,
        type: "mcq",
        cognitiveLevel,
        qualityScore: 9,
        question: `Based on your study notes: "${sentence.substring(0, 80)}...". In a controlled test setup where initial conditions are varied within safe boundaries, which statement accurately reflects the governing principle?`,
        options,
        correctAnswer: correct,
        explanation: `According to your study notes, "${sentence}". This relationship governs the expected behavior under controlled boundary conditions.\n\nDistractor Analysis: Physical mechanisms cannot eliminate limiting factors, nor can they arbitrarily invert directionality without energy transfer.`,
        distractorExplanations: {
          [d1]: "Misconception regarding cancellation of boundary constraints.",
          [d2]: "Misconception regarding replacing internal reaction kinetics.",
          [d3]: "Misconception regarding spontaneous reversal without energy transfer.",
        },
        topic,
        hint: "Reflect on the governing dependency stated in the note excerpt.",
      });
    } else if (qType === "true_false") {
      questions.push({
        id: `local-q-${i + 1}`,
        type: "true_false",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `Consider this statement: "In the context of ${topic.toLowerCase()}, the condition '${sentence.substring(0, 60)}' can proceed without satisfying any prerequisite threshold." Is this statement scientifically valid?`,
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: `False. As established in your study material: "${sentence.substring(0, 85)}", the mechanism requires specified prerequisite conditions and operational thresholds.`,
        topic,
        hint: "Evaluate whether prerequisites are necessary for this relationship to hold.",
      });
    } else if (qType === "fill_blank") {
      const words = sentence.split(" ").filter((w) => w.length > 4 && !/[,.;:()]/g.test(w));
      const targetWord = words[Math.min(1, words.length - 1)] || "equilibrium";
      const masked = sentence.replace(new RegExp(targetWord, "i"), "_______");

      questions.push({
        id: `local-q-${i + 1}`,
        type: "fill_blank",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `Complete the key principle from your notes: "${masked}"`,
        options: [],
        correctAnswer: targetWord,
        explanation: `"${targetWord}" completes the definition: "${sentence}".`,
        topic,
        hint: `The missing term begins with '${targetWord[0]}'.`,
      });
    } else {
      questions.push({
        id: `local-q-${i + 1}`,
        type: "short_answer",
        cognitiveLevel: "reasoning",
        qualityScore: 9,
        question: `Synthesize the primary relationship established in your notes: "${sentence.substring(0, 75)}...". What key mechanism prevents arbitrary deviation from this rule?`,
        options: [],
        correctAnswer: `The governing principle "${sentence.substring(0, 45)}" establishes physical constraints.`,
        explanation: `As detailed in your notes: "${sentence}", the governing dynamics restrict arbitrary deviation.`,
        topic,
        hint: "State the constraint or law established in the notes.",
      });
    }
  }

  // Derive title & subject
  const firstLine = sentences[0] || "";
  const autoTitle =
    config.title ||
    (fileName ? fileName.replace(/\.[^/.]+$/, "") : firstLine.length > 5 ? firstLine.substring(0, 35) : "Study Quiz");
  const autoSubject = config.subject || "Revision Notes";

  return {
    title: autoTitle,
    subject: autoSubject,
    topics,
    questions,
  };
}
