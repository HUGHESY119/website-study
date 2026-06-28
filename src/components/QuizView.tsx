import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, ArrowLeft, Check, X, AlertCircle, HelpCircle, 
  RotateCcw, Sparkles, BookOpen, Clock, Activity, Settings
} from "lucide-react";
import { Deck, Flashcard, StudySession } from "../types";

interface QuizViewProps {
  deck: Deck;
  onClose: () => void;
  onQuizCompleted: (session: StudySession, cardResults?: { [cardId: string]: boolean }) => void;
}

export default function QuizView({ deck, onClose, onQuizCompleted }: QuizViewProps) {
  const [quizMode, setQuizMode] = useState<"multiple-choice" | "written">("multiple-choice");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  // Written mode states
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [showWrittenResult, setShowWrittenResult] = useState(false);

  // Score keepers
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [cardResults, setCardResults] = useState<{ [cardId: string]: boolean }>({});

  // Time tracker
  const startTimeRef = useRef<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);

  const card = deck.cards[currentIdx];

  // Distractors for multiple choice
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  // Track time
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [quizFinished]);

  // Compile options whenever card index changes
  useEffect(() => {
    if (quizMode === "multiple-choice" && card) {
      const correct = card.back;
      // Get other cards' answers as distractors
      const distractors = deck.cards
        .filter((c) => c.id !== card.id)
        .map((c) => c.back);

      // Shuffle distractors and pick up to 3
      const shuffledDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      // Merge correct answer, shuffle them together
      const allOptions = [...shuffledDistractors, correct].sort(() => 0.5 - Math.random());
      setShuffledOptions(allOptions);
    }
    
    // Reset individual card state
    setSelectedAnswer(null);
    setIsAnswered(false);
    setWrittenAnswer("");
    setShowWrittenResult(false);
  }, [currentIdx, quizMode, card, deck.cards]);

  const handleMultipleChoiceSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === card.back;
    const nextResults = { ...cardResults, [card.id]: isCorrect };
    setCardResults(nextResults);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }
  };

  const handleWrittenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenAnswer.trim()) return;
    setShowWrittenResult(true);
  };

  const handleWrittenEvaluation = (isCorrect: boolean) => {
    const nextResults = { ...cardResults, [card.id]: isCorrect };
    setCardResults(nextResults);
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }
    handleNextCard(nextResults);
  };

  const handleNextCard = (latestResults?: { [cardId: string]: boolean }) => {
    const resultsToUse = (latestResults && typeof latestResults === "object" && !("nativeEvent" in latestResults))
      ? latestResults
      : cardResults;
    if (currentIdx < deck.cards.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Completed!
      setQuizFinished(true);
      
      const finalCorrectAnswers = Object.values(resultsToUse).filter(v => v === true).length;
      const finalIncorrectAnswers = Object.values(resultsToUse).filter(v => v === false).length;

      const session: StudySession = {
        deckId: deck.id,
        cardsStudied: deck.cards.length,
        correctAnswers: finalCorrectAnswers,
        incorrectAnswers: finalIncorrectAnswers,
        durationSeconds: timeSpent,
        timestamp: new Date().toISOString()
      };
      onQuizCompleted(session, resultsToUse);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (deck.cards.length < 2 && quizMode === "multiple-choice") {
    return (
      <div className="max-w-xl mx-auto text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold mb-2">Multiple Choice Requires &ge; 2 Cards</h3>
        <p className="text-sm text-slate-500 mb-6">
          This deck only has {deck.cards.length} card. Please switch to Written mode or add more cards to quiz.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setQuizMode("written")}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold"
          >
            Switch to Written Mode
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" id="quiz-view-panel">
      
      {/* Session Progress Header */}
      {!quizFinished && (
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> End Quiz
            </button>
            <h2 className="text-base font-display font-bold text-slate-900 line-clamp-1">
              Quiz: {deck.name}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/40">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTime(timeSpent)}</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600">
              {currentIdx + 1}/{deck.cards.length}
            </span>
          </div>
        </div>
      )}

      {/* QUIZ FINISHED VIEW */}
      {quizFinished ? (() => {
        const totalCorrectDisplay = Object.values(cardResults).filter((v) => v === true).length;
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm max-w-xl mx-auto"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
              Quiz Mastered!
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              You've completed the interactive recall test for <span className="font-semibold text-slate-800">{deck.name}</span>.
            </p>

            {/* Stats card */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8">
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">ACCURACY</span>
                <span className="text-2xl font-display font-bold text-slate-900">
                  {Math.round((totalCorrectDisplay / deck.cards.length) * 100)}%
                </span>
              </div>
              <div className="text-center border-x border-slate-200/50">
                <span className="text-xs font-semibold text-slate-400 block mb-1">SCORE</span>
                <span className="text-2xl font-display font-bold text-slate-900">
                  {totalCorrectDisplay}/{deck.cards.length}
                </span>
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">TIME</span>
                <span className="text-2xl font-display font-bold text-slate-900">
                  {formatTime(timeSpent)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setCurrentIdx(0);
                  setCorrectCount(0);
                  setIncorrectCount(0);
                  setCardResults({});
                  setQuizFinished(false);
                  setTimeSpent(0);
                  startTimeRef.current = Date.now();
                }}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" /> Done
              </button>
            </div>
          </motion.div>
        );
      })() : (
        /* ACTIVE QUIZ STAGE */
        <div className="space-y-6">
          
          {/* Quiz Settings / Toggle inside playing screen */}
          {currentIdx === 0 && !isAnswered && !writtenAnswer && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400 animate-spin-slow" />
                <span className="text-xs font-semibold text-slate-700">Quiz Form Format:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuizMode("multiple-choice")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    quizMode === "multiple-choice"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  onClick={() => setQuizMode("written")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    quizMode === "written"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Written Recall
                </button>
              </div>
            </div>
          )}

          {/* Current Question Display */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-xs">
            <div className="mb-4 flex justify-between items-center">
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                Question Card
              </span>
              {card.tags && card.tags.length > 0 && (
                <span className="text-[10px] font-semibold text-slate-400">
                  {card.tags[0]}
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-2xl font-display font-medium text-slate-950 text-center py-6 leading-snug">
              {card.front}
            </h3>
          </div>

          {/* MODE 1: MULTIPLE CHOICE OPTION CLICKS */}
          {quizMode === "multiple-choice" && (
            <div className="grid grid-cols-1 gap-3">
              {shuffledOptions.map((option, index) => {
                let btnStyle = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800";
                let icon = null;

                if (isAnswered) {
                  if (option === card.back) {
                    btnStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium";
                    icon = <Check className="w-4 h-4 text-emerald-500 shrink-0" />;
                  } else if (option === selectedAnswer) {
                    btnStyle = "bg-red-50 border-red-300 text-red-900";
                    icon = <X className="w-4 h-4 text-red-500 shrink-0" />;
                  } else {
                    btnStyle = "bg-white border-slate-100 opacity-60 text-slate-400";
                  }
                }

                return (
                  <button
                    key={index}
                    disabled={isAnswered}
                    onClick={() => handleMultipleChoiceSelect(option)}
                    className={`p-4 rounded-2xl border text-left text-sm flex justify-between items-center transition-all ${btnStyle} ${
                      !isAnswered ? "cursor-pointer" : ""
                    }`}
                  >
                    <span>{option}</span>
                    {icon}
                  </button>
                );
              })}
            </div>
          )}

          {/* MODE 2: WRITTEN RESPONSE INPUT */}
          {quizMode === "written" && (
            <div className="space-y-4">
              {!showWrittenResult ? (
                <form onSubmit={handleWrittenSubmit} className="space-y-3">
                  <textarea
                    required
                    rows={4}
                    value={writtenAnswer}
                    onChange={(e) => setWrittenAnswer(e.target.value)}
                    placeholder="Type your concept recall guess or explanation here..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400 font-sans"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-medium text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      Check Answer
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 bg-white rounded-3xl border border-slate-100 p-6 md:p-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Your Written Answer
                      </span>
                      <p className="text-sm text-slate-700 italic font-sans break-words">{writtenAnswer}</p>
                    </div>

                    <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-900">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        Official Definition
                      </span>
                      <p className="text-sm text-slate-100 font-sans">{card.back}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      How accurate was your written recall?
                    </span>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => handleWrittenEvaluation(false)}
                        className="flex-1 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 text-red-500" /> Correcting Myself (Incorrect)
                      </button>
                      <button
                        onClick={() => handleWrittenEvaluation(true)}
                        className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-emerald-500" /> Spot On! (Correct)
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Action Footer for MC */}
          {quizMode === "multiple-choice" && isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end pt-2"
            >
              <button
                onClick={() => handleNextCard()}
                className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-medium text-xs rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>{currentIdx < deck.cards.length - 1 ? "Next Question" : "View Results"}</span>
                <Check className="w-4 h-4 ml-1" />
              </button>
            </motion.div>
          )}

        </div>
      )}

    </div>
  );
}
