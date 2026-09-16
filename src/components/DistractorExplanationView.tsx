import React from "react";

interface DistractorExplanationViewProps {
  distractorExplanations?: Record<string, string> | string | unknown;
}

export const DistractorExplanationView: React.FC<DistractorExplanationViewProps> = ({
  distractorExplanations,
}) => {
  if (!distractorExplanations) return null;

  // Case 1: Simple string
  if (typeof distractorExplanations === "string") {
    if (!distractorExplanations.trim()) return null;
    return (
      <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 text-xs">
        <span className="font-bold text-rose-700 block mb-0.5">⚠️ Common Misconception / Distractor Trap:</span>
        <p className="leading-relaxed">{distractorExplanations}</p>
      </div>
    );
  }

  // Case 2: Array of strings or reasons
  if (Array.isArray(distractorExplanations)) {
    if (distractorExplanations.length === 0) return null;
    return (
      <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 text-xs space-y-1">
        <span className="font-bold text-rose-700 block mb-0.5">⚠️ Common Misconception / Distractor Trap:</span>
        <ul className="list-disc pl-4 space-y-1 text-slate-600">
          {distractorExplanations.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Case 3: Key-Value Dictionary Record<string, string>
  if (typeof distractorExplanations === "object") {
    const entries = Object.entries(distractorExplanations as Record<string, unknown>);
    if (entries.length === 0) return null;

    return (
      <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 text-xs space-y-1.5">
        <span className="font-bold text-rose-700 block mb-0.5">⚠️ Common Misconception / Distractor Traps:</span>
        <div className="space-y-1 pl-1">
          {entries.map(([optKey, explanation], idx) => {
            const shortKey = optKey.length > 55 ? `${optKey.substring(0, 55)}...` : optKey;
            return (
              <div key={idx} className="text-xs leading-relaxed">
                <span className="font-bold text-slate-700">• {shortKey}:</span>{" "}
                <span className="text-slate-600">
                  {typeof explanation === "object" ? JSON.stringify(explanation) : String(explanation)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600 text-xs">
      <span className="font-bold text-rose-700 block mb-0.5">⚠️ Common Misconception / Distractor Trap:</span>
      <p className="leading-relaxed">{String(distractorExplanations)}</p>
    </div>
  );
};
