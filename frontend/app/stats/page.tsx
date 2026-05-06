'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import QuickStats from '@/components/QuickStats';
import { ArrowLeft } from 'lucide-react';

interface Workout {
  id: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  timestamp: number;
  [key: string]: any;
}

export default function StatsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentTime] = useState(() => Date.now());
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const raw = d.data();
          let ts = null;
          if (raw.timestamp && typeof raw.timestamp.toMillis === 'function') {
            ts = raw.timestamp.toMillis();
          } else if (raw.timestamp) {
            ts = new Date(raw.timestamp).getTime();
          } else {
            ts = Date.now();
          }

          const sets = Number(raw.sets) || 0;
          const reps = Number(raw.reps) || 0;
          const duration_minutes = Number(raw.duration_minutes) || 0;

          return {
            id: d.id,
            ...raw,
            sets,
            reps,
            duration_minutes,
            timestamp: ts,
          };
        });

        data.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setWorkoutHistory(data);
      },
      (err) => {
        console.error('Workouts listener error:', err);
        setWorkoutHistory([]);
      }
    );

    return unsubscribe;
  }, [user, router]);

  const weeklyWorkouts = workoutHistory.filter((workout) => {
    if (!workout.timestamp) return false;
    const workoutDate = new Date(workout.timestamp);
    const weekAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
    return workoutDate.getTime() >= weekAgo;
  });

  const totalSets = workoutHistory.reduce((total, workout) => total + (Number(workout.sets) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900">Your Stats</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <QuickStats 
          workoutHistory={workoutHistory}
          weeklyWorkouts={weeklyWorkouts}
          totalSets={totalSets}
        />
      </main>
    </div>
  );
}
