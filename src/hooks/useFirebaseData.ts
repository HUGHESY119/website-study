import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Deck, UserStats, Note } from '../types';

export function useFirebaseData() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [decks, setDecks] = useState<Deck[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<UserStats>({
    streak: 0,
    totalCardsViewed: 0,
    totalCardsMastered: 0,
    studySessions: [],
  });
  const [isBanned, setIsBanned] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setDecks([]);
      setNotes([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const userRef = doc(db, 'users', user.uid);
    const decksRef = collection(userRef, 'decks');
    const notesRef = collection(userRef, 'notes');

    // Subscribe to stats
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.banned) {
          setIsBanned(true);
        } else {
          setIsBanned(false);
        }
        if (data.stats) {
          setStats(data.stats as UserStats);
        }
      } else {
        // Initialize user
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          createdAt: new Date().toISOString(),
          stats: {
            streak: 0,
            totalCardsViewed: 0,
            totalCardsMastered: 0,
            studySessions: [],
          }
        });
      }
    });

    // Subscribe to decks
    const unsubDecks = onSnapshot(decksRef, async (querySnapshot) => {
      const fetchedDecks: Deck[] = [];
      for (const d of querySnapshot.docs) {
        const deckData = d.data() as Deck;
        
        // Fetch cards for this deck
        const cardsRef = collection(d.ref, 'cards');
        const cardsSnap = await getDocs(cardsRef);
        deckData.cards = cardsSnap.docs.map(c => c.data() as any);
        
        fetchedDecks.push(deckData);
      }
      setDecks(fetchedDecks);
    });

    // Subscribe to notes
    const unsubNotes = onSnapshot(notesRef, (querySnapshot) => {
      const fetchedNotes: Note[] = [];
      querySnapshot.forEach(doc => {
        fetchedNotes.push(doc.data() as Note);
      });
      // sort by created At descending
      fetchedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotes(fetchedNotes);
      setLoadingData(false);
    });

    return () => {
      unsubUser();
      unsubDecks();
      unsubNotes();
    };
  }, [user]);

  // Methods to update Firebase
  const updateDecks = async (newDecks: Deck[]) => {
    if (!user) return;
    setDecks(newDecks); // optimistic update
    
    const userRef = doc(db, 'users', user.uid);
    for (const deck of newDecks) {
      const deckRef = doc(collection(userRef, 'decks'), deck.id);
      await setDoc(deckRef, {
        id: deck.id,
        userId: user.uid,
        name: deck.name,
        description: deck.description,
        createdAt: deck.createdAt,
        lastStudiedAt: deck.lastStudiedAt || null
      }, { merge: true });

      for (const card of deck.cards) {
        const cardRef = doc(collection(deckRef, 'cards'), card.id);
        await setDoc(cardRef, {
          ...card,
          userId: user.uid,
          deckId: deck.id
        }, { merge: true });
      }
    }
  };

  const updateStats = async (newStats: UserStats) => {
    if (!user) return;
    setStats(newStats); // optimistic update
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { stats: newStats });
  };

  const deleteDeck = async (deckId: string) => {
    if (!user) return;
    setDecks(decks.filter(d => d.id !== deckId));
    const deckRef = doc(db, 'users', user.uid, 'decks', deckId);
    
    // Delete cards subcollection first
    const cardsRef = collection(deckRef, 'cards');
    const cardsSnap = await getDocs(cardsRef);
    for (const c of cardsSnap.docs) {
      await deleteDoc(c.ref);
    }
    
    await deleteDoc(deckRef);
  };

  const addNote = async (title: string, content: string) => {
    if (!user) return;
    const noteId = Date.now().toString() + Math.random().toString(36).substring(7);
    const noteRef = doc(collection(doc(db, 'users', user.uid), 'notes'), noteId);
    const newNote: Note = {
      id: noteId,
      userId: user.uid,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    await setDoc(noteRef, newNote);
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    const noteRef = doc(collection(doc(db, 'users', user.uid), 'notes'), noteId);
    await deleteDoc(noteRef);
  };

  return { user, loadingUser, isBanned, decks, notes, stats, updateDecks, updateStats, deleteDeck, addNote, deleteNote, loadingData };
}
