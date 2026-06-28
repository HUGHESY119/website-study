export interface Flashcard {
  id: string;
  front: string; // The prompt, question, or term
  back: string;  // The answer, explanation, or definition
  hint?: string; // Optional hint for study help
  tags?: string[]; // Subject tags (e.g., Vocabulary, History)
  mastered?: boolean; // Spaced repetition state: whether user has mastered it
  difficulty?: 'easy' | 'medium' | 'hard';
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Flashcard[];
  createdAt: string;
  lastStudiedAt?: string;
}

export interface StudySession {
  deckId: string;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  durationSeconds: number;
  timestamp: string;
}

export interface UserStats {
  streak: number;
  lastStudyDate?: string;
  totalCardsViewed: number;
  totalCardsMastered: number;
  studySessions: StudySession[];
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
}
