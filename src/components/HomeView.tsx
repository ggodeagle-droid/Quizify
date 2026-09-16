import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Trash2,
  BookOpen,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Zap
} from "lucide-react";
import { SAMPLE_NOTES, SampleNote } from "../data/sampleNotes";

interface HomeViewProps {
  notesText: string;
  setNotesText: (text: string) => void;
  uploadedFile: {
    name: string;
    size: number;
    mimeType: string;
    base64: string;
    previewUrl?: string;
  } | null;
  setUploadedFile: (file: any) => void;
  onProceedToSetup: () => void;
  onQuickQuiz?: () => void;
  onDirectFlashcards: () => void;
  isProcessing: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  notesText,
  setNotesText,
  uploadedFile,
  setUploadedFile,
  onProceedToSetup,
  onQuickQuiz,
  onDirectFlashcards,
  isProcessing,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<"paste" | "upload">("paste");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute word and character count
  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
  const charCount = notesText.length;
  const hasContent = notesText.trim().length > 30 || uploadedFile !== null;

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    const validExtensions = [".txt", ".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt) && !file.type.startsWith("image/")) {
      setUploadError("Please upload a supported file: PDF, TXT, DOCX, or PNG/JPG/WEBP images.");
      return;
    }

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File is larger than 20MB. Please upload a smaller study file.");
      return;
    }

    const reader = new FileReader();

    if (file.type === "text/plain" || fileExt === ".txt") {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || "text/plain",
          base64: btoa(unescape(encodeURIComponent(text))),
        });
        if (!notesText.trim()) {
          setNotesText(text);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        setUploadedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || (fileExt === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
          base64,
          previewUrl: file.type.startsWith("image/") ? dataUrl : undefined,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadSample = (sample: SampleNote) => {
    setNotesText(sample.content);
    setUploadedFile(null);
    setActiveInputTab("paste");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Transform Notes into Active Revision & Practice Tests</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Turn your notes into <span className="text-indigo-600">interactive quizzes</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600">
          Paste lecture summaries, upload study PDFs or snap photos of handwritten notes.
          Quizify AI synthesizes customized MCQs, True/False, and Flashcards strictly grounded in your material.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition-all" id="notes-input-card">
        {/* Input Switch Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveInputTab("paste")}
              id="tab-paste-notes"
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeInputTab === "paste"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Paste Notes</span>
            </button>
            <button
              onClick={() => setActiveInputTab("upload")}
              id="tab-upload-doc"
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeInputTab === "upload"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload Document / Photo</span>
              {uploadedFile && (
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>

          {/* Quick Clear or Stats */}
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            {notesText.trim().length > 0 && (
              <>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
                <button
                  onClick={() => {
                    setNotesText("");
                    setUploadedFile(null);
                  }}
                  id="clear-notes-btn"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Paste Notes Area */}
        {activeInputTab === "paste" && (
          <div className="pt-4 space-y-4">
            <div className="relative">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Paste your study notes, textbook summary, lecture points, formulas, or key concepts here... (e.g. Newton's laws, Krebs cycle, Cold War treaties)"
                rows={10}
                id="notes-textarea"
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm sm:text-base leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Upload File Area */}
        {activeInputTab === "upload" && (
          <div className="pt-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.docx,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
              id="file-upload-input"
            />

            {!uploadedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                id="drag-drop-zone"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs mb-3">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-slate-800">
                  Click to browse or drag and drop your study document
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Supports PDF, DOCX, TXT, and photos of handwritten notes or printed textbooks (PNG, JPG, WEBP).
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                    <FileText className="h-3 w-3 text-red-500" /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                    <FileText className="h-3 w-3 text-blue-500" /> DOCX
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                    <FileText className="h-3 w-3 text-slate-500" /> TXT
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200">
                    <ImageIcon className="h-3 w-3 text-emerald-500" /> Handwritten Photos
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-center gap-3.5">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Uploaded note"
                      className="h-16 w-16 rounded-lg object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {uploadedFile.name}
                      </p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.mimeType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Change File
                  </button>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Primary Action Buttons Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Questions generated strictly from your notes. No unrelated hallucinations.</span>
          </div>

          <div className="flex w-full sm:w-auto items-center flex-wrap sm:flex-nowrap gap-2.5">
            <button
              onClick={onDirectFlashcards}
              disabled={!hasContent || isProcessing}
              id="quick-flashcards-btn"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 ${
                !hasContent || isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Flashcards</span>
            </button>

            {onQuickQuiz && (
              <button
                onClick={onQuickQuiz}
                disabled={!hasContent || isProcessing}
                id="quick-start-quiz-btn"
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-2.5 text-sm font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all active:scale-95 ${
                  !hasContent || isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Generate 5 exam questions immediately in ~2-3 seconds"
              >
                <Zap className="h-4 w-4 text-amber-600 fill-amber-500" />
                <span>Quick Quiz (5 Qs)</span>
              </button>
            )}

            <button
              onClick={onProceedToSetup}
              disabled={!hasContent || isProcessing}
              id="generate-quiz-btn"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all active:scale-95 ${
                !hasContent || isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Customize Quiz</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Realistic Sample Notes Section */}
      <div className="space-y-4" id="sample-notes-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Or Try with Sample Revision Notes
            </h2>
            <p className="text-xs text-slate-500">
              Select any curated topic to test the interactive quiz generator instantly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_NOTES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => loadSample(sample)}
              id={`sample-note-${sample.id}`}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all active:scale-98"
            >
              <div>
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                  {sample.category}
                </span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {sample.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {sample.preview}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-semibold text-indigo-600">
                <span>{sample.subject}</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* How it Works Feature Cards */}
      <div className="space-y-5 pt-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">
            How Quizify AI Powers Your Active Recall
          </h2>
          <p className="text-xs text-slate-500">
            Engineered specifically for Class 9-12 board exams, NEET, JEE, and competitive tests
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold mb-3">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Grounded in Your Material</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Every question and distractor is derived solely from the notes you supply. No outside assumptions or unexpected topics.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold mb-3">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">4 Diverse Question Formats</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Practice with 4-option MCQs, True/False statements, Fill-in-the-blank, and Short-answer synthesis with instant answer hints.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold mb-3">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Topic Performance Breakdown</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Diagnose strong areas and gaps immediately with sub-topic scoring, time tracking, and instant flashcard conversion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
