/**
 * Utility functions for safely checking answers and rendering distractor traps
 * without crashing when dealing with various question formats or types.
 */

export function checkIsAnswerCorrect(userAnswer: unknown, correctAnswer: unknown): boolean {
  if (userAnswer === undefined || userAnswer === null) return false;
  const userStr = String(userAnswer).trim().toLowerCase();
  const correctStr = String(correctAnswer ?? "").trim().toLowerCase();

  if (!userStr || !correctStr) return false;
  return (
    userStr === correctStr ||
    userStr.includes(correctStr) ||
    (userStr.length >= 4 && correctStr.includes(userStr))
  );
}

export function getSafeNormalizedString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}
