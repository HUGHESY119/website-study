import React, { useState } from "react";
import { Plus, Tag, HelpCircle, Save, BookOpen, FileText, CheckCircle2 } from "lucide-react";
import { Deck, Flashcard } from "../types";

interface ManualCreatorProps {
  existingDecks: Deck[];
  onDeckCreated: (name: string, description: string, cards: any[]) => void;
  onAddCardsToDeck: (deckId: string, cards: any[]) => void;
  onClose: () => void;
}

export default function ManualCreator({ existingDecks, onDeckCreated, onAddCardsToDeck, onClose }: ManualCreatorProps) {
  const [mode, setMode] = useState<"new-deck" | "add-cards">("new-deck");

  // State for creating a brand new empty deck
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [newDeckSuccess, setNewDeckSuccess] = useState(false);

  // State for adding cards to an existing deck
  const [selectedDeckId, setSelectedDeckId] = useState(existingDecks[0]?.id || "");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [hint, setHint] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [addCardSuccess, setAddCardSuccess] = useState(false);

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    onDeckCreated(newDeckName.trim(), newDeckDesc.trim(), []);
    setNewDeckName("");
    setNewDeckDesc("");
    setNewDeckSuccess(true);
    setTimeout(() => setNewDeckSuccess(false), 3000);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    const deckId = selectedDeckId || (existingDecks[0]?.id);
    if (!deckId) return;

    const parsedTags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newCard: Partial<Flashcard> = {
      front: front.trim(),
      back: back.trim(),
      hint: hint.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      difficulty: difficulty,
    };

    onAddCardsToDeck(deckId, [newCard]);

    // Reset card form
    setFront("");
    setBack("");
    setHint("");
    setTagsStr("");
    setDifficulty("medium");
    setAddCardSuccess(true);
    setTimeout(() => setAddCardSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" id="manual-creator-form">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
        
        {/* Toggle Mode */}
        <div className="flex gap-4 p-1 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
          <button
            onClick={() => setMode("new-deck")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === "new-deck"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Create New Study Deck
          </button>
          <button
            onClick={() => {
              setMode("add-cards");
              if (existingDecks.length > 0 && !selectedDeckId) {
                setSelectedDeckId(existingDecks[0].id);
              }
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              mode === "add-cards"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Add Cards to Existing Deck
          </button>
        </div>

        {/* MODE: NEW DECK */}
        {mode === "new-deck" && (
          <form onSubmit={handleCreateDeck} className="space-y-5 animate-fadeIn">
            <div>
              <h2 className="text-xl font-display font-semibold text-slate-900 mb-1">
                Start a New Subject Deck
              </h2>
              <p className="text-xs text-slate-500">
                Establish a new topic container. You can add cards manually or prompt the AI to generate terms later.
              </p>
            </div>

            {newDeckSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Deck successfully created! Return to the Library to inspect or study it.</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Deck Title/Name *
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="e.g., MCAT Organic Chemistry, GRE Vocabulary"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Subject Description / Sub-title
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    value={newDeckDesc}
                    onChange={(e) => setNewDeckDesc(e.target.value)}
                    rows={3}
                    placeholder="Detail what is studied in this deck, target exam dates, or main goals..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-3 px-6 bg-slate-950 hover:bg-slate-900 text-white font-medium rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create Deck
              </button>
            </div>
          </form>
        )}

        {/* MODE: ADD CARDS */}
        {mode === "add-cards" && (
          <form onSubmit={handleAddCard} className="space-y-5 animate-fadeIn">
            <div>
              <h2 className="text-xl font-display font-semibold text-slate-900 mb-1">
                Draft a Custom Flashcard
              </h2>
              <p className="text-xs text-slate-500">
                Manually record definitions, facts, or questions straight into an active library.
              </p>
            </div>

            {addCardSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Card added successfully! You can add another card below.</span>
              </div>
            )}

            {existingDecks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm">
                No decks available to add cards to. Please create a study deck first!
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Choose Destination Study Deck
                  </label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium"
                  >
                    {existingDecks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name} ({deck.cards.length} cards)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Front Side (Prompt/Question) *
                    </label>
                    <textarea
                      required
                      value={front}
                      onChange={(e) => setFront(e.target.value)}
                      rows={4}
                      placeholder="e.g. What is the powerhouse of the cell?"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Back Side (Answer/Explanation) *
                    </label>
                    <textarea
                      required
                      value={back}
                      onChange={(e) => setBack(e.target.value)}
                      rows={4}
                      placeholder="e.g. Mitochondria. It synthesizes ATP via cellular respiration."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Review Hint (Optional clue)
                    </label>
                    <div className="relative">
                      <HelpCircle className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={hint}
                        onChange={(e) => setHint(e.target.value)}
                        placeholder="e.g. Starts with 'M'"
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Categories/Tags (Comma separated)
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                        placeholder="e.g., Biology, Cellular, Exam-Prep"
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                    Intellectual Rigor / Difficulty
                  </label>
                  <div className="flex gap-3">
                    {(["easy", "medium", "hard"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`flex-1 py-2 px-3 border rounded-xl text-xs font-semibold capitalize transition-all ${
                          difficulty === lvl
                            ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-xl text-sm transition-all"
              >
                Return to Library
              </button>
              <button
                type="submit"
                disabled={existingDecks.length === 0}
                className="py-3 px-6 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-medium rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Flashcard
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
