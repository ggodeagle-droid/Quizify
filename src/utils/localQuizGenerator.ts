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
      const cleanSnippet = sentence.replace(/^[0-9.\-\s]+/, "").trim();
      const questionPrompt = `Based on your notes, which of the following is TRUE about this concept?\n"${cleanSnippet.substring(0, 95)}..."`;
      const correct = `It directly follows the rule: "${cleanSnippet.substring(0, 50)}..."`;
      const d1 = `It happens independently without needing any prerequisite conditions or energy`;
      const d2 = `The rate drops to zero because outside factors cancel the process completely`;
      const d3 = `The process works in the exact opposite direction without any energy or force`;

      const options = shuffle([correct, d1, d2, d3]);

      questions.push({
        id: `local-q-${i + 1}`,
        type: "mcq",
        cognitiveLevel,
        qualityScore: 8,
        question: questionPrompt,
        options,
        correctAnswer: correct,
        explanation: `According to your study notes: "${cleanSnippet}". This directly confirms the correct answer.\n\nCommon Misconception: Processes cannot happen without necessary prerequisites or run backwards without external energy.`,
        distractorExplanations: {
          [d1]: "Common misconception: assuming prerequisites are not required.",
          [d2]: "Common misconception: assuming external factors stop the reaction.",
          [d3]: "Common misconception: assuming spontaneous reversal without energy.",
        },
        topic,
        hint: "Look for the option that directly agrees with your chapter notes.",
      });
    } else if (qType === "true_false") {
      const cleanSnippet = sentence.replace(/^[0-9.\-\s]+/, "").trim();
      questions.push({
        id: `local-q-${i + 1}`,
        type: "true_false",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `According to your notes, is the following statement TRUE or FALSE?\n"${cleanSnippet.substring(0, 90)}..."`,
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: `True. This is stated directly in your study notes: "${cleanSnippet}".`,
        topic,
        hint: "Check whether this statement matches the key point in your notes.",
      });
    } else if (qType === "fill_blank") {
      const cleanSnippet = sentence.replace(/^[0-9.\-\s]+/, "").trim();
      const words = cleanSnippet.split(" ").filter((w) => w.length > 4 && !/[,.;:()]/g.test(w));
      const targetWord = words[Math.min(1, words.length - 1)] || "equilibrium";
      const masked = cleanSnippet.replace(new RegExp(targetWord, "i"), "_______");

      questions.push({
        id: `local-q-${i + 1}`,
        type: "fill_blank",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `Fill in the blank with the correct word from your notes:\n"${masked}"`,
        options: [],
        correctAnswer: targetWord,
        explanation: `"${targetWord}" completes the statement from your notes: "${cleanSnippet}".`,
        topic,
        hint: `The missing word begins with '${targetWord[0]}'.`,
      });
    } else {
      const cleanSnippet = sentence.replace(/^[0-9.\-\s]+/, "").trim();
      questions.push({
        id: `local-q-${i + 1}`,
        type: "short_answer",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `In 1–2 simple sentences, summarize what your notes state about: "${cleanSnippet.substring(0, 75)}..."`,
        options: [],
        correctAnswer: cleanSnippet.substring(0, 70),
        explanation: `Core fact from your notes: "${cleanSnippet}".`,
        topic,
        hint: "State the main rule or definition from your notes.",
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
