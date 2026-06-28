import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Sparkles, Plus, BarChart3, Trash2, Play, CheckSquare, 
  Layers, Download, Upload, Flame, FolderPlus, ArrowRight, 
  GraduationCap, ListFilter, AlertCircle, RefreshCw, Eye, MessageSquare, FileText, Shield, User
} from "lucide-react";
import { Deck, Flashcard, UserStats, StudySession } from "./types";
import { TEMPLATE_DECKS } from "./data/templates";
import AIGenerator from "./components/AIGenerator";
import FlashcardPlayer from "./components/FlashcardPlayer";
import ManualCreator from "./components/ManualCreator";
import QuizView from "./components/QuizView";
import Analytics from "./components/Analytics";
import TutorChat from "./components/TutorChat";
import NotesView from "./components/NotesView";

import AdminView from "./components/AdminView";

import { Auth } from "./components/Auth";
import { useFirebaseData } from "./hooks/useFirebaseData";
import { auth } from "./lib/firebase";

import { safeStorage } from "./utils/storage";

export default function App() {
  // Core states
  const { user, loadingUser, isBanned, decks, notes, stats, updateDecks, updateStats, deleteDeck, addNote, deleteNote } = useFirebaseData();

  // Navigation states
  const [activeTab, setActiveTab] = useState<"library" | "ai-builder" | "manual-builder" | "analytics" | "tutor" | "notes" | "admin" | "account">("library");
  const [tutorDeckId, setTutorDeckId] = useState<string | null>(null);
  
  // Session states
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"idle" | "studying" | "quizzing">("idle");
  
  // Inspection modal
  const [inspectingDeckId, setInspectingDeckId] = useState<string | null>(null);
  
  // Search and filter inside library
  const [searchQuery, setSearchQuery] = useState("");

  // Import error state
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronous Load from LocalStorage with robust validation removed in favor of Firebase

  // Save changes to Firebase
  const saveDecks = (updatedDecks: Deck[]) => {
    updateDecks(updatedDecks);
  };

  const saveStats = (updatedStats: UserStats) => {
    updateStats(updatedStats);
  };

  // Create a brand new empty deck or template deck
  const handleDeckCreated = (name: string, description: string, rawCards: any[]) => {
    const formattedCards: Flashcard[] = rawCards.map((c, index) => ({
      id: `card-${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
      front: c.front,
      back: c.back,
      hint: c.hint,
      tags: c.tags,
      mastered: false,
      reviewCount: 0,
      difficulty: c.difficulty || "medium",
    }));

    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      cards: formattedCards,
    };

    const nextDecks = [newDeck, ...decks];
    saveDecks(nextDecks);
    setActiveTab("library");
  };

  // Add cards manually or via AI to an existing deck
  const handleAddCardsToDeck = (deckId: string, rawCards: any[]) => {
    const formattedCards: Flashcard[] = rawCards.map((c, index) => ({
      id: `card-${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
      front: c.front,
      back: c.back,
      hint: c.hint,
      tags: c.tags,
      mastered: false,
      reviewCount: 0,
      difficulty: c.difficulty || "medium",
    }));

    const nextDecks = decks.map((deck) => {
      if (deck.id === deckId) {
        return {
          ...deck,
          cards: [...deck.cards, ...formattedCards],
        };
      }
      return deck;
    });

    saveDecks(nextDecks);
    setActiveTab("library");
  };

  // Card reviewed in standard flip player
  const handleCardReviewed = (cardId: string, rating: "struggled" | "ok" | "mastered") => {
    let cardWasMasteredJustNow = false;
    let cardWasUnmasteredJustNow = false;

    const nextDecks = decks.map((deck) => {
      const updatedCards = deck.cards.map((card) => {
        if (card.id === cardId) {
          const isMasteredNow = rating === "mastered";
          const wasMasteredBefore = !!card.mastered;
          if (isMasteredNow && !wasMasteredBefore) {
            cardWasMasteredJustNow = true;
          } else if (!isMasteredNow && wasMasteredBefore) {
            cardWasUnmasteredJustNow = true;
          }
          return {
            ...card,
            reviewCount: card.reviewCount + 1,
            lastReviewedAt: new Date().toISOString(),
            mastered: isMasteredNow,
          };
        }
        return card;
      });
      return { ...deck, cards: updatedCards };
    });

    saveDecks(nextDecks);

    // Update global stats
    const updatedStats: UserStats = {
      ...stats,
      totalCardsViewed: stats.totalCardsViewed + 1,
      totalCardsMastered: Math.max(0, stats.totalCardsMastered + (cardWasMasteredJustNow ? 1 : 0) - (cardWasUnmasteredJustNow ? 1 : 0)),
    };
    saveStats(updatedStats);
  };

  // Interactive Quiz Completed - Log Session & calculate daily streak and update card masteries
  const handleQuizCompleted = (session: StudySession, cardResults?: { [cardId: string]: boolean }) => {
    // Streak calculations
    const todayStr = new Date().toDateString();
    let nextStreak = stats.streak;

    if (!stats.lastStudyDate) {
      nextStreak = 1; // First day studied ever
    } else {
      const lastDate = new Date(stats.lastStudyDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (lastDate.toDateString() === todayStr) {
        // Already studied today, keep streak the same
      } else if (diffDays <= 1) {
        nextStreak += 1; // Consecutively studied yesterday
      } else {
        nextStreak = 1; // Streak broken, restart
      }
    }

    // Update card masteries based on quiz results
    let nextDecks = decks;
    let cardsMasteredChange = 0;

    if (cardResults) {
      nextDecks = decks.map((deck) => {
        if (deck.id === session.deckId) {
          const updatedCards = deck.cards.map((card) => {
            if (card.id in cardResults) {
              const wasCorrect = cardResults[card.id];
              const wasMasteredBefore = !!card.mastered;
              const isMasteredNow = wasCorrect; // mark correct as mastered, incorrect as not mastered
              
              if (isMasteredNow && !wasMasteredBefore) {
                cardsMasteredChange++;
              } else if (!isMasteredNow && wasMasteredBefore) {
                cardsMasteredChange--;
              }

              return {
                ...card,
                reviewCount: card.reviewCount + 1,
                lastReviewedAt: new Date().toISOString(),
                mastered: isMasteredNow,
              };
            }
            return card;
          });
          return { ...deck, cards: updatedCards };
        }
        return deck;
      });
      saveDecks(nextDecks);
    }

    const nextSessions = [...stats.studySessions, session];
    const updatedStats: UserStats = {
      ...stats,
      streak: nextStreak,
      lastStudyDate: todayStr,
      totalCardsViewed: stats.totalCardsViewed + session.cardsStudied,
      totalCardsMastered: Math.max(0, stats.totalCardsMastered + cardsMasteredChange),
      studySessions: nextSessions,
    };

    saveStats(updatedStats);
  };

  // Manually toggle card mastery status
  const handleToggleCardMastery = (deckId: string, cardId: string) => {
    let cardsMasteredChange = 0;

    const nextDecks = decks.map((deck) => {
      if (deck.id === deckId) {
        const updatedCards = deck.cards.map((card) => {
          if (card.id === cardId) {
            const isMasteredNow = !card.mastered;
            if (isMasteredNow) {
              cardsMasteredChange = 1;
            } else {
              cardsMasteredChange = -1;
            }
            return {
              ...card,
              mastered: isMasteredNow,
            };
          }
          return card;
        });
        return { ...deck, cards: updatedCards };
      }
      return deck;
    });

    saveDecks(nextDecks);

    const updatedStats: UserStats = {
      ...stats,
      totalCardsMastered: Math.max(0, stats.totalCardsMastered + cardsMasteredChange),
    };
    saveStats(updatedStats);
  };

  // Deleting a study deck
  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this deck? This action cannot be undone.")) {
      await deleteDeck(deckId);
      if (inspectingDeckId === deckId) setInspectingDeckId(null);
    }
  };

  // Export decks & stats database to JSON file
  const exportDatabase = () => {
    const database = {
      decks,
      stats,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai_flashcard_maker_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import decks & stats from custom JSON backup
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.decks && Array.isArray(parsed.decks)) {
          saveDecks(parsed.decks);
          if (parsed.stats) {
            saveStats(parsed.stats);
          }
          setImportError(null);
          alert("Database imported successfully!");
        } else {
          throw new Error("Invalid format. File must contain a decks array.");
        }
      } catch (err: any) {
        setImportError("Failed to parse JSON file. Ensure it is a valid QuizGenius backup.");
      }
    };
    reader.readAsText(file);
  };

  // Quick Study suggest (e.g. from recommended stats card)
  const handleStartSuggested = () => {
    if (decks.length > 0) {
      // Find deck with lowest mastery or most cards
      const sorted = [...decks].sort((a, b) => {
        const mRateA = a.cards.length > 0 ? a.cards.filter(c => c.mastered).length / a.cards.length : 0;
        const mRateB = b.cards.length > 0 ? b.cards.filter(c => c.mastered).length / b.cards.length : 0;
        return mRateA - mRateB; // Lower mastery comes first
      });
      setActiveDeckId(sorted[0].id);
      setSessionMode("studying");
    }
  };

  // Library filtered list
  const filteredDecks = decks.filter((deck) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      deck.name.toLowerCase().includes(query) ||
      deck.description.toLowerCase().includes(query) ||
      deck.cards.some((c) => c.front.toLowerCase().includes(query) || c.back.toLowerCase().includes(query))
    );
  });

  const inspectedDeck = decks.find((d) => d.id === inspectingDeckId);

  if (loadingUser) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Loading...</div>;
  if (!user) return <Auth onSignedIn={() => {}} />;
  if (isBanned) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
      <Shield className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-3xl mb-2 font-display font-bold">Account Suspended</h1>
      <p className="text-slate-500 mb-8">Your account has been banned by an administrator.</p>
      <button 
        onClick={() => auth.signOut()}
        className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans" id="application-root">
      
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 rounded-2xl text-white shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-display font-bold tracking-tight text-slate-950">
                  QuizGenius
                </h1>
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Gemini-3.5
                </span>
              </div>
              <p className="text-xs text-slate-400">Distill facts, concepts, and notes instantly</p>
            </div>
          </div>

          {/* Quick Metrics Bar (Daily Streak and database backup) */}
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-orange-50/70 border border-orange-100/50 px-3 py-1.5 rounded-2xl">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-700 font-mono">
                {stats.streak} {stats.streak === 1 ? "Day" : "Days"} Streak
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportDatabase}
                className="p-2 hover:bg-slate-100 border border-slate-100 text-slate-500 rounded-xl transition-all"
                title="Backup database to JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleImportClick}
                className="p-2 hover:bg-slate-100 border border-slate-100 text-slate-500 rounded-xl transition-all"
                title="Restore database backup"
              >
                <Upload className="w-4 h-4" />
              </button>
              {/* Account Settings Toggle Button */}
              <button
                onClick={() => setActiveTab("account")}
                className={`p-2 hover:bg-slate-100 border rounded-xl transition-all ${activeTab === 'account' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-100 text-slate-500'}`}
                title="Account Settings"
              >
                <User className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

        </div>
      </header>

      {/* Navigation tabs row */}
      {sessionMode === "idle" && (
        <div className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-[73px] z-30 px-4 md:px-8">
          <nav className="max-w-7xl mx-auto flex gap-6 overflow-x-auto scrollbar-none py-1">
            {([...(["library", "notes", "ai-builder", "manual-builder", "analytics", "tutor"] as const), ...(user.email === 'admin@study.app' ? ["admin" as const] : [])]).map((tab) => {
              let label = "Study Library";
              let icon = <BookOpen className="w-4 h-4" />;
              
              if (tab === "notes") {
                label = "My Notes";
                icon = <FileText className="w-4 h-4 text-indigo-500" />;
              } else if (tab === "ai-builder") {
                label = "AI Architect";
                icon = <Sparkles className="w-4 h-4 text-amber-500" />;
              } else if (tab === "manual-builder") {
                label = "Draft Custom Deck";
                icon = <FolderPlus className="w-4 h-4" />;
              } else if (tab === "analytics") {
                label = "Analytics Dashboard";
                icon = <BarChart3 className="w-4 h-4" />;
              } else if (tab === "tutor") {
                label = "AI Study Tutor";
                icon = <GraduationCap className="w-4 h-4 text-indigo-500" />;
              } else if (tab === "admin") {
                label = "Admin";
                icon = <Shield className="w-4 h-4 text-red-500" />;
              }

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setInspectingDeckId(null);
                    if (tab !== "tutor") {
                      setTutorDeckId(null);
                    }
                  }}
                  className={`py-3.5 px-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? "border-slate-950 text-slate-950"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Container Content */}
      <main className="flex-grow py-8 max-w-7xl mx-auto w-full px-4 md:px-8">
        
        {importError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm max-w-xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Import Error:</span> {importError}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {sessionMode !== "idle" ? (
            
            /* SESSION MODAL INLETS (STUDYING OR QUIZZING) */
            <motion.div
              key="active-session"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
            >
              {sessionMode === "studying" && activeDeckId && (
                <FlashcardPlayer
                  deck={decks.find((d) => d.id === activeDeckId)!}
                  onClose={() => {
                    setSessionMode("idle");
                    setActiveDeckId(null);
                  }}
                  onCardReviewed={handleCardReviewed}
                />
              )}

              {sessionMode === "quizzing" && activeDeckId && (
                <QuizView
                  deck={decks.find((d) => d.id === activeDeckId)!}
                  onClose={() => {
                    setSessionMode("idle");
                    setActiveDeckId(null);
                  }}
                  onQuizCompleted={handleQuizCompleted}
                />
              )}
            </motion.div>

          ) : (
            
            /* STANDARD MAIN WORKSPACES */
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* TAB 1: LIBRARY DASHBOARD */}
              {activeTab === "library" && (
                <div className="space-y-6">
                  
                  {/* Library Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
                    <div className="relative flex-grow max-w-md">
                      <ListFilter className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search decks, questions, tags..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
                      />
                    </div>
                    
                    <button
                      onClick={() => setActiveTab("ai-builder")}
                      className="py-2.5 px-5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> AI Generate New
                    </button>
                  </div>

                  {/* Empty state if zero matches */}
                  {filteredDecks.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-xs max-w-xl mx-auto">
                      <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-display font-bold text-slate-800 mb-1">
                        No Study Decks Found
                      </h3>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">
                        {searchQuery ? "No matches found for your search query. Try typing something else!" : "Your learning library is currently empty. Start drafting or let Gemini compile a deck for you."}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setActiveTab("ai-builder");
                        }}
                        className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" /> Let AI Create One
                      </button>
                    </div>
                  ) : (
                    /* DECK GRID LAYOUT */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDecks.map((deck) => {
                        const totalCards = deck.cards.length;
                        const masteredCards = deck.cards.filter((c) => c.mastered).length;
                        const masteryRate = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

                        return (
                          <div
                            key={deck.id}
                            onClick={() => setInspectingDeckId(deck.id)}
                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-200/80 transition-all text-left flex flex-col justify-between cursor-pointer group"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-2">
                                <h3 className="text-base font-display font-bold text-slate-900 line-clamp-1 group-hover:text-slate-950 transition-colors">
                                  {deck.name}
                                </h3>
                                <button
                                  onClick={(e) => handleDeleteDeck(deck.id, e)}
                                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0"
                                  title="Delete deck"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                                {deck.description || "No description provided."}
                              </p>
                            </div>

                            {/* Deck Metrics */}
                            <div>
                              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                <span className="font-mono">{totalCards} {totalCards === 1 ? "card" : "cards"}</span>
                                <span className="text-slate-700">{masteryRate}% Mastered</span>
                              </div>
                              {/* progress bar */}
                              <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden border border-slate-100/50 mb-4">
                                <div
                                  className="bg-emerald-500 h-full transition-all duration-300"
                                  style={{ width: `${masteryRate}%` }}
                                ></div>
                              </div>

                              {/* Study Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/60">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDeckId(deck.id);
                                    setSessionMode("studying");
                                  }}
                                  className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <Play className="w-3 h-3 text-slate-500" /> Study Flip
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDeckId(deck.id);
                                    setSessionMode("quizzing");
                                  }}
                                  className="py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                                >
                                  <CheckSquare className="w-3 h-3 text-amber-400" /> Start Quiz
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN VIEW */}
              {activeTab === "admin" && (
                <AdminView currentUserId={user.uid} />
              )}

              {/* NOTES VIEW */}
              {activeTab === "notes" && (
                <NotesView
                  notes={notes}
                  onDeleteNote={deleteNote}
                />
              )}

              {/* ACCOUNT SETTINGS VIEW */}
              {activeTab === "account" && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-display text-slate-900">{user.displayName || "Study User"}</h2>
                        <p className="text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-8">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Account Actions</h3>
                      <button
                        onClick={() => {
                          auth.signOut();
                          setActiveTab("library");
                        }}
                        className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-medium rounded-xl text-sm flex items-center justify-center w-full sm:w-auto transition-all"
                      >
                        Sign Out / Switch Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI BUILDER COMPONENT */}
              {activeTab === "ai-builder" && (
                <AIGenerator
                  onDeckGenerated={handleDeckCreated}
                  existingDecks={decks}
                  onAddCardsToDeck={handleAddCardsToDeck}
                  onSaveNotes={(title, content) => {
                    addNote(title, content);
                    setActiveTab("notes");
                  }}
                />
              )}

              {/* TAB 3: MANUAL DECK CREATOR */}
              {activeTab === "manual-builder" && (
                <ManualCreator
                  existingDecks={decks}
                  onDeckCreated={handleDeckCreated}
                  onAddCardsToDeck={handleAddCardsToDeck}
                  onClose={() => setActiveTab("library")}
                />
              )}

              {/* TAB 4: VISUAL ANALYTICS */}
              {activeTab === "analytics" && (
                <Analytics
                  stats={stats}
                  decks={decks}
                  onStartSuggestedStudy={handleStartSuggested}
                  onDeckGenerated={handleDeckCreated}
                />
              )}

              {/* TAB 5: AI TUTOR CHAT */}
              {activeTab === "tutor" && (
                <TutorChat
                  decks={decks}
                  initialDeckId={tutorDeckId}
                  onClose={() => setActiveTab("library")}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* INSPECTION MODAL DRAWER FOR DECK INSPECTION */}
      <AnimatePresence>
        {inspectingDeckId && inspectedDeck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end"
            onClick={() => setInspectingDeckId(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-display font-extrabold text-slate-900 leading-tight">
                    {inspectedDeck.name}
                  </h2>
                  <button
                    onClick={() => setInspectingDeckId(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-6">{inspectedDeck.description}</p>
                
                {/* Visual counts */}
                <div className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">TOTAL CARDS</span>
                    <span className="text-slate-900 font-mono font-bold text-sm">{inspectedDeck.cards.length}</span>
                  </div>
                  <div className="border-l border-slate-200/50 pl-4">
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">MASTERED</span>
                    <span className="text-slate-900 font-mono font-bold text-sm">
                      {inspectedDeck.cards.filter((c) => c.mastered).length}
                    </span>
                  </div>
                  <div className="border-l border-slate-200/50 pl-4">
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">DIFFICULTY</span>
                    <span className="text-slate-900 capitalize font-bold text-sm">
                      {inspectedDeck.cards[0]?.difficulty || "Medium"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cards List Scroller */}
              <div className="flex-grow overflow-y-auto pr-1 space-y-3 custom-scrollbar mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Card Listing Details
                </span>
                {inspectedDeck.cards.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No cards inside this deck yet.</p>
                ) : (
                  inspectedDeck.cards.map((card, idx) => (
                    <div key={card.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-left">
                      <div className="flex justify-between items-center gap-3 mb-1.5">
                        <span className="font-bold text-slate-700">Card #{idx + 1}</span>
                        <button
                          onClick={() => handleToggleCardMastery(inspectedDeck.id, card.id)}
                          className={`font-bold px-2 py-0.5 rounded text-[8px] uppercase tracking-wider transition-all cursor-pointer border ${
                            card.mastered
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/60"
                              : "bg-slate-100 text-slate-400 border-slate-200/50 hover:bg-slate-200/50"
                          }`}
                        >
                          {card.mastered ? "✓ Mastered" : "Unmastered"}
                        </button>
                      </div>
                      <p className="text-slate-900 font-medium mb-1 font-sans break-words">
                        <span className="text-slate-400 font-semibold">Q:</span> {card.front}
                      </p>
                      <p className="text-slate-500 font-sans break-words">
                        <span className="text-slate-400 font-semibold">A:</span> {card.back}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Quick Play */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setTutorDeckId(inspectedDeck.id);
                    setActiveTab("tutor");
                    setInspectingDeckId(null);
                  }}
                  className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-100/50"
                >
                  <GraduationCap className="w-4 h-4" /> Open Socratic AI Tutor Room
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setActiveDeckId(inspectedDeck.id);
                      setSessionMode("studying");
                      setInspectingDeckId(null);
                    }}
                    className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Review Flip Cards
                  </button>
                  <button
                    onClick={() => {
                      setActiveDeckId(inspectedDeck.id);
                      setSessionMode("quizzing");
                      setInspectingDeckId(null);
                    }}
                    className="py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> Start Recall Quiz
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Humble Footer */}
      <footer className="mt-auto py-6 bg-white border-t border-slate-100 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 QuizGenius. Synthesized and studied offline-first with absolute privacy.</p>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab("library")} className="hover:text-slate-700 font-medium">Library</button>
            <button onClick={() => setActiveTab("ai-builder")} className="hover:text-slate-700 font-medium">AI Architect</button>
            <button onClick={() => setActiveTab("analytics")} className="hover:text-slate-700 font-medium">Analytics</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
