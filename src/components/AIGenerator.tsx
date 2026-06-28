import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, Loader2, BookOpen, Layers, CheckCircle2, AlertCircle, Upload, FileText, X, Bookmark } from "lucide-react";
import Markdown from "react-markdown";
import { Deck } from "../types";

interface AIGeneratorProps {
  onDeckGenerated: (name: string, description: string, cards: any[]) => void;
  existingDecks: Deck[];
  onAddCardsToDeck: (deckId: string, cards: any[]) => void;
  onSaveNotes?: (title: string, content: string) => void;
}

const PRESETS = [
  { topic: "Quantum Mechanics Basics", category: "Science", desc: "Wave-particle duality, superposition, Schrödinger's cat" },
  { topic: "Spanish Subjunctive Mood", category: "Languages", desc: "Triggers, conjugation rules, regular and irregular verbs" },
  { topic: "React 19 & Next.js Core Features", category: "Coding", desc: "Server Actions, useActionState, Suspense, client vs server" },
  { topic: "World War I Key Alliances & Turning Points", category: "History", desc: "Triple Entente, Treaty of Versailles, Battle of Marne" },
];

const LOADING_STEPS = [
  "Parsing key terms and logical structures...",
  "Formulating active recall prompts for deep learning...",
  "Distilled conceptual summaries into concise answers...",
  "Formatting memory-jogging hints and metadata tags...",
  "Finalizing flashcard deck structures..."
];

export default function AIGenerator({ onDeckGenerated, existingDecks, onAddCardsToDeck, onSaveNotes }: AIGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [textContent, setTextContent] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [notesFormat, setNotesFormat] = useState<"detailed" | "bullet_points">("detailed");
  
  // Destination
  const [targetMode, setTargetMode] = useState<"new" | "existing" | "notes" | "references">("new");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [generatedNotes, setGeneratedNotes] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // File uploading states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploadingFile(true);
    setFileError(null);
    setUploadedFileName(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to extract text from the file.");
      }

      if (data.text) {
        setTextContent(data.text);
        setUploadedFileName(file.name);
        
        // Auto-populate topic with filename if empty
        if (!topic.trim()) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setTopic(nameWithoutExt);
        }
      } else {
        throw new Error("No text content could be extracted from this file.");
      }
    } catch (err: any) {
      setFileError(err.message || "An error occurred while uploading/extracting text.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFileName(null);
    setTextContent("");
    setFileError(null);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handlePresetClick = (presetTopic: string) => {
    setTopic(presetTopic);
    setTextContent(""); // Reset reference material for standard topics
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && !textContent.trim()) {
      setError("Please specify a topic or paste text reference material.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep(0);

    try {
      if (targetMode === "notes" || targetMode === "references") {
        const endpoint = targetMode === "notes" ? "/api/generate-notes" : "/api/generate-references";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            textContent: textContent.trim(),
            format: notesFormat,
          }),
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || `Failed to generate ${targetMode}.`);
        setGeneratedNotes(data.notes || data.references);
        return;
      }

      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          textContent: textContent.trim(),
          cardCount,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate flashcards.");
      }

      if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        throw new Error("No flashcards could be generated. Try refining your topic/text.");
      }

      if (targetMode === "new") {
        const deckName = topic.trim() 
          ? `AI: ${topic.trim()}` 
          : `AI: Distilled Notes (${new Date().toLocaleDateString()})`;
        const deckDesc = textContent.trim()
          ? `AI-extracted concepts from your custom notes. Target: ${difficulty}`
          : `AI-generated flashcards exploring ${topic.trim()}. Target: ${difficulty}`;

        onDeckGenerated(deckName, deckDesc, data.cards);
        // Clear input
        setTopic("");
        setTextContent("");
      } else {
        const targetDeck = existingDecks.find((d) => d.id === selectedDeckId);
        if (!targetDeck) {
          throw new Error("Selected deck not found.");
        }
        onAddCardsToDeck(selectedDeckId, data.cards);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please verify your internet connection or check your API keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" id="ai-generator-panel">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-display font-semibold text-slate-900">
              AI Flashcard Architect
            </h2>
            <p className="text-sm text-slate-500">
              Instantly transform any subject, article, or study notes into customized active-recall study decks.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-red-800">Generation Failed: </span>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Target Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-1 bg-slate-50 rounded-2xl border border-slate-100/50">
            <button
              type="button"
              onClick={() => setTargetMode("new")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                targetMode === "new"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4" />
                New Deck
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetMode("existing");
                if (existingDecks.length > 0 && !selectedDeckId) {
                  setSelectedDeckId(existingDecks[0].id);
                }
              }}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                targetMode === "existing"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Layers className="w-4 h-4" />
                Existing Deck
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode("notes")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                targetMode === "notes"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Make Notes
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTargetMode("references")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                targetMode === "references"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Bookmark className="w-4 h-4" />
                References
              </span>
            </button>
          </div>

          {targetMode === "existing" && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-sm font-medium text-slate-700">Select Target Deck</label>
              {existingDecks.length === 0 ? (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-amber-700">
                  No custom decks found. Please select "Create New Deck" instead.
                </div>
              ) : (
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                >
                  {existingDecks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name} ({deck.cards.length} cards)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* AI Prompts Area */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Subject or Topic Idea
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis step-by-step, JavaScript Closures, Spanish Preterite"
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                OR UPLOAD STUDY FILES
              </span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Study Materials File Upload (PDF, Images, DOCX, TXT)
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative ${
                  dragActive
                    ? "border-amber-500 bg-amber-50/20"
                    : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.docx"
                />

                {uploadingFile ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <div className="text-sm font-semibold text-slate-700">Analyzing file content with Gemini AI...</div>
                    <p className="text-xs text-slate-400 max-w-xs">Reading document or visual text and preparing study notes.</p>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-2">
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      File Extracted Successfully!
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/50">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{uploadedFileName}</span>
                      <button
                        type="button"
                        onClick={clearUploadedFile}
                        className="text-slate-400 hover:text-slate-600 transition-colors ml-1 cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="file-upload-input" className="cursor-pointer block py-4">
                    <div className="p-3 bg-white rounded-xl text-slate-400 inline-block border border-slate-100 shadow-xs mb-3">
                      <Upload className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mb-1">
                      Drag & drop your study file here, or <span className="text-slate-950 underline font-bold">browse</span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Supports PDF, images (PNG, JPG), Word (DOCX), or plain text (TXT, MD). Max file size 20MB.
                    </p>
                  </label>
                )}
              </div>

              {fileError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-widest">
                OR PASTE RESOURCE MATERIAL
              </span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">
                Source Document/Notes/Text Reference
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={5}
                placeholder="Paste an article, lecture transcript, definition, chapter summary, or raw text here. Gemini will analyze the text to extract the most high-yield cards..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder-slate-400 resize-none font-sans"
              />
            </div>
          </div>

          {/* Preset Topics Suggestions */}
          {!topic && !textContent && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
                Inspiring Suggestions
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePresetClick(p.topic)}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-left transition-all hover:border-slate-200"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-display font-medium text-slate-800 text-sm">{p.topic}</span>
                      <span className="text-[10px] font-semibold bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {p.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings Grid */}
          {(targetMode === "new" || targetMode === "existing") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Card Quantity: <span className="font-bold text-slate-900">{cardCount}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="5"
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                  <span>5 cards</span>
                  <span>15 cards</span>
                  <span>25 cards</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">
                  Academic Rigor / Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 px-3 border rounded-xl text-xs font-semibold capitalize transition-all ${
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

          {targetMode === "notes" && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-fadeIn">
              <label className="text-sm font-medium text-slate-700 block">
                Notes Format
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {(["detailed", "bullet_points"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setNotesFormat(fmt)}
                    className={`py-2 px-3 border rounded-xl text-sm font-semibold transition-all ${
                      notesFormat === fmt
                        ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {fmt === "detailed" ? "Detailed & Wordy" : "Bullet Points"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-4">
            {loading ? (
              <div className="w-full bg-slate-900 text-white rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <div className="text-center">
                  <p className="font-display font-medium text-sm text-slate-200">
                    {LOADING_STEPS[loadingStep]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Powered by Gemini 3.5 Flash. This takes about 5-10 seconds.
                  </p>
                </div>
                {/* Visual progression dots */}
                <div className="flex gap-1.5 pt-1">
                  {LOADING_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx <= loadingStep ? "bg-amber-400 w-5" : "bg-slate-700"
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={targetMode === "existing" && existingDecks.length === 0}
                className="w-full py-4 px-6 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <span>Generate Smart {targetMode === "notes" ? "Notes" : targetMode === "references" ? "Bibliography" : "Flashcards"}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </form>

        {generatedNotes && (targetMode === "notes" || targetMode === "references") && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl animate-fadeIn">
            <h3 className="text-xl font-bold mb-4 font-display text-slate-900 flex items-center gap-2">
              {targetMode === "references" ? <Bookmark className="w-5 h-5 text-indigo-500" /> : <FileText className="w-5 h-5 text-indigo-500" />}
              {targetMode === "references" ? "Your Bibliography" : "Your AI Study Notes"}
            </h3>
            <div className="markdown-body text-slate-700 text-sm leading-relaxed">
              <Markdown>{generatedNotes}</Markdown>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {onSaveNotes && (
                <button 
                  onClick={() => {
                    const noteTitle = topic.trim() || uploadedFileName || (targetMode === "references" ? "Bibliography" : "AI Generated Notes");
                    onSaveNotes(noteTitle, generatedNotes);
                    setGeneratedNotes("");
                    setTopic("");
                    setTextContent("");
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors"
                >
                  Save to Notes
                </button>
              )}
              <button 
                onClick={() => setGeneratedNotes("")}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
              >
                Clear Notes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
