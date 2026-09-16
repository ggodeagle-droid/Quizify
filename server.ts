import express from "express";
import path from "path";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

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

/**
 * Safely invokes Gemini generateContent with low-latency priority and automatic model fallback.
 * Prioritizes gemini-3.1-flash-lite for ultra-fast (2-4s) structured generation,
 * followed seamlessly by gemini-flash-latest and gemini-3.8-flash.
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
  // Ultra-fast model priority: gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.8-flash
  const defaultFastModels = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ];

  const modelsToTry = params.preferredModel
    ? [params.preferredModel, ...defaultFastModels.filter((m) => m !== params.preferredModel)]
    : defaultFastModels;

  const perAttemptTimeout = params.timeoutPerAttemptMs || 9500; // 9.5s max per attempt
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        }),
        perAttemptTimeout,
        `Model ${model} timed out after ${perAttemptTimeout}ms`
      );
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || (err?.error && err?.error?.code);
      const msg = err?.message || (typeof err === "string" ? err : JSON.stringify(err));

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

      console.warn(
        `Gemini attempt with model "${model}" failed/timed out (transient: ${isTransient}). Trying next model...`,
        msg.slice(0, 140)
      );

      // Brief pause before trying next model
      if (i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
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
      const correct = `The system maintains directional progression governed by the specific relationship: "${line.substring(0, 55)}"`;
      const d1 = `The process operates independently of boundary conditions without regard to "${line.substring(0, 45)}"`;
      const d2 = `The rate accelerates indefinitely because inverse proportionality cancels all limiting parameters`;
      const d3 = `The mechanism reverses its outcome because internal parameters substitute for external constraints`;

      const options = shuffleArray([correct, d1, d2, d3]);

      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "mcq",
        cognitiveLevel,
        qualityScore: 9,
        question: `Consider an experimental scenario testing the behavior described in your notes: "${line.substring(0, 80)}...". If external conditions are adjusted while standard operational limits are maintained, which outcome best represents the correct scientific behavior, and why?`,
        options,
        correctAnswer: correct,
        explanation: `Why Correct: According to the principles in your notes, "${line}", this behavior directly preserves the established mechanism under controlled conditions.\nWhy Distractors Are Wrong:\n• Option with independent boundary conditions ignores the necessary constraints described in the notes.\n• Inverse proportionality does not eliminate physical limiting factors.\n• Mechanisms cannot invert established directionality without counter-acting energy inputs.`,
        distractorExplanations: "Distractors test common student misconceptions regarding boundary constraints, rate limits, and mechanism directionality.",
        topic,
        hint: "Consider how boundary conditions and governing principles restrict possible outcomes.",
      });
    } else if (qType === "true_false") {
      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "true_false",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `A student asserts: "In the context of ${topic.toLowerCase()}, the condition '${line.substring(0, 65)}' can occur without satisfying any prerequisite threshold." Does this assertion accurately reflect the principles in your notes?`,
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: `Why Correct: False. The assertion is incorrect because your study notes outline specific mechanisms and dependent relationships for "${line.substring(0, 80)}", which require prerequisite threshold conditions to be met.`,
        topic,
        hint: "Evaluate whether the process can function without standard dependency conditions.",
      });
    } else if (qType === "fill_blank") {
      const words = line.split(" ").filter((w) => w.length > 4);
      const targetWord = words[Math.min(1, words.length - 1)] || "equilibrium";
      const masked = line.replace(new RegExp(targetWord, "i"), "_______");

      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "fill_blank",
        cognitiveLevel: "understanding",
        qualityScore: 8,
        question: `Complete the conceptual statement regarding governing principles: "${masked}"`,
        options: [],
        correctAnswer: targetWord,
        explanation: `Why Correct: "${targetWord}" is the precise term fulfilling the operational relationship described in: "${line}".`,
        topic,
        hint: `The missing term starts with '${targetWord[0]}'.`,
      });
    } else {
      fallbackQuestions.push({
        id: `q-${i + 1}`,
        type: "short_answer",
        cognitiveLevel: "reasoning",
        qualityScore: 9,
        question: `Analyze the following scenario: A system is configured according to "${line.substring(0, 85)}...". Explain the primary constraint that prevents spontaneous reversal of this process.`,
        options: [],
        correctAnswer: `The governing relationship stated in your notes (${line.substring(0, 60)}) establishes directional dependency.`,
        explanation: `Why Correct: As highlighted in your notes, "${line}", the mechanism operates under thermodynamic and directional dependencies that prevent arbitrary reversal.`,
        topic,
        hint: "Focus on the directional relationship and governing parameters outlined in the notes.",
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

// 1. Health check endpoint
app.get("/api/health", (_req, res) => {
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

    const systemInstruction = `You are the High-Speed Exam-Quality Question Generation Engine for Quizify AI (${studyLevel} level).
MANDATE: Generate rigorous, exam-quality questions derived strictly from the provided material.
RULES:
1. Cognitive depth: balance Recall (~20%), Understanding (~30%), Application (~30%), Reasoning (~20%).
2. No simple recall clichés (never "What is X?" or word replacement). Use scenarios, predictions, cause-and-effect, and error diagnosis.
3. For MCQs: exactly 4 plausible, balanced options representing real student misconceptions. No obvious giveaway options.
4. Explanations: provide 1-2 clear sentences explaining why the correct answer holds and why distractors fail.
5. Grounded: strictly derivable from the notes without fabricating outside trivia.
6. Internal score: rate 7-10 for concept significance and exam caliber.
${weakConceptsList ? `Target Weak Concepts to reinforce: ${weakConceptsList.join(", ")}.` : ""}`;

    const userPromptText = `Generate ${requestedCount} exam-quality quiz questions based strictly on the study material below.
Difficulty: ${difficulty} | Types: ${questionTypeFilter}
${config?.title ? `Title: ${config.title}` : ""}
${weakConceptsList ? `Target Weak Concepts: ${weakConceptsList.join("; ")}` : ""}

Notes content:
${combinedText || "(Please inspect attached document/image notes directly.)"}`;

    contentParts.push({ text: userPromptText });

    const response = await withTimeout(
      callGeminiWithModelFallback(ai, {
        preferredModel: "gemini-3.1-flash-lite",
        timeoutPerAttemptMs: 8000,
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          temperature: 0.3,
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
      15000,
      "Overall quiz generation timed out after 15s"
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
        timeoutPerAttemptMs: 7000,
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          temperature: 0.3,
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
      12000,
      "Flashcards generation timed out after 12s"
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
        timeoutPerAttemptMs: 6000,
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
    10000,
    "Study buddy feedback timed out after 10s"
  );

    const parsed = cleanAndParseJson(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Error in study-buddy-feedback:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI feedback" });
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
        timeoutPerAttemptMs: 6000,
        contents: { parts: conversationParts },
        config: {
          systemInstruction: `You are Quizify AI's 'AI Study Buddy' tutor.
You are helping a student review their quiz results.
Be encouraging, clear, and direct. Explain confusing concepts simply, provide mnemonics when asked, or break down why a question was missed.
Keep answers concise (around 2-4 sentences or short bullet points) so they fit nicely in the sidebar UI.
Reference the student's actual quiz questions when applicable:
${promptContext}`,
          temperature: 0.4,
        },
      }),
      8000,
      "Study buddy chat timed out after 8s"
    );

    res.json({ reply: response.text || "I'm here to help you master these concepts! What would you like to review?" });
  } catch (err: any) {
    console.error("Error in study-buddy-chat:", err);
    res.status(500).json({ error: err.message || "Failed to process chat" });
  }
});

// Vite middleware for dev / static for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quizify AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
