import React from "react";
import {
  Sparkles,
  BookOpen,
  FileQuestion,
  Award,
  Layers,
  History,
  Settings,
  Menu,
  X,
  GraduationCap
} from "lucide-react";
import { ActiveTab } from "../types";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasActiveQuiz: boolean;
  hasResults: boolean;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActiveQuiz,
  hasResults,
  historyCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: "home" as ActiveTab, label: "Notes & Input", icon: BookOpen },
    { id: "setup" as ActiveTab, label: "Quiz Setup", icon: FileQuestion },
    ...(hasActiveQuiz
      ? [{ id: "quiz" as ActiveTab, label: "Live Quiz", icon: Sparkles, badge: "In Progress" }]
      : []),
    ...(hasResults
      ? [{ id: "results" as ActiveTab, label: "Results", icon: Award }]
      : []),
    { id: "flashcards" as ActiveTab, label: "Flashcards", icon: Layers },
    {
      id: "history" as ActiveTab,
      label: "History",
      icon: History,
      count: historyCount > 0 ? historyCount : undefined,
    },
    { id: "settings" as ActiveTab, label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          onClick={() => setActiveTab("home")}
          className="group flex items-center gap-2.5 text-left transition-transform active:scale-95"
          id="brand-logo-btn"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/35 transition-all">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Quizify<span className="text-indigo-600">AI</span>
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                STUDY
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
              Turn notes into instant revision material
            </p>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
