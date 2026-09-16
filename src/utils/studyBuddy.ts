import { QuizAttempt, StudyBuddyAdvice, StudyBuddyMessage } from "../types";
import { checkIsAnswerCorrect } from "./answerUtils";

// Subject-specific common subtopics dictionary for intelligent enrichment
const TOPIC_SUBTOPIC_MAP: Record<string, string[]> = {
  chemistry: [
    "Reaction Mechanisms & Electron Pushing",
    "Carbocation & Intermediate Stability",
    "Stereochemistry (Chirality & Enantiomers)",
    "Thermodynamics vs Kinetics",
    "Spectroscopy & Molecular Identification",
  ],
  "organic chemistry": [
    "Electrophilic Addition & Markovnikov's Rule",
    "Nucleophilic Substitution (SN1 vs SN2)",
    "Elimination Reactions (E1 vs E2)",
    "Resonance Stabilization & Inductive Effects",
    "Aromaticity & Hückel's Rule",
  ],
  physics: [
    "Free-Body Diagrams & Vector Resolution",
    "Conservation of Energy & Momentum",
    "Frictional Forces & Inclined Planes",
    "Rotational Dynamics & Torque",
    "Thermodynamic Cycles & Heat Engines",
  ],
  biology: [
    "Cellular Respiration & Glycolysis Steps",
    "Krebs Cycle & Electron Transport Chain",
    "Enzyme Kinetics & Allosteric Regulation",
    "Photosynthesis Light-Dependent Reactions",
    "DNA Replication & Polymerase Function",
  ],
  history: [
    "Chronological Timeline of Key Treaties",
    "Socio-Economic Causes of the Conflict",
    "Geopolitical Alliance Formations",
    "Primary Source Document Analysis",
    "Post-War Reconstruction & Cold War Impact",
  ],
  mathematics: [
    "Integration by Parts & Substitution",
    "Differential Equation Modeling",
    "Matrix Transformations & Eigenvalues",
    "Optimization & Boundary Extremes",
    "Probability Distributions & Bayes Theorem",
  ],
};

function getRelevantSubtopics(subject: string, topics: string[], missedQuestions: any[]): string[] {
  const normSubject = (subject || "").toLowerCase();
  const subtopics = new Set<string>();

  // 1. Check known subject maps
  for (const [key, list] of Object.entries(TOPIC_SUBTOPIC_MAP)) {
    if (normSubject.includes(key) || topics.some((t) => t.toLowerCase().includes(key))) {
      list.forEach((st) => subtopics.add(st));
    }
  }

  // 2. Extract keywords from missed question topics
  for (const q of missedQuestions) {
    if (q.topic) {
      subtopics.add(`Deep Dive: ${q.topic} Fundamentals`);
      subtopics.add(`Problem Solving in ${q.topic}`);
    }
  }

  // 3. Fallback generic educational subtopics if needed
  if (subtopics.size === 0) {
    topics.forEach((t) => {
      subtopics.add(`${t} Core Principles`);
      subtopics.add(`Application & Case Studies in ${t}`);
    });
    subtopics.add("Conceptual Foundations & Definitions");
    subtopics.add("Common Pitfalls & Exam Traps");
  }

  return Array.from(subtopics).slice(0, 4);
}

export function generateHeuristicAdvice(attempt: QuizAttempt): StudyBuddyAdvice {
  const { totalQuestions, score, percentage, topicPerformance, questions, userAnswers, subject } = attempt;

  // Identify missed questions
  const missedQuestions = questions.filter((q) => {
    const u = userAnswers[q.id];
    if (!u || String(u).trim() === "") return true;
    return !checkIsAnswerCorrect(u, q.correctAnswer);
  });

  // Classify topics by accuracy
  const struggledList: string[] = [];
  const masteredList: string[] = [];
  const reviewingList: string[] = [];

  if (topicPerformance && Object.keys(topicPerformance).length > 0) {
    for (const [topic, val] of Object.entries(topicPerformance)) {
      const data = val as { total: number; correct: number };
      const pct = (data.correct / (data.total || 1)) * 100;
      if (pct < 70) {
        struggledList.push(topic);
      } else if (pct >= 85) {
        masteredList.push(topic);
      } else {
        reviewingList.push(topic);
      }
    }
  }

  // If no topic performance breakdown was provided, infer from missed questions
  if (struggledList.length === 0 && missedQuestions.length > 0) {
    missedQuestions.forEach((q) => {
      if (q.topic && !struggledList.includes(q.topic)) {
        struggledList.push(q.topic);
      }
    });
  }

  const focusSubject = struggledList.length > 0
    ? struggledList.join(", ")
    : subject || "this subject";

  const recommendedSubtopics = getRelevantSubtopics(subject, struggledList.length > 0 ? struggledList : Object.keys(topicPerformance || {}), missedQuestions);

  // Personalized Headline
  let headline = "";
  if (percentage === 100) {
    headline = `Perfect score in ${subject}! You've demonstrated complete mastery over these notes.`;
  } else if (struggledList.length > 0) {
    headline = `You struggled with ${focusSubject}, try these sub-topics next:`;
  } else if (percentage < 75) {
    headline = `You had difficulty on several tricky questions in ${subject}, try these sub-topics next:`;
  } else {
    headline = `Strong command overall! To polish your retention in ${subject}, focus on these sub-topics:`;
  }

  // Tailored tips
  const tips: string[] = [];
  if (missedQuestions.length > 0) {
    tips.push(
      `Review your ${missedQuestions.length} missed question${missedQuestions.length > 1 ? "s" : ""} below to spot whether errors were conceptual or recall-based.`
    );
  }

  if (struggledList.length > 0) {
    tips.push(
      `Use active recall: sketch out the flow or mechanism of ${struggledList[0]} from memory before checking the answer.`
    );
  } else {
    tips.push(
      "Challenge yourself by teaching these core mechanisms or definitions to an imaginary student without referring to the notes."
    );
  }

  if (percentage < 80) {
    tips.push(
      "Convert your missed questions into flashcards and practice with spaced repetition to seal the gaps."
    );
  } else {
    tips.push(
      "Test yourself on timed mode or increase difficulty to 'Hard' to simulate high-pressure exam conditions."
    );
  }

  let encouragement = "";
  if (percentage >= 90) {
    encouragement = "Your retention is top-tier. Keep this streak going with quick spaced repetition!";
  } else if (percentage >= 70) {
    encouragement = "You're only a couple of targeted revisions away from full 100% mastery!";
  } else {
    encouragement = "Mistakes are the fastest way to learn. Reviewing explanations now will make these concepts stick permanently.";
  }

  const actionItem = missedQuestions.length > 0
    ? `Review the ${missedQuestions.length} missed questions, then create flashcards for "${struggledList[0] || subject}".`
    : `Try generating a 'Hard' quiz on ${subject} to push your boundaries!`;

  return {
    headline,
    struggledTopics: struggledList,
    recommendedSubtopics,
    masteredTopics: masteredList,
    tips,
    encouragement,
    recommendedAction: actionItem,
    source: "heuristic",
  };
}

export async function fetchStudyBuddyAdvice(attempt: QuizAttempt): Promise<StudyBuddyAdvice> {
  try {
    const res = await fetch("/api/study-buddy-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.headline && data.recommendedSubtopics) {
      return {
        ...data,
        source: "ai",
      };
    }
  } catch (err) {
    console.info("Using heuristic study buddy advice (fallback or fast preview):", err);
  }

  return generateHeuristicAdvice(attempt);
}

export async function askStudyBuddy(
  message: string,
  attempt: QuizAttempt,
  history: StudyBuddyMessage[]
): Promise<string> {
  try {
    const res = await fetch("/api/study-buddy-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        attempt,
        chatHistory: history.map((h) => ({
          role: h.sender === "user" ? "user" : "model",
          text: h.text,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn("Error calling AI study buddy chat:", err);
  }

  // Fallback intelligent responder based on quiz context
  const lower = message.toLowerCase();

  if (lower.includes("why") && (lower.includes("wrong") || lower.includes("missed") || lower.includes("fail"))) {
    const missed = attempt.questions.filter((q) => {
      const ans = attempt.userAnswers[q.id];
      return !ans || ans.toLowerCase() !== q.correctAnswer.toLowerCase();
    });

    if (missed.length > 0) {
      const firstMissed = missed[0];
      return `Looking at question "${firstMissed.question.substring(0, 60)}...", the correct answer is "${firstMissed.correctAnswer}". Key insight: ${firstMissed.explanation}`;
    }
    return `You scored ${attempt.percentage}% and didn't miss any major questions! Feel free to ask about any specific concept you'd like to dive deeper into.`;
  }

  if (lower.includes("mnemonic") || lower.includes("remember") || lower.includes("trick")) {
    return `Here is a study tip for ${attempt.subject}: Try creating an acronym using the first letters of the steps or keywords. For example, break the concept down into 3-4 vivid mental images linked in a short story!`;
  }

  if (lower.includes("next") || lower.includes("sub-topic") || lower.includes("what should i")) {
    const heuristic = generateHeuristicAdvice(attempt);
    return `Based on your quiz performance, I recommend tackling these sub-topics next:\n• ${heuristic.recommendedSubtopics.join("\n• ")}\n\nWould you like me to quiz you on any of these?`;
  }

  return `Great question! In ${attempt.subject}, focus on understanding *why* the principles work rather than rote memorization. Check your explanation notes for question #${attempt.questions[0]?.id || 1} as a reference baseline.`;
}
