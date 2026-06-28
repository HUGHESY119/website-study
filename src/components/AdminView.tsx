import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, Trash2, Users, Calendar, Ban } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminViewProps {
  currentUserId: string;
}

interface UserData {
  uid: string;
  email: string;
  createdAt: string;
  stats?: any;
  banned?: boolean;
}

export default function AdminView({ currentUserId }: AdminViewProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData: UserData[] = [];
      usersSnap.forEach(doc => {
        usersData.push(doc.data() as UserData);
      });
      setUsers(usersData);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { banned: !currentBanStatus });
      setUsers(users.map(u => u.uid === userId ? { ...u, banned: !currentBanStatus } : u));
    } catch (err: any) {
      console.error("Error updating ban status:", err);
      alert("Failed to update user: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user's data? This cannot be undone.")) return;
    
    try {
      // Delete decks
      const decksRef = collection(db, 'users', userId, 'decks');
      const decksSnap = await getDocs(decksRef);
      for (const d of decksSnap.docs) {
        // Delete cards in deck
        const cardsRef = collection(d.ref, 'cards');
        const cardsSnap = await getDocs(cardsRef);
        for (const c of cardsSnap.docs) {
          await deleteDoc(c.ref);
        }
        await deleteDoc(d.ref);
      }

      // Delete notes
      const notesRef = collection(db, 'users', userId, 'notes');
      const notesSnap = await getDocs(notesRef);
      for (const n of notesSnap.docs) {
        await deleteDoc(n.ref);
      }

      // Delete user
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.uid !== userId));
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-full flex flex-col gap-6">
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-3">
            <Shield className="w-6 h-6 text-indigo-400" />
            Admin Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage users and application data</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl">
          <Users className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-lg">{users.length}</span>
          <span className="text-slate-400 text-sm">Total Users</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500">
            <Shield className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-semibold">{error}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="grid gap-3">
              {users.map(u => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={u.uid} 
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl"
                >
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      {u.email}
                      {u.banned && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Banned</span>}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                      {u.stats && (
                        <span>
                          Cards viewed: {u.stats.totalCardsViewed || 0}
                        </span>
                      )}
                      {u.uid === currentUserId && (
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">You</span>
                      )}
                    </div>
                  </div>
                  
                  {u.uid !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleBan(u.uid, !!u.banned)}
                        className={`p-2 rounded-xl transition-colors ${u.banned ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                        title={u.banned ? "Unban User" : "Ban User"}
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.uid)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete User Data"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
