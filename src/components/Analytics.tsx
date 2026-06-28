import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, AreaChart, Area, Cell, PieChart, Pie
} from "recharts";
import { 
  Award, Zap, Layers, CheckCircle2, Clock, Calendar, 
  HelpCircle, ChevronRight, Activity, Smile
} from "lucide-react";
import { UserStats, Deck } from "../types";

interface AnalyticsProps {
  stats: UserStats;
  decks: Deck[];
  onStartSuggestedStudy: () => void;
  onDeckGenerated: (name: string, description: string, cards: any[]) => void;
}

export default function Analytics({ stats, decks, onStartSuggestedStudy, onDeckGenerated }: AnalyticsProps) {
  const [generatingWeakspots, setGeneratingWeakspots] = React.useState(false);
  const [weakspotError, setWeakspotError] = React.useState<string | null>(null);

  const handleGenerateWeakspots = async () => {
    setGeneratingWeakspots(true);
    setWeakspotError(null);
    try {
      const unmastered = decks.flatMap(d => d.cards).filter(c => !c.mastered);
      if (unmastered.length === 0) {
        throw new Error("You have no unmastered cards! Great job.");
      }
      
      const response = await fetch("/api/generate-weakspot-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unmasteredCards: unmastered.slice(0, 50) }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate weakspot deck.");
      }
      if (!data.cards || !data.cards.length) {
        throw new Error("AI returned empty deck.");
      }

      onDeckGenerated("Targeted Weak Spot Quiz", "A dynamically generated quiz focusing on areas you need improvement in.", data.cards);
    } catch (e: any) {
      setWeakspotError(e.message);
    } finally {
      setGeneratingWeakspots(false);
    }
  };
  // Compute totals
  const totalDecks = decks.length;
  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
  
  // Study sessions data
  const chartData = stats.studySessions.map((session, index) => {
    const deck = decks.find((d) => d.id === session.deckId);
    const accuracy = session.cardsStudied > 0 
      ? Math.round((session.correctAnswers / session.cardsStudied) * 100) 
      : 0;

    return {
      sessionNum: `S-${index + 1}`,
      deckName: deck ? deck.name : "Custom Deck",
      accuracy,
      correct: session.correctAnswers,
      studied: session.cardsStudied,
      date: new Date(session.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
  }).slice(-8); // Show last 8 sessions

  // Calculate mastery distribution across all cards
  let totalMasteredCount = 0;
  let totalEasy = 0;
  let totalMedium = 0;
  let totalHard = 0;

  decks.forEach((d) => {
    d.cards.forEach((c) => {
      if (c.mastered) totalMasteredCount++;
      if (c.difficulty === "easy") totalEasy++;
      else if (c.difficulty === "medium") totalMedium++;
      else if (c.difficulty === "hard") totalHard++;
    });
  });

  const masteryRate = totalCards > 0 ? Math.round((totalMasteredCount / totalCards) * 100) : 0;

  const difficultyPieData = [
    { name: "Easy", value: totalEasy || 1, color: "#10b981" },
    { name: "Medium", value: totalMedium || 1, color: "#f59e0b" },
    { name: "Hard", value: totalHard || 1, color: "#ef4444" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" id="analytics-panel">
      
      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        
        {/* Streak card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Streak</span>
            <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg">
              <Zap className="w-4 h-4 fill-orange-500" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 block leading-none">
              {stats.streak} {stats.streak === 1 ? "Day" : "Days"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Keep practicing daily!
            </span>
          </div>
        </div>

        {/* Mastered Rate card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Mastery</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 block leading-none">
              {masteryRate}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {totalMasteredCount} of {totalCards} cards mastered
            </span>
          </div>
        </div>

        {/* Total Decks */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Decks Built</span>
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 block leading-none">
              {totalDecks}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Active study subjects
            </span>
          </div>
        </div>

        {/* Total Cards Viewed */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cards Reviewed</span>
            <div className="p-1.5 bg-purple-50 text-purple-500 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 block leading-none">
              {stats.totalCardsViewed}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Cumulative reviews logged
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-display font-bold text-slate-950">Study Session Accuracy</h3>
              <p className="text-xs text-slate-400">Recall performance trend across your last 8 sessions</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Gemini Analytics
            </span>
          </div>

          {stats.studySessions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Smile className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No session data logged yet.</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                Launch an interactive quiz to log scores and visualize recall trends over time.
              </p>
              <button
                onClick={onStartSuggestedStudy}
                className="py-2 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                Start Practice Now <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#cbd5e1" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#cbd5e1" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                    itemStyle={{ fontSize: "12px", color: "#fff" }}
                    labelStyle={{ fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#0f172a" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#accuracyGrad)" 
                    name="Accuracy %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Side Panel: Rigor Distribution & Suggested Study */}
        <div className="space-y-6">
          
          {/* Rigor distribution */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-950 mb-1">Rigor Distribution</h4>
              <p className="text-[11px] text-slate-400 mb-4">Academic difficulty split across active cards</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyPieData}
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {difficultyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Easy</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{totalEasy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Medium</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{totalMedium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Hard</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{totalHard}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick study recommendation card */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 p-8 bg-white/5 rounded-full rotate-12">
              <Award className="w-16 h-16 text-white/10" />
            </div>
            
            <div className="relative">
              <span className="text-[10px] font-bold bg-white/10 text-amber-300 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                Recall Recommender
              </span>
              <h4 className="text-base font-display font-bold leading-snug">
                Spaced Repetition due!
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                Review cards that you scored as "Struggled" or "Okay" to lock them into long-term biological memory.
              </p>
            </div>

            <div className="space-y-2 relative z-10">
              <button
                onClick={onStartSuggestedStudy}
                disabled={decks.length === 0}
                className="w-full py-2.5 bg-white text-slate-950 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
              >
                Study Recommended Deck
              </button>
              
              <button
                onClick={handleGenerateWeakspots}
                disabled={generatingWeakspots || decks.length === 0}
                className="w-full py-2.5 bg-indigo-600 text-white disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
              >
                {generatingWeakspots ? "Analyzing Weak Spots..." : "Generate Targeted Quiz"}
              </button>
              {weakspotError && <p className="text-red-400 text-[10px] text-center">{weakspotError}</p>}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
