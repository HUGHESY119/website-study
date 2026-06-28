import React, { useState } from 'react';
import { Note } from '../types';
import Markdown from 'react-markdown';
import { FileText, Trash2, Calendar, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotesViewProps {
  notes: Note[];
  onDeleteNote: (noteId: string) => void;
}

export default function NotesView({ notes, onDeleteNote }: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-full flex flex-col md:flex-row gap-6">
      
      {/* Left sidebar: Note list */}
      <div className="w-full md:w-1/3 bg-white rounded-3xl border border-slate-100 p-6 flex flex-col h-[calc(100vh-140px)]">
        <h2 className="text-xl font-bold font-display text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          My Notes
        </h2>
        
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No notes found. Generate some in the AI Architect!
            </div>
          ) : (
            filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedNote?.id === note.id 
                    ? "bg-indigo-50 border-indigo-100 shadow-sm" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <h3 className="font-semibold text-slate-800 line-clamp-1 mb-1">{note.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Note content */}
      <div className="w-full md:w-2/3 bg-white rounded-3xl border border-slate-100 p-8 flex flex-col h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar relative">
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <motion.div
              key={selectedNote.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl"
            >
              <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">{selectedNote.title}</h1>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Calendar className="w-4 h-4" />
                    Generated on {new Date(selectedNote.createdAt).toLocaleDateString()} at {new Date(selectedNote.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onDeleteNote(selectedNote.id);
                    setSelectedNote(null);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Delete note"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="markdown-body text-slate-700 leading-relaxed text-sm">
                <Markdown>{selectedNote.content}</Markdown>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-slate-400"
            >
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-sm font-medium">Select a note to read</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
