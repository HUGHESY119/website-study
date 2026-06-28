import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Trash2, BookOpen, GraduationCap, 
  HelpCircle, Lightbulb, MessageSquare, RotateCcw, 
  BrainCircuit, ArrowLeft, Loader2, Compass
} from "lucide-react";
import { Deck } from "../types";
import Markdown from "react-markdown";
import { safeStorage } from "../utils/storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface TutorChatProps {
  decks: Deck[];
  initialDeckId?: string | null;
  onClose?: () => void;
}

export default function TutorChat({ decks, initialDeckId = null, onClose }: TutorChatProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set the preloaded deck if one was specified
  useEffect(() => {
    if (initialDeckId) {
      setSelectedDeckId(initialDeckId);
    }
  }, [initialDeckId]);

  // Load chat history for the selected deck from localStorage
  useEffect(() => {
    const key = `ai_tutor_chat_${selectedDeckId}`;
    const cached = safeStorage.getItem(key);
    if (cached) {
      try {
        setMessages(JSON.parse(cached));
      } catch (e) {
        setMessages([]);
      }
    } else {
      // Setup initial welcome message based on the deck
      const welcomeMsg = getWelcomeMessage(selectedDeckId);
      const initialMsgs: Message[] = [
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMsg,
          timestamp: new Date().toISOString(),
        }
      ];
      setMessages(initialMsgs);
      safeStorage.setItem(key, JSON.stringify(initialMsgs));
    }
    setError(null);
  }, [selectedDeckId]);

  // Save messages to localStorage whenever they change
  const saveMessages = (msgs: Message[]) => {
    setMessages(msgs);
    safeStorage.setItem(`ai_tutor_chat_${selectedDeckId}`, JSON.stringify(msgs));
  };

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getSelectedDeck = (): Deck | undefined => {
    return decks.find(d => d.id === selectedDeckId);
  };

  const getWelcomeMessage = (deckId: string): string => {
    if (deckId === "general") {
      return "Hello! I am your AI Academic Tutor. 🎓\n\nI can help you understand complex concepts, design optimized study plans, or answer questions about any academic field. \n\nHow can I help you learn today? Feel free to type anything or choose a specific study deck from the selector above to focus our tutoring sessions!";
    }
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      return `Hello! I am your personal tutor for **${deck.name}**. 🧠\n\nI have loaded all **${deck.cards.length}** flashcards in this study deck to guide our session. I can:\n- **Quiz you** Socratic-style to test your active recall.\n- **Explain** any of the questions, answers, or underlying concepts.\n- Provide real-world **scenarios and mnemonics** to help you memorize them.\n\nWhat would you like to focus on first?`;
    }
    return "Hello! I am your AI Tutor. Let's learn together!";
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt) return;

    if (!textToSend) {
      setInputValue("");
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);
    setLoading(true);
    setError(null);

    try {
      const activeDeck = getSelectedDeck();
      const deckContext = activeDeck ? {
        name: activeDeck.name,
        description: activeDeck.description,
        cards: activeDeck.cards.map(c => ({
          front: c.front,
          back: c.back,
          hint: c.hint,
        })),
      } : null;

      // Map client-side message list to format suitable for backend route
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          deckContext,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate a tutoring response.");
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: data.response || "I apologize, but I received an empty response. Please try asking again.",
        timestamp: new Date().toISOString(),
      };

      saveMessages([...updatedMessages, assistantMessage]);
    } catch (err: any) {
      console.error("Tutor chat request failed:", err);
      setError(err.message || "An unexpected error occurred. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to reset this chat conversation?")) {
      const welcomeMsg = getWelcomeMessage(selectedDeckId);
      const resetMsgs: Message[] = [
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMsg,
          timestamp: new Date().toISOString(),
        }
      ];
      saveMessages(resetMsgs);
      setError(null);
    }
  };

  // Preset suggested questions based on whether we are in a deck context
  const getSuggestions = () => {
    if (selectedDeckId === "general") {
      return [
        { text: "Help me understand a difficult topic", icon: <Compass className="w-4 h-4 text-sky-500" /> },
        { text: "Explain Socratic learning method", icon: <BrainCircuit className="w-4 h-4 text-amber-500" /> },
        { text: "Create a study plan for exams", icon: <GraduationCap className="w-4 h-4 text-indigo-500" /> },
      ];
    }
    return [
      { text: "Socratic Quiz me on these cards", icon: <BrainCircuit className="w-4 h-4 text-amber-500" /> },
      { text: "Explain the core concepts of this deck", icon: <Lightbulb className="w-4 h-4 text-emerald-500" /> },
      { text: "Give me mnemonics to memorize these", icon: <Sparkles className="w-4 h-4 text-indigo-500" /> },
    ];
  };

  const activeDeck = getSelectedDeck();

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden flex flex-col h-[70vh] min-h-[500px] shadow-sm max-w-4xl mx-auto">
      {/* Upper Control Bar */}
      <div className="bg-white border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center font-display font-bold">
            <GraduationCap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-display font-extrabold text-slate-900 flex items-center gap-1.5">
              AI Tutor Room
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Live
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Active learning partner & personalized study guide
            </p>
          </div>
        </div>

        {/* Deck Selector & Reset action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider hidden md:inline">Focus:</span>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-3 py-2 focus:outline-none transition-colors"
            >
              <option value="general">🌐 General Tutoring (No Deck)</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>
                  📚 {d.name} ({d.cards.length} cards)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-lg transition-all cursor-pointer"
            title="Reset active chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  msg.role === "user"
                    ? "bg-slate-200 text-slate-700 border-slate-300/50"
                    : "bg-slate-950 text-white border-slate-900"
                }`}
              >
                {msg.role === "user" ? (
                  <span className="text-[10px] font-bold">ME</span>
                ) : (
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                )}
              </div>

              {/* Chat Bubble Container */}
              <div className="flex flex-col">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-xs ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white rounded-tr-none"
                      : "bg-white border border-slate-200/60 text-slate-800 rounded-tl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="markdown-body prose prose-slate text-sm max-w-none text-slate-800 leading-relaxed break-words">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                  )}
                </div>
                <span
                  className={`text-[9px] font-mono font-semibold text-slate-400 mt-1 px-1 ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 mr-auto max-w-2xl"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center shrink-0 border border-slate-900">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
            <div className="flex flex-col">
              <div className="bg-white border border-slate-200/60 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs">
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2 max-w-2xl">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (Rendered if only welcome msg exists or user wants quick prompts) */}
      {messages.length === 1 && !loading && (
        <div className="bg-slate-100/50 border-t border-slate-200/40 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Suggested Tutoring Questions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {getSuggestions().map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s.text)}
                className="flex items-center gap-2 text-left p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
              >
                {s.icon}
                <span className="line-clamp-1">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form Input Area */}
      <div className="bg-white border-t border-slate-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            placeholder={
              selectedDeckId === "general"
                ? "Ask anything... (e.g. explain quantum physics)"
                : `Ask about "${activeDeck?.name}"...`
            }
            className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-800 placeholder-slate-400 text-slate-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-slate-950 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
