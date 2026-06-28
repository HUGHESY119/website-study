import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, HelpCircle, ArrowLeft, ArrowRight, RotateCw, 
  CheckCircle, RefreshCw, XCircle, VolumeX, Eye
} from "lucide-react";
import { Flashcard, Deck } from "../types";
import { Timer } from "./Timer";

interface FlashcardPlayerProps {
  deck: Deck;
  onClose: () => void;
  onCardReviewed: (cardId: string, rating: "struggled" | "ok" | "mastered") => void;
}

export default function FlashcardPlayer({ deck, onClose, onCardReviewed }: FlashcardPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [srsMode, setSrsMode] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // Effect to rebuild shuffled indices when shuffleMode is toggled
  useEffect(() => {
    if (shuffleMode) {
      const indices = Array.from({ length: deck.cards.length }, (_, i) => i);
      setShuffledIndices(indices.sort(() => Math.random() - 0.5));
    } else {
      setShuffledIndices([]);
    }
  }, [shuffleMode, deck.cards.length]);

  // Compute active deck cards based on modes
  const activeCards = React.useMemo(() => {
    if (srsMode) {
      // SRS Mode: Prioritize unmastered cards, and cards not reviewed recently
      return [...deck.cards].sort((a, b) => {
        // Unmastered cards go first
        if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
        
        // If both have same mastery, sort by review count (fewer reviews first)
        if (a.reviewCount !== b.reviewCount) return a.reviewCount - b.reviewCount;
        
        // Fallback: older lastReviewedAt goes first
        if (a.lastReviewedAt && b.lastReviewedAt) {
          return new Date(a.lastReviewedAt).getTime() - new Date(b.lastReviewedAt).getTime();
        }
        return 0;
      });
    }
    
    if (shuffleMode && shuffledIndices.length === deck.cards.length) {
      return shuffledIndices.map(i => deck.cards[i]);
    }
    
    return deck.cards;
  }, [deck.cards, srsMode, shuffleMode, shuffledIndices]);

  // Ensure index is valid when switching modes
  useEffect(() => {
    setCurrentIndex(0);
  }, [srsMode, shuffleMode, reverseMode]);

  const card = activeCards[currentIndex];

  const currentFront = reverseMode ? card?.back : card?.front;
  const currentBack = reverseMode ? card?.front : card?.back;

  // Auto-unflip when card changes
  useEffect(() => {
    setFlipped(false);
    setShowHint(false);
  }, [currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.code === "ArrowRight") {
        handleNext();
      } else if (e.code === "ArrowLeft") {
        handlePrev();
      } else if (e.code === "Digit1" && flipped) {
        handleScore("struggled");
      } else if (e.code === "Digit2" && flipped) {
        handleScore("ok");
      } else if (e.code === "Digit3" && flipped) {
        handleScore("mastered");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, flipped, activeCards.length]);

  const handleNext = () => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleScore = (rating: "struggled" | "ok" | "mastered") => {
    onCardReviewed(card.id, rating);
    if (currentIndex < activeCards.length - 1) {
      handleNext();
    } else {
      // Finished deck prompt or wrap up
      setFlipped(false);
    }
  };

  const speakText = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid flipping card
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = flipped ? currentBack : currentFront;
    const utterance = new SpeechSynthesisUtterance(textToSpeak || "");
    
    // Detect standard language patterns
    if (deck.name.toLowerCase().includes("spanish") || card.tags?.some(t => t.toLowerCase().includes("spanish"))) {
      utterance.lang = "es-ES";
    } else if (deck.name.toLowerCase().includes("french") || card.tags?.some(t => t.toLowerCase().includes("french"))) {
      utterance.lang = "fr-FR";
    } else {
      utterance.lang = "en-US";
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const progressPercentage = ((currentIndex + 1) / activeCards.length) * 100;

  if (activeCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 px-4" id="empty-player">
        <p className="text-slate-500 mb-4">This deck does not contain any cards yet.</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-xl">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" id="flashcard-player-session">
      {/* Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div className="flex-1">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-display font-semibold text-slate-900 line-clamp-1">
              Studying: {deck.name}
            </h2>
            <Timer isActive={true} />
          </div>
        </div>

        {/* Controls and Progress Tracker */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                SRS
              </span>
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  srsMode ? "bg-slate-900" : "bg-slate-200"
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={srsMode} 
                  onChange={() => {
                    setSrsMode(!srsMode);
                    if (!srsMode) setShuffleMode(false);
                  }}
                  className="sr-only" 
                />
                <div 
                  className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                    srsMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Shuffle
              </span>
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  shuffleMode ? "bg-slate-900" : "bg-slate-200"
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={shuffleMode} 
                  onChange={() => {
                    setShuffleMode(!shuffleMode);
                    if (!shuffleMode) setSrsMode(false); // Can't SRS and Shuffle
                  }}
                  className="sr-only" 
                />
                <div 
                  className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                    shuffleMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Reverse
              </span>
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  reverseMode ? "bg-slate-900" : "bg-slate-200"
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={reverseMode} 
                  onChange={() => setReverseMode(!reverseMode)}
                  className="sr-only" 
                />
                <div 
                  className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                    reverseMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-slate-500">
              {currentIndex + 1} of {activeCards.length}
            </span>
            <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div
                className="bg-slate-900 h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Playable Arena */}
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        
        {/* The 3D Perspective Flip Box */}
        <div 
          onClick={() => setFlipped(!flipped)}
          className="w-full max-w-2xl h-80 sm:h-96 cursor-pointer perspective-1000 group mb-6 relative select-none"
        >
          <div 
            className={`w-full h-full rounded-3xl transform-style-3d transition-transform-gpu relative duration-500 shadow-sm border border-slate-100 hover:shadow-md ${
              flipped ? "rotate-y-180" : ""
            }`}
          >
            {/* FRONT OF CARD */}
            <div className="absolute inset-0 bg-white rounded-3xl backface-hidden p-6 sm:p-8 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-lg">
                  Question / Term
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={speakText}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    title="Read front aloud"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {card.hint && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        showHint ? "bg-amber-50 text-amber-500" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      }`}
                      title="Show study hint"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Front Text */}
              <div className="my-auto text-center px-4">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-medium text-slate-950 tracking-tight leading-snug">
                  {currentFront}
                </h3>
              </div>

              {/* Bottom tag indicators */}
              <div className="flex justify-between items-end">
                <div className="flex flex-wrap gap-1 max-w-[80%]">
                  {card.tags?.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-700 transition-colors">
                  <span>Reveal</span>
                  <RotateCw className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                </div>
              </div>
            </div>

            {/* BACK OF CARD */}
            <div className="absolute inset-0 bg-slate-950 rounded-3xl backface-hidden rotate-y-180 p-6 sm:p-8 flex flex-col justify-between text-white border border-slate-900">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-900 px-2.5 py-1 rounded-lg text-slate-300">
                  Definition / Explanation
                </span>
                <button
                  onClick={speakText}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                  title="Read back aloud"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                </button>
              </div>

              {/* Back Text */}
              <div className="my-auto overflow-y-auto max-h-48 sm:max-h-60 px-4 text-center custom-scrollbar">
                <p className="text-base sm:text-lg md:text-xl font-light text-slate-100 leading-relaxed font-sans">
                  {currentBack}
                </p>
              </div>

              {/* Bottom back footer */}
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-mono text-slate-400">
                  Difficulty: <span className="capitalize font-bold text-slate-300">{card.difficulty || "medium"}</span>
                </span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Flip back</span>
                  <RotateCw className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Study Hint banner */}
        <AnimatePresence>
          {showHint && card.hint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-2xl bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm mb-6"
            >
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Hint:</span> {card.hint}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scoring & Controls Panel */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {flipped ? (
              <motion.div
                key="score-controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col items-center gap-3 w-full"
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  How well did you recall this?
                </span>
                
                {/* Spaced repetition triggers */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  <button
                    onClick={() => handleScore("struggled")}
                    className="py-3 px-4 bg-red-50 hover:bg-red-100/80 border border-red-100 rounded-2xl text-red-700 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <XCircle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold font-display">Struggled</span>
                    <span className="text-[10px] text-red-400 font-mono">Press 1</span>
                  </button>

                  <button
                    onClick={() => handleScore("ok")}
                    className="py-3 px-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-100 rounded-2xl text-amber-700 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className="w-5 h-5 text-amber-500 group-hover:rotate-45 transition-transform" />
                    <span className="text-xs font-bold font-display">Okay</span>
                    <span className="text-[10px] text-amber-400 font-mono">Press 2</span>
                  </button>

                  <button
                    onClick={() => handleScore("mastered")}
                    className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 rounded-2xl text-emerald-700 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold font-display">Mastered!</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Press 3</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="nav-controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-between w-full p-2 bg-slate-50 border border-slate-200/50 rounded-2xl"
              >
                <button
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="p-3 disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                <button
                  onClick={() => setFlipped(true)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Reveal Answer (Space)
                </button>

                <button
                  disabled={currentIndex === activeCards.length - 1}
                  onClick={handleNext}
                  className="p-3 disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard tips footer */}
        <div className="hidden sm:flex items-center justify-center gap-6 mt-8 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono shadow-sm">Space</kbd> Flip Card
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono shadow-sm">←</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono shadow-sm">→</kbd> Navigate Cards
          </span>
        </div>

      </div>
    </div>
  );
}
