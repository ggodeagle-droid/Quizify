import React, { useState } from "react";
import {
  History,
  Award,
  Clock,
  Calendar,
  Search,
  Filter,
  Trash2,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  FileQuestion,
  Layers,
  Sparkles,
  Info,
  FileDown,
} from "lucide-react";
import { generateQuizResultPdf } from "../utils/pdfExport";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { QuizAttempt } from "../types";

interface HistoryViewProps {
  history: QuizAttempt[];
  onOpenAttempt: (attempt: QuizAttempt) => void;
  onRetakeAttempt: (attempt: QuizAttempt) => void;
  onDeleteAttempt: (id: string) => void;
  onClearAll: () => void;
  onGoToHome: () => void;
  onSeedSampleHistory?: () => void;
}

// Custom Tooltip for the Recharts Line Chart
const CustomPerformanceTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const isHigh = data.percentage >= 80;
    const isMid = data.percentage >= 50 && data.percentage < 80;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-xs text-xs space-y-2 min-w-[210px] max-w-[260px] pointer-events-none">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          <span className="font-bold text-slate-900 truncate" title={data.quizTitle}>
            {data.quizTitle}
          </span>
          <span className="capitalize font-semibold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {data.difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Score:</span>
          <div className="text-right">
            <span
              className={`font-black text-sm ${
                isHigh ? "text-emerald-600" : isMid ? "text-amber-600" : "text-rose-600"
              }`}
            >
              {data.percentage}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium ml-1.5">
              ({data.score}/{data.totalQuestions} pts)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1.5 border-t border-slate-100">
          <span className="font-medium text-indigo-600">{data.subject}</span>
          <span>{data.displayDate}</span>
        </div>
        <p className="text-[10px] text-slate-400 italic text-center pt-0.5">
          Click data point to review results
        </p>
      </div>
    );
  }
  return null;
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onOpenAttempt,
  onRetakeAttempt,
  onDeleteAttempt,
  onClearAll,
  onGoToHome,
  onSeedSampleHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [chartLimit, setChartLimit] = useState<5 | 10>(10);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.quizTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = difficultyFilter === "all" || item.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const totalQuizzes = history.length;
  const avgScore =
    totalQuizzes > 0
      ? Math.round(history.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizzes)
      : 0;
  const totalQuestions = history.reduce((acc, curr) => acc + curr.totalQuestions, 0);
  const bestScore =
    totalQuizzes > 0 ? Math.max(...history.map((h) => h.percentage)) : 0;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Prepare chronological data for Recharts (oldest of selected window on the left, newest on right)
  const slicedHistory = history.slice(0, chartLimit);
  const chartData = [...slicedHistory].reverse().map((item, idx) => {
    const d = new Date(item.timestamp);
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      id: item.id,
      attemptNumber: `#${idx + 1}`,
      displayDate: `${dateFormatted} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      shortDate: dateFormatted,
      percentage: item.percentage,
      score: item.score,
      totalQuestions: item.totalQuestions,
      quizTitle: item.quizTitle,
      subject: item.subject,
      difficulty: item.difficulty,
      rawItem: item,
    };
  });

  // Calculate window statistics for the chart
  const windowAvgScore =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.percentage, 0) / chartData.length)
      : 0;
  const windowHighest =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.percentage)) : 0;
  const windowDelta =
    chartData.length > 1
      ? chartData[chartData.length - 1].percentage - chartData[0].percentage
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="history-dashboard">
      {/* Title & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <History className="h-6 w-6 text-indigo-600" />
            <span>Quiz History & Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track test scores over time, review performance trends, and revisit explanations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onSeedSampleHistory && totalQuizzes === 0 && (
            <button
              onClick={onSeedSampleHistory}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load Sample History</span>
            </button>
          )}

          {totalQuizzes > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear your entire quiz history?")) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All History</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      {totalQuizzes > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quizzes Taken</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{totalQuizzes}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Score</p>
            <p className="mt-1 text-2xl font-black text-indigo-600">{avgScore}%</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Questions</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{totalQuestions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Highest Score</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{bestScore}%</p>
          </div>
        </div>
      )}

      {/* Recharts Performance Over Time Visualization */}
      {totalQuizzes > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4" id="quiz-performance-chart">
          {/* Chart Header & Range Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Performance Trajectory Over Time
                </h2>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                  Last {chartData.length} Attempt{chartData.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualizing score progression chronologically from earliest to most recent session.
              </p>
            </div>

            {/* Range Toggle: 5 vs 10 attempts */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setChartLimit(5)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  chartLimit === 5
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Last 5
              </button>
              <button
                type="button"
                onClick={() => setChartLimit(10)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  chartLimit === 10
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Last 10
              </button>
            </div>
          </div>

          {/* Quick Stats Pill Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Trajectory:</span>
              <div className="flex items-center gap-1">
                {windowDelta > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +{windowDelta}%
                  </span>
                ) : windowDelta < 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {windowDelta}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                    <Minus className="h-3.5 w-3.5" />
                    Steady
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Period Average:</span>
              <span className="text-xs font-extrabold text-indigo-600">{windowAvgScore}%</span>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Period Peak:</span>
              <span className="text-xs font-extrabold text-emerald-600">{windowHighest}%</span>
            </div>
          </div>

          {/* Recharts LineChart */}
          <div className="h-72 w-full pt-3" id="recharts-line-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, left: -14, bottom: 4 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload.rawItem;
                    if (item) onOpenAttempt(item);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="attemptNumber"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <Tooltip content={<CustomPerformanceTooltip />} />
                <ReferenceLine
                  y={80}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "80% Mastery",
                    position: "insideTopRight",
                    fill: "#059669",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <ReferenceLine
                  y={windowAvgScore}
                  stroke="#818cf8"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: `Avg: ${windowAvgScore}%`,
                    position: "insideBottomRight",
                    fill: "#6366f1",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#4f46e5",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                    cursor: "pointer",
                  }}
                  activeDot={{
                    r: 7,
                    fill: "#4338ca",
                    stroke: "#ffffff",
                    strokeWidth: 3,
                    cursor: "pointer",
                  }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" />
                <span>Quiz Score</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 bg-emerald-500" />
                <span>80% Mastery Benchmark</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 bg-indigo-300 border-b border-dashed" />
                <span>Period Average</span>
              </span>
            </div>
            <span className="italic">Click any point on the chart to review the full quiz</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {totalQuizzes > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quiz title or subject..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      )}

      {/* History Items List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3.5">
          {filteredHistory.map((item) => {
            const isHigh = item.percentage >= 80;
            const isMid = item.percentage >= 50 && item.percentage < 80;

            return (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {item.subject}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">
                      {item.difficulty}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.quizTitle}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span>{item.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{item.correctCount} Correct</span>
                    <span>•</span>
                    <span>{item.incorrectCount} Incorrect</span>
                    <span>•</span>
                    <span>{Math.round(item.timeTakenSeconds / 60)}m time spent</span>
                  </div>
                </div>

                {/* Score badge and Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${
                        isHigh
                          ? "bg-emerald-100 text-emerald-800"
                          : isMid
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>{item.percentage}%</span>
                    </span>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {item.score} / {item.totalQuestions} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateQuizResultPdf(item)}
                      title="Download PDF Report"
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onRetakeAttempt(item)}
                      title="Retake Quiz"
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onOpenAttempt(item)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-all"
                    >
                      <span>View Results</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteAttempt(item.id)}
                      title="Delete record"
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileQuestion className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              No Quiz History Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Complete your first quiz to track your progress, scores, and review answers over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onGoToHome}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-xs"
            >
              Create Your First Quiz
            </button>
            {onSeedSampleHistory && (
              <button
                onClick={onSeedSampleHistory}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load Demo Attempts</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
