import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with generous limits for documents & photos of notes
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Lazy GoogleGenAI initialization
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

// Helper: Parse uploaded DOCX file buffer into raw text
async function extractTextFromDocx(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err) {
    console.error("Error extracting docx text:", err);
    return "";
  }
}

/**
 * Safely parses JSON from Gemini responses, handling markdown code fences and edge whitespace.
 */
function cleanAndParseJson(text: string): any {
  if (!text) return {};
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (initialErr) {
    // Try to extract JSON from markdown code fence
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (_) {}
    }
    // Try to find the outermost { ... }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
      } catch (_) {}
    }
    throw initialErr;
  }
}

/**
 * Executes a promise with an enforced timeout to avoid stalling network requests.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

// Dynamic model health tracker to route around temporary 503/load spikes
const modelCooldownUntil: Record<string, number> = {};

function isModelInCooldown(model: string): boolean {
  const until = modelCooldownUntil[model];
  return typeof until === "number" && Date.now() < until;
}

function markModelCooldown(model: string, durationMs = 60000) {
  modelCooldownUntil[model] = Date.now() + durationMs;
}

/**
 * Safely invokes Gemini generateContent with dynamic model health routing,
 * automatic thinkingConfig adaptation, and seamless error recovery.
 * Supported non-paid models: gemini-3.1-flash-lite, gemini-3.8-flash, gemini-flash-latest.
 */
async function callGeminiWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
    timeoutPerAttemptMs?: number;
  }
) {
  // Balanced candidate models (valid in @google/genai SDK without requiring paid keys)
  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];

  // Prioritize preferred model if specified, but if it is in cooldown, place it after healthy models
  let orderedModels: string[];
  if (params.preferredModel) {
    const others = candidateModels.filter((m) => m !== params.preferredModel);
    if (isModelInCooldown(params.preferredModel)) {
      orderedModels = [...others, params.preferredModel];
    } else {
      orderedModels = [params.preferredModel, ...others];
    }
  } else {
    orderedModels = [...candidateModels];
  }

  // Sort so that healthy models come before any model currently in cooldown
  orderedModels.sort((a, b) => {
    const aCool = isModelInCooldown(a) ? 1 : 0;
    const bCool = isModelInCooldown(b) ? 1 : 0;
    return aCool - bCool;
  });

  const perAttemptTimeout = params.timeoutPerAttemptMs || 25000;
  let lastError: any = null;

  for (let i = 0; i < orderedModels.length; i++) {
    const model = orderedModels[i];
    try {
      // Create clean config adapted to the specific model
      const modelConfig = { ...params.config };
      if (model.includes("flash-lite")) {
        // gemini-3.1-flash-lite defaults to MINIMAL thinking for fast, low-latency generation
        if (modelConfig.thinkingConfig) {
          modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        }
      } else if (!model.startsWith("gemini-3")) {
        // Non-Gemini 3 models (e.g. gemini-flash-latest) do not support thinkingConfig
        delete modelConfig.thinkingConfig;
      }

      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: modelConfig,
        }),
        perAttemptTimeout,
        `Model ${model} timed out after ${perAttemptTimeout}ms`
      );

      // Successfully returned response: clear any previous cooldown for this model
      delete modelCooldownUntil[model];
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || (err?.error && err?.error?.code);
      const msg = String(err?.message || err || "");

      const isTransient =
        status === 503 ||
        status === 429 ||
        status === "UNAVAILABLE" ||
        status === "RESOURCE_EXHAUSTED" ||
        msg.includes("timed out") ||
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("high demand") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("overloaded");

      if (isTransient) {
        // Mark this model in cooldown for 60 seconds so subsequent requests don't stall on it
        markModelCooldown(model, 60000);
        console.log(`[AI Routing] Model ${model} is experiencing high demand (503/UNAVAILABLE). Routing to next candidate...`);
      } else {
        console.log(`[AI Routing] Model ${model} returned non-transient status. Routing to next candidate...`);
      }

      if (i < orderedModels.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, isTransient ? 300 : 150));
        continue;
      }
    }
  }

  throw lastError;
}

// Fisher-Yates option shuffler to prevent predictable answer positioning
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Fallback generator adhering to the exam-quality question system
function generateFallbackQuiz(notesText: string, config: any) {
  const cleanedNotes = (notesText || "").replace(/\r/g, "").trim();
  let rawLines = cleanedNotes
    .split(/\n|\.\s+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && !l.startsWith("#"));

  const detectedSubject = config.subject || "Study Material";
  const detectedTitle = config.title || "Exam-Quality Quiz Review";

  if (rawLines.length === 0) {
    rawLines = [
      `Equilibrium dynamics and rate laws govern steady-state system transformation.`,
      `Gradient differences drive transport efficiency across semi-permeable boundaries.`,
      `Conservation laws restrict total energy transfer during adiabatic changes.`,
      `Enzyme substrate affinity shifts predictably with temperature and pH variations.`,
      `Structural conformation dictates active site specificity and catalytic velocity.`,
    ];
  }

  const count = Math.min(config.questionCount || 5, Math.max(rawLines.length, 5));
  const fallbackQuestions: any[] = [];
  const cognitiveLevels: Array<"recall" | "understanding" | "application" | "reasoning"> = [
    "understanding",
    "application",
    "reasoning",
    "understanding",
    "application",
  ];

  const topics = [
    "Core Mechanisms & Pathways",
    "Principles & Governing Laws",
    "Scenario Application & Constraints",
    "Comparative Synthesis & Error Analysis",
  ];

  for (let i = 0; i < count; i++) {
    const line = rawLines[i % rawLines.length];
    const topic = topics[i % topics.length];
    const cognitiveLevel = cognitiveLevels[i % cognitiveLevels.length];
    const qType = config.questionTypes === "all"
      ? (i % 4 === 0 ? "mcq" : i % 4 === 1 ? "true_false" : i % 4 === 2 ? "fill_blank" : "short_answer")
      : config.questionTypes === "mcq"
      ? "mcq"
      : config.questionTypes === "true_false"
      ? "true_false"
      : "short_answer";

    if (qType === "mcq") {
      // Natural, direct school-exam style MCQ
      const cleanSnippet = line.replace(/^[0-9.\-\s]+/, "").trim();
      const questionPrompt = `Based on the notes, which of the following statements is TRUE regarding this concept?\n"${cleanSnippet.substring(0, 95)}..."`;
      const correct = `It accurately follows the rule: "${cleanSnippet.substring(0, 50)}..."`;
      const d1 = `It happens independently without needing any prerequisite conditions or energy`;
      const d2 = `The rate drops to zero because external factors immediately stop the process`;
      const d3 = `The process works in the exact opposite direction without any outside force`;

      const options = shuffleArray([correct, d1, d2, d3]);

      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "mcq",
        cognitiveLevel,
        qualityScore: 8,
        question: questionPrompt,
        options,
        correctAnswer: correct,
        explanation: `According to your notes: "${cleanSnippet}". This directly explains why this statement is correct.\n\nCommon Pitfall: Students often assume processes can happen without prerequisite conditions or spontaneously reverse without energy, which is not true here.`,
        distractorExplanations: "Distractors test common student confusions about conditions and direction of the process.",
        topic,
        hint: "Look for the option that directly agrees with the statement in your notes.",
      });
    } else if (qType === "true_false") {
      const cleanSnippet = line.replace(/^[0-9.\-\s]+/, "").trim();
      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "true_false",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `According to your notes, is the following statement TRUE or FALSE?\n"${cleanSnippet.substring(0, 90)}..."`,
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: `True. This is stated directly in your chapter notes: "${cleanSnippet}".`,
        topic,
        hint: "Check whether this statement matches the key point in your notes.",
      });
    } else if (qType === "fill_blank") {
      const cleanSnippet = line.replace(/^[0-9.\-\s]+/, "").trim();
      const words = cleanSnippet.split(" ").filter((w) => w.length > 4 && !/[,.;:()]/g.test(w));
      const targetWord = words[Math.min(1, words.length - 1)] || "equilibrium";
      const masked = cleanSnippet.replace(new RegExp(targetWord, "i"), "_______");

      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "fill_blank",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `Fill in the blank with the correct term from your notes:\n"${masked}"`,
        options: [],
        correctAnswer: targetWord,
        explanation: `"${targetWord}" is the correct word from your notes: "${cleanSnippet}".`,
        topic,
        hint: `The missing word begins with the letter '${targetWord[0]}'.`,
      });
    } else {
      const cleanSnippet = line.replace(/^[0-9.\-\s]+/, "").trim();
      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "short_answer",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `In 1–2 simple sentences, summarize the main point of this concept from your notes: "${cleanSnippet.substring(0, 80)}..."`,
        options: [],
        correctAnswer: cleanSnippet.substring(0, 75),
        explanation: `Key point from your notes: "${cleanSnippet}".`,
        topic,
        hint: "State the core fact or formula given in the notes.",
      });
    }
  }

  return {
    title: detectedTitle,
    subject: detectedSubject,
    topics,
    questions: fallbackQuestions,
  };
}

function generateFallbackFlashcards(notesText: string, count: number = 10) {
  const lines = notesText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.startsWith("#"));

  const actualCount = Math.min(count, Math.max(lines.length, 6));
  const cards: any[] = [];

  for (let i = 0; i < actualCount; i++) {
    const line = lines[i % (lines.length || 1)] || "Study concept definition";
    const parts = line.split(/[:\-–]/);
    let front = "";
    let back = "";

    if (parts.length >= 2 && parts[0].length < 50) {
      front = parts[0].trim();
      back = parts.slice(1).join(" ").trim();
    } else {
      front = `Key concept #${i + 1}: ${line.substring(0, 45)}...`;
      back = line;
    }

    cards.push({
      id: `fc-${i + 1}`,
      front,
      back,
      topic: "Core Revision",
      status: "unseen",
    });
  }

  return {
    title: "Study Flashcards Deck",
    subject: "Revision Notes",
    cards,
  };
}

// Fallback feedback generator when AI services are temporarily unavailable or rate-limited
function generateFallbackFeedback(attempt: any) {
  const score = Number(attempt?.score) || 0;
  const total = Number(attempt?.totalQuestions) || 1;
  const pct = typeof attempt?.percentage === "number" ? attempt.percentage : Math.round((score / total) * 100);
  const missed = (attempt?.questions || []).filter((q: any) => {
    const userAns = attempt?.userAnswers?.[q.id];
    if (!userAns || String(userAns).trim() === "") return true;
    return String(userAns).trim().toLowerCase() !== String(q.correctAnswer || "").trim().toLowerCase();
  });

  const rawStruggled = missed.map((q: any) => q.topic || "Core Concepts").filter(Boolean);
  const struggledTopics = Array.from(new Set(rawStruggled)).slice(0, 3);
  if (struggledTopics.length === 0) {
    struggledTopics.push("Core Definitions & Principles");
  }

  const subject = attempt?.subject || "your study material";
  const headline = struggledTopics.length > 0
    ? `You scored ${pct}%. Review ${struggledTopics.join(" & ")}, and try these sub-topics next:`
    : `Excellent performance (${pct}%) on ${subject}! Ready to reinforce with advanced practice:`;

  const recommendedSubtopics = struggledTopics.map((t: string) => `${t}: Key Definitions & Formulas`);
  if (recommendedSubtopics.length < 3) {
    recommendedSubtopics.push(`Practical Problem Solving in ${subject}`);
    recommendedSubtopics.push(`Speed & Active Recall Practice`);
  }

  return {
    headline,
    struggledTopics,
    recommendedSubtopics: recommendedSubtopics.slice(0, 4),
    masteredTopics: Object.keys(attempt?.topicPerformance || {})
      .filter((t) => !struggledTopics.includes(t))
      .slice(0, 3),
    tips: [
      "Review the explanation for missed questions to identify recurring patterns.",
      "Create flashcards for essential definitions and equations to strengthen active recall.",
      "Retake this quiz after a 24-hour interval to solidify memory retention.",
    ],
    encouragement: pct >= 80 ? "Superb job! You have a solid grasp of the core concepts." : "Great effort! Consistent daily practice turns weak spots into your strongest areas.",
    recommendedAction: "Review Missed Questions",
  };
}

// 1. Health check endpoints (supports standard Cloud Run & Kubernetes probes)
app.get(["/api/health", "/health", "/healthz"], (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({ status: "ok", aiConfigured: hasKey });
});

// 2. Document parser endpoint (DOCX & TXT)
app.post("/api/parse-doc", async (req, res) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data" });
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName?.endsWith(".docx")
    ) {
      const text = await extractTextFromDocx(base64Data);
      return res.json({ text });
    }

    if (mimeType === "text/plain" || fileName?.endsWith(".txt")) {
      const text = Buffer.from(base64Data, "base64").toString("utf-8");
      return res.json({ text });
    }

    return res.json({ text: "", info: "File sent directly to multimodal AI." });
  } catch (err: any) {
    console.error("Error in parse-doc:", err);
    res.status(500).json({ error: err.message || "Failed to parse document" });
  }
});

// 3. Quiz Generation API
app.post("/api/generate-quiz", async (req, res) => {
  let combinedText = req.body.notesText || "";
  try {
    const { notesText, fileData, config } = req.body;
    const requestedCount = Number(config?.questionCount) || 10;
    const difficulty = config?.difficulty || "medium";
    const questionTypeFilter = config?.questionTypes || "all";
    const studyLevel = config?.studyLevel || "Class 11-12 / Competitive Exams";

    combinedText = notesText || "";

    // If file is DOCX, extract text first
    if (
      fileData &&
      (fileData.mimeType?.includes("wordprocessingml") ||
        fileData.fileName?.toLowerCase().endsWith(".docx"))
    ) {
      const docxText = await extractTextFromDocx(fileData.base64);
      if (docxText) {
        combinedText = `${combinedText}\n\n${docxText}`.trim();
      }
    }

    // If file is TXT
    if (
      fileData &&
      (fileData.mimeType === "text/plain" || fileData.fileName?.toLowerCase().endsWith(".txt"))
    ) {
      try {
        const txtContent = Buffer.from(fileData.base64, "base64").toString("utf-8");
        combinedText = `${combinedText}\n\n${txtContent}`.trim();
      } catch (e) {
        console.warn("Could not decode txt content", e);
      }
    }

    const ai = getGenAI();

    // If AI is not available, provide fallback
    if (!ai) {
      console.warn("GEMINI_API_KEY not configured. Using fallback quiz generator.");
      const fallback = generateFallbackQuiz(combinedText || "Sample Study Notes", config || {});
      return res.json(fallback);
    }

    // Prepare contents array (handling multimodal PDF & handwritten/printed images)
    const contentParts: any[] = [];

    // If fileData is PDF or Image
    if (
      fileData &&
      (fileData.mimeType?.startsWith("image/") || fileData.mimeType === "application/pdf")
    ) {
      contentParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const weakConceptsList = Array.isArray(config?.weakConcepts) && config.weakConcepts.length > 0
      ? config.weakConcepts
      : null;

    const systemInstruction = `You are an expert exam tutor and question generation engine specializing in school and competitive exam prep (CBSE Class 10–12 / School / Board / Foundation level).

TARGET AUDIENCE:
You are generating questions specifically tailored for an AVERAGE STUDENT.
The student has standard conceptual preparation. Your questions must build confidence while assessing real understanding.

CORE MANDATE & RULES:
1. SIMPLE & CLEAR LANGUAGE:
   - Use direct, conversational, and accessible English that an average Class 10–12 student easily grasps on the first read.
   - Ban overly convoluted sentence structures, dense scientific jargon not present in the notes, and tricky negative double-constructions.
   - Keep question stems short, natural, and direct (e.g. "What happens when...", "Which of the following explains why...", "What is the role of... in...").

2. STRICT RELEVANCE TO NOTES:
   - Every question, formula, term, and example MUST be directly derived from the provided notes/chapter.
   - Never ask for obscure dates, trivia, or details not highlighted in the notes.
   - Do NOT ask questions requiring prerequisite knowledge outside the provided content.
   - If the notes don't contain enough information for a solid question, skip or synthesize only what is firmly supported.

3. FOCUS ON CORE CONCEPTS & COMMON EXAM QUESTIONS:
   - Emphasize important concepts, main definitions, fundamental formulas, direct examples, and high-frequency exam questions (School & Board exam style).
   - Balance: ~40% Easy (direct recall, definitions, key formulas, primary components) and ~60% Medium (straightforward conceptual application, simple cause-and-effect, identifying examples).
   - AVOID unnecessarily hard, tricky, or ambiguous edge-case questions. Test understanding, not confusing wording.

4. REALISTIC, STRAIGHTFORWARD MCQ OPTIONS:
   - Multiple Choice questions must have exactly 4 clear, plausible options.
   - Distractors must represent real student misconceptions (e.g., swapping reactant with product, confusing mitosis with meiosis, reversing direction of heat flow), NOT bizarre, absurd, or needlessly verbose text.
   - Keep options balanced in length and easy to scan.

5. CLEAR, SUPPORTIVE EXPLANATIONS:
   - Provide a clear, supportive 1–2 sentence explanation referencing the exact principle from the notes.
   - In distractor explanations, gently highlight the common pitfall or misconception so the student learns from mistakes.

6. GOLDEN RULE:
   - Make the student think a little about the concept, but NEVER make the question difficult because of complicated language.
${weakConceptsList ? `Target Weak Concepts to reinforce: ${weakConceptsList.join(", ")}.` : ""}`;

    const userPromptText = `Generate ${requestedCount} high-yield, clear questions for an average student based strictly on the study material below.
Difficulty target: ${difficulty} (Keep questions accessible, realistic, and focused on core concepts)
Question types: ${questionTypeFilter}
${config?.title ? `Quiz Title: ${config.title}` : ""}
${weakConceptsList ? `Reinforce Weak Concepts: ${weakConceptsList.join("; ")}` : ""}

Study material notes:
${combinedText || "(Please inspect attached document/image notes directly.)"}`;

    contentParts.push({ text: userPromptText });

    const response = await withTimeout(
      callGeminiWithModelFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        timeoutPerAttemptMs: 25000,
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Descriptive academic title for the quiz" },
              subject: { type: Type.STRING, description: "Academic subject or domain" },
              topics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of distinct subtopics covered in this quiz",
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique question id like q-1, q-2" },
                    type: {
                      type: Type.STRING,
                      description: "mcq, true_false, short_answer, or fill_blank",
                    },
                    cognitiveLevel: {
                      type: Type.STRING,
                      description: "recall, understanding, application, or reasoning",
                    },
                    qualityScore: {
                      type: Type.NUMBER,
                      description: "Internal exam quality score from 7 to 10",
                    },
                    question: { type: Type.STRING, description: "The exam-quality question prompt" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Plausible, balanced options (exactly 4 for MCQ, 2 for True/False)",
                    },
                    correctAnswer: {
                      type: Type.STRING,
                      description: "The exact correct answer matching one of the options",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "Comprehensive teaching explanation citing why correct and why distractors fail",
                    },
                    distractorExplanations: {
                      type: Type.STRING,
                      description: "Specific misconceptions tested by the wrong options",
                    },
                    topic: { type: Type.STRING, description: "Subtopic name" },
                    hint: { type: Type.STRING, description: "Thought-provoking hint without revealing the answer" },
                  },
                  required: ["id", "type", "cognitiveLevel", "question", "correctAnswer", "explanation", "qualityScore"],
                },
              },
            },
            required: ["title", "subject", "topics", "questions"],
          },
        },
      }),
      55000,
      "Overall quiz generation timed out after 55s"
    );

    const responseText = response.text || "{}";
    const quizData = cleanAndParseJson(responseText);

    // Format & validate questions
    if (!quizData.questions || quizData.questions.length === 0) {
      throw new Error("AI did not return any questions. Falling back to local synthesizer.");
    }

    // Question Deduplication and Quality Post-Processing
    const processedQuestions: any[] = [];
    const seenQuestionPrompts: string[] = [];

    // Helper token overlap calculator
    const getTokens = (str: string) =>
      new Set(str.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3));

    for (let idx = 0; idx < quizData.questions.length; idx++) {
      const q = quizData.questions[idx];
      const qText = (q.question || "").trim();
      if (!qText) continue;

      // Deduplication check: check token overlap against already accepted questions
      const currentTokens = getTokens(qText);
      let isDuplicate = false;

      for (const seenPrompt of seenQuestionPrompts) {
        const seenTokens = getTokens(seenPrompt);
        let intersection = 0;
        currentTokens.forEach((t) => {
          if (seenTokens.has(t)) intersection++;
        });
        const similarity = intersection / Math.max(currentTokens.size, seenTokens.size, 1);
        if (similarity > 0.75) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        continue;
      }
      seenQuestionPrompts.push(qText);

      // Cognitive level normalization
      const validCognitiveLevels = ["recall", "understanding", "application", "reasoning"];
      const cognitiveLevel = validCognitiveLevels.includes(q.cognitiveLevel)
        ? q.cognitiveLevel
        : "understanding";

      // Options handling & randomization for MCQ
      let options = Array.isArray(q.options) ? q.options.map((opt: any) => String(opt).trim()) : [];
      let correctAnswer = String(q.correctAnswer || "").trim();

      if (q.type === "mcq") {
        // Ensure correctAnswer is included in options
        if (!options.some((opt) => opt.toLowerCase() === correctAnswer.toLowerCase())) {
          if (options.length >= 4) {
            options[0] = correctAnswer;
          } else {
            options.push(correctAnswer);
          }
        }
        // Fill up to 4 if short
        while (options.length < 4) {
          options.push(`Alternative mechanism ${options.length + 1} with inverted parameters`);
        }
        // Take exactly 4 options and shuffle using Fisher-Yates to eliminate position bias
        options = shuffleArray(options.slice(0, 4));
        // Match exact casing of correctAnswer to shuffled option
        const matched = options.find((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
        if (matched) correctAnswer = matched;
      } else if (q.type === "true_false") {
        options = ["True", "False"];
        correctAnswer = correctAnswer.toLowerCase() === "false" ? "False" : "True";
      }

      processedQuestions.push({
        ...q,
        id: q.id || `q-${processedQuestions.length + 1}`,
        type: q.type || "mcq",
        cognitiveLevel,
        qualityScore: typeof q.qualityScore === "number" ? Math.max(7, Math.min(10, q.qualityScore)) : 8,
        question: qText,
        options,
        correctAnswer,
        explanation: q.explanation || "Derived directly from fundamental concepts established in your notes.",
        distractorExplanations: q.distractorExplanations || undefined,
        topic: q.topic || quizData.topics?.[0] || "Core Concepts",
        hint: q.hint || undefined,
      });
    }

    quizData.questions = processedQuestions.length > 0 ? processedQuestions : quizData.questions;

    res.json(quizData);
  } catch (err: any) {
    console.error("Error generating quiz with Gemini (fallback engaged):", err);
    // Graceful fallback so user never gets a broken experience
    const fallback = generateFallbackQuiz(combinedText || req.body.notesText || "", req.body.config || {});
    res.json(fallback);
  }
});

// 4. Flashcards Generation API
app.post("/api/generate-flashcards", async (req, res) => {
  let combinedText = req.body.notesText || "";
  try {
    const { notesText, fileData, count = 10, title, subject } = req.body;
    combinedText = notesText || "";

    if (
      fileData &&
      (fileData.mimeType?.includes("wordprocessingml") ||
        fileData.fileName?.toLowerCase().endsWith(".docx"))
    ) {
      const docxText = await extractTextFromDocx(fileData.base64);
      if (docxText) {
        combinedText = `${combinedText}\n\n${docxText}`.trim();
      }
    }

    if (
      fileData &&
      (fileData.mimeType === "text/plain" || fileData.fileName?.toLowerCase().endsWith(".txt"))
    ) {
      try {
        const txtContent = Buffer.from(fileData.base64, "base64").toString("utf-8");
        combinedText = `${combinedText}\n\n${txtContent}`.trim();
      } catch (e) {
        console.warn("Could not decode txt", e);
      }
    }

    const ai = getGenAI();
    if (!ai) {
      console.warn("GEMINI_API_KEY not set. Generating fallback flashcards.");
      return res.json(generateFallbackFlashcards(combinedText || "Sample Study Notes", count));
    }

    const contentParts: any[] = [];
    if (
      fileData &&
      (fileData.mimeType?.startsWith("image/") || fileData.mimeType === "application/pdf")
    ) {
      contentParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    const systemInstruction = `You are Quizify AI's flashcard synthesis engine.
Turn the provided notes into ${count} high-impact flashcards for active recall and spaced repetition.
Each flashcard must have:
- 'front': A concise question, term, formula, or concept prompt that tests active recall.
- 'back': A crisp, high-yield definition, answer, or key explanation based directly on the notes.
- 'topic': The sub-topic or domain.
STRICT RULE: Strictly base every single flashcard on the provided notes/document.`;

    contentParts.push({
      text: `Generate ${count} flashcards from these study notes:
${combinedText || "(Please read the attached notes image/document directly.)"}`,
    });

    const response = await withTimeout(
      callGeminiWithModelFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        timeoutPerAttemptMs: 20000,
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subject: { type: Type.STRING },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING, description: "Front side concept or question" },
                    back: { type: Type.STRING, description: "Back side answer or explanation" },
                    topic: { type: Type.STRING, description: "Category/subtopic" },
                  },
                  required: ["id", "front", "back"],
                },
              },
            },
            required: ["title", "subject", "cards"],
          },
        },
      }),
      45000,
      "Flashcards generation timed out after 45s"
    );

    const parsed = cleanAndParseJson(response.text || "{}");
    if (!parsed.cards || parsed.cards.length === 0) {
      return res.json(generateFallbackFlashcards(combinedText, count));
    }

    parsed.cards = parsed.cards.map((c: any, i: number) => ({
      ...c,
      id: c.id || `fc-${i + 1}`,
      status: "unseen",
    }));

    res.json(parsed);
  } catch (err: any) {
    console.error("Error generating flashcards with Gemini (fallback engaged):", err);
    res.json(generateFallbackFlashcards(combinedText || req.body.notesText || "", req.body.count || 10));
  }
});

// 5. AI Study Buddy: Personalized Feedback API
app.post("/api/study-buddy-feedback", async (req, res) => {
  try {
    const { attempt } = req.body;
    if (!attempt) {
      return res.status(400).json({ error: "Missing quiz attempt data" });
    }

    const ai = getGenAI();
    if (!ai) {
      // Fallback handled gracefully by client
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const promptContext = `
Quiz Title: ${attempt.quizTitle}
Subject: ${attempt.subject}
Difficulty: ${attempt.difficulty}
Score: ${attempt.score} / ${attempt.totalQuestions} (${attempt.percentage}%)
Correct Count: ${attempt.correctCount}, Incorrect: ${attempt.incorrectCount}, Skipped: ${attempt.skippedCount}
Topic Breakdown: ${JSON.stringify(attempt.topicPerformance || {})}

Questions and Answers:
${attempt.questions
  .map((q: any, i: number) => {
    const userAns = attempt.userAnswers?.[q.id] || "[Skipped]";
    const isCorrect = userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    return `Q${i + 1} (${q.topic || "General"}): ${q.question}
User answered: ${userAns} | Correct: ${q.correctAnswer} | Result: ${isCorrect ? "CORRECT" : "WRONG"}
Explanation: ${q.explanation}`;
  })
  .join("\n\n")}
`;

    const response = await withTimeout(
      callGeminiWithModelFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        timeoutPerAttemptMs: 18000,
        contents: {
          parts: [
            {
              text: `Analyze this quiz performance and generate personalized improvement advice.
Highlight specific areas of difficulty (e.g. "You struggled with organic chemistry, try these sub-topics next:") and recommend 3-4 concrete, high-yield sub-topics for their next study session.
Data:\n${promptContext}`,
            },
          ],
        },
        config: {
          systemInstruction: `You are the student's personal AI Study Buddy.
Your goal is to provide honest, constructive, and actionable improvement tips based on their quiz results.
Highlight what they mastered, identify where they stumbled, recommend specific sub-topics to tackle next, and provide 2-3 actionable study strategies.`,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: "E.g., 'You struggled with organic chemistry, try these sub-topics next:'",
            },
            struggledTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of topics or concepts where user made mistakes",
            },
            recommendedSubtopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 4 specific sub-topics to study next",
            },
            masteredTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Topics where user scored well",
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 to 3 practical study tips tailored to their gaps",
            },
            encouragement: {
              type: Type.STRING,
              description: "Brief motivating closing note",
            },
            recommendedAction: {
              type: Type.STRING,
              description: "Immediate recommended next step",
            },
          },
          required: [
            "headline",
            "struggledTopics",
            "recommendedSubtopics",
            "masteredTopics",
            "tips",
            "encouragement",
            "recommendedAction",
          ],
        },
      },
    }),
    35000,
    "Study buddy feedback timed out after 35s"
  );

    const parsed = cleanAndParseJson(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.log("[Study Buddy] AI feedback fallback engaged:", err?.message || err);
    // Return structured feedback so the client always gets an actionable, beautiful breakdown
    res.json(generateFallbackFeedback(req.body?.attempt));
  }
});

// 6. AI Study Buddy: Interactive Q&A chat
app.post("/api/study-buddy-chat", async (req, res) => {
  try {
    const { message, attempt, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const promptContext = `
Student's Quiz Context:
Title: ${attempt?.quizTitle || "Quiz"}
Subject: ${attempt?.subject || "Subject"}
Score: ${attempt?.score} / ${attempt?.totalQuestions} (${attempt?.percentage}%)
Questions:
${(attempt?.questions || [])
  .map((q: any, i: number) => {
    const u = attempt?.userAnswers?.[q.id] || "[Skipped]";
    return `Q${i + 1}: ${q.question} | Correct: ${q.correctAnswer} | Student: ${u} | Expl: ${q.explanation}`;
  })
  .join("\n")}
`;

    const conversationParts: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.slice(-6).forEach((msg: any) => {
        conversationParts.push({
          text: `${msg.role === "user" ? "Student" : "Study Buddy"}: ${msg.text}`,
        });
      });
    }

    conversationParts.push({
      text: `Student Question: ${message}`,
    });

    const response = await withTimeout(
      callGeminiWithModelFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        timeoutPerAttemptMs: 12000,
        contents: { parts: conversationParts },
        config: {
          systemInstruction: `You are Quizify AI's 'AI Study Buddy' tutor.
You are helping a student review their quiz results.
Be encouraging, clear, and direct. Explain confusing concepts simply, provide mnemonics when asked, or break down why a question was missed.
Keep answers concise (around 2-4 sentences or short bullet points) so they fit nicely in the sidebar UI.
Reference the student's actual quiz questions when applicable:
${promptContext}`,
          temperature: 0.4,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      22000,
      "Study buddy chat timed out after 22s"
    );

    res.json({ reply: response.text || "I'm here to help you master these concepts! What would you like to review?" });
  } catch (err: any) {
    console.log("[Study Buddy] Chat fallback engaged:", err?.message || err);
    res.json({
      reply: "I'm actively reviewing your notes! To maximize your retention, start by checking the questions marked incorrect and re-reading the highlighted formulas. Which specific question or concept can I explain for you?"
    });
  }
});

// Vite middleware for dev / static for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust path resolution for production dist folder
    const distPath = fs.existsSync(path.join(__dirname, "index.html"))
      ? __dirname
      : path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!doctype html><html><head><title>Quizify AI</title></head><body><div id='root'></div></body></html>");
      }
    });
  }

  // Primary listener on port 3000 (required for AI Studio dev reverse proxy)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quizify AI primary server running on http://0.0.0.0:${PORT}`);
  });

  // Cloud Run Rollout Listener:
  // When deployed to Cloud Run standalone, traffic is routed to process.env.PORT (typically 8080).
  // In the dev sandbox, nginx already occupies 8080 so EADDRINUSE is safely ignored.
  if (process.env.PORT && Number(process.env.PORT) !== PORT) {
    const cloudRunPort = Number(process.env.PORT);
    try {
      const secondaryServer = app.listen(cloudRunPort, "0.0.0.0", () => {
        console.log(`Quizify AI Cloud Run service listening on port ${cloudRunPort}`);
      });
      secondaryServer.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Port ${cloudRunPort} in use by reverse proxy. Primary port ${PORT} active.`);
        } else {
          console.error(`Secondary listener error on port ${cloudRunPort}:`, err);
        }
      });
    } catch (bindErr) {
      console.log(`Secondary listener skipped on port ${cloudRunPort}:`, bindErr);
    }
  }
}

// Graceful container lifecycle shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
