import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Focus } from 'lucide-react';

interface TimerProps {
  isActive: boolean;
  onTimeUpdate?: (seconds: number) => void;
}

const POMODORO_SECONDS = 25 * 60; // 25 minutes

export function Timer({ isActive, onTimeUpdate }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isPomodoro, setIsPomodoro] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => {
          if (isPomodoro && s <= 0) {
             clearInterval(interval);
             // Optional: play sound here or show alert, but for now we just stop at 0
             return 0;
          }
          const newS = isPomodoro ? s - 1 : s + 1;
          if (onTimeUpdate) onTimeUpdate(newS);
          return newS;
        });
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, onTimeUpdate, isPomodoro]);

  const togglePomodoro = () => {
    setIsPomodoro((prev) => {
      const next = !prev;
      setSeconds(next ? POMODORO_SECONDS : 0);
      return next;
    });
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl shadow-sm">
      <button 
        onClick={togglePomodoro}
        className={`px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
          isPomodoro ? "bg-indigo-500 text-white" : "hover:bg-slate-800 text-slate-300"
        }`}
        title="Toggle Pomodoro (25m Focus)"
      >
        <Focus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Pomodoro</span>
      </button>
      <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-sm font-bold border-l border-slate-700">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className={isPomodoro && seconds === 0 ? "text-amber-400 animate-pulse" : ""}>
          {formatTime(seconds)}
        </span>
      </div>
    </div>
  );
}
