import React, { useState } from "react";
import {
  Settings,
  Sliders,
  GraduationCap,
  Clock,
  Volume2,
  VolumeX,
  Zap,
  Trash2,
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import { AppSettings, DifficultyLevel, QuestionTypeFilter } from "../types";
import { DEFAULT_SETTINGS } from "../utils/storage";

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (updated: AppSettings) => {
    setForm(updated);
    onSaveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="settings-page">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-600" />
            <span>Study & Quiz Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Customize AI question generation defaults, timer behavior, and grade level focus.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" /> Preferences Saved
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        {/* 1. Grade / Target Exam Focus */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Academic Grade & Target Exam Level
          </label>
          <p className="text-xs text-slate-500">
            Helps the AI calibrate vocabulary and question complexity to your exact curriculum.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
            {[
              "Class 9-10 (Foundation)",
              "Class 11-12 / AP Exams",
              "NEET / JEE / College Exams",
            ].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleSave({ ...form, studyLevel: lvl })}
                className={`rounded-xl border p-3.5 text-left text-xs font-bold transition-all ${
                  form.studyLevel === lvl
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20"
                    : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Default Quiz Length */}
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Default Question Count
          </label>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[5, 10, 20, 30].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSave({ ...form, defaultQuestionCount: num })}
                className={`rounded-xl border p-3 text-center transition-all ${
                  form.defaultQuestionCount === num
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-extrabold ring-2 ring-indigo-600/20"
                    : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 text-sm font-semibold"
                }`}
              >
                {num} Questions
              </button>
            ))}
          </div>
        </div>

        {/* 3. Default Difficulty */}
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Default Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {(["easy", "medium", "hard"] as DifficultyLevel[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => handleSave({ ...form, defaultDifficulty: diff })}
                className={`rounded-xl border p-3 text-center capitalize font-bold text-xs transition-all ${
                  form.defaultDifficulty === diff
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-600/20"
                    : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Feedback & Audio Toggles */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Interactivity & Audio
          </h3>

          <div className="space-y-3">
            {/* Instant feedback toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Instant Explanations</p>
                  <p className="text-xs text-slate-500">
                    Show correct/incorrect indicators and note explanations immediately after answering.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.instantFeedback}
                onChange={(e) => handleSave({ ...form, instantFeedback: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Sound effects toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  {form.soundEffects ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Audio Chimes</p>
                  <p className="text-xs text-slate-500">
                    Play gentle ascending chimes on correct answers and celebration tones on quiz finish.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.soundEffects}
                onChange={(e) => handleSave({ ...form, soundEffects: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Timer preference */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Default Timer</p>
                  <p className="text-xs text-slate-500">
                    Enable countdown timer for quizzes by default.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.timerEnabled}
                onChange={(e) => handleSave({ ...form, timerEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Reset Defaults */}
        <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSave(DEFAULT_SETTINGS)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Default Settings</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 space-y-3">
        <h3 className="text-sm font-bold text-rose-900">
          Data Management
        </h3>
        <p className="text-xs text-rose-700">
          Clears all saved quiz history and stored flashcard decks from your browser storage.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to clear all history and stored decks? This cannot be undone.")) {
              onClearAllData();
            }
          }}
          className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All Stored App Data</span>
        </button>
      </div>
    </div>
  );
};
