'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, deleteDoc, doc } from 'firebase/firestore';
import QuickStats from '@/components/QuickStats';
import axios from 'axios';
import { ArrowLeft, ClipboardList, PlusCircle, LoaderCircle, Menu, X } from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fitness-tracker-api-jvja.onrender.com';

export default function StatsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentTime] = useState(() => Date.now());
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, workoutId: null });
  const [workoutForm, setWorkoutForm] = useState({
    exercise: '',
    reps: '',
    sets: '1',
    durationMinutes: '',
    notes: '',
  });

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

  const logWorkout = async () => {
    const exercise = workoutForm.exercise.trim();
    if (!exercise) return;

    const reps = Number(workoutForm.reps);
    const sets = Number(workoutForm.sets) || 1;
    const durationMinutes = workoutForm.durationMinutes ? Number(workoutForm.durationMinutes) : 0;

    if (!exercise || !Number.isFinite(reps) || reps <= 0) {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: 'Enter an exercise name and a positive rep count to log a workout.',
        timestamp: new Date(),
      });
      return;
    }

    setLoggingWorkout(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/workout/log`,
        {
          exercise,
          reps,
          sets,
          duration_minutes: durationMinutes,
          notes: workoutForm.notes.trim() || null,
          user_id: user.uid,
        },
        { timeout: 10000 }
      );

      const workoutRef = await addDoc(collection(db, 'workouts'), {
        userId: user.uid,
        exercise,
        reps,
        sets,
        duration_minutes: durationMinutes,
        notes: workoutForm.notes.trim() || null,
        timestamp: serverTimestamp(),
      });

      try {
        const optimistic = {
          id: workoutRef.id,
          userId: user.uid,
          exercise,
          reps,
          sets,
          duration_minutes: durationMinutes,
          notes: workoutForm.notes.trim() || null,
          timestamp: Date.now(),
        };
        setWorkoutHistory((prev) => [...prev, optimistic]);
      } catch {}

      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
      });

      setWorkoutForm({ exercise: '', reps: '', sets: '1', durationMinutes: '', notes: '' });
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Workout logged, but AI feedback unavailable.';
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: errMsg,
        timestamp: new Date(),
      });
    } finally {
      setLoggingWorkout(false);
    }
  };

  const deleteWorkout = async (workoutId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'workouts', workoutId));
      setWorkoutHistory((prev) => prev.filter((w) => w.id !== workoutId));
      setDeleteModal({ open: false, workoutId: null });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 overflow-hidden flex flex-col transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 40 }}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Sidebar</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs text-slate-500">Navigation items here</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900">Your Stats</h1>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Quick Stats */}
            <QuickStats 
              workoutHistory={workoutHistory}
              weeklyWorkouts={weeklyWorkouts}
              totalSets={totalSets}
            />

            {/* Workout Logger */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Workout Logger
                  </p>
                  <h3 className="text-xs font-semibold text-slate-900 mt-1">
                    Save a set fast
                  </h3>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-2 text-slate-500">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-2.5">
                <input
                  value={workoutForm.exercise}
                  onChange={(e) => setWorkoutForm((current) => ({ ...current, exercise: e.target.value }))}
                  placeholder="Exercise name"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-500 caret-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={workoutForm.reps}
                    onChange={(e) => setWorkoutForm((current) => ({ ...current, reps: e.target.value }))}
                    placeholder="Reps"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-500 caret-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <input
                    value={workoutForm.sets}
                    onChange={(e) => setWorkoutForm((current) => ({ ...current, sets: e.target.value }))}
                    placeholder="Sets"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-500 caret-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  <input
                    value={workoutForm.durationMinutes}
                    onChange={(e) => setWorkoutForm((current) => ({ ...current, durationMinutes: e.target.value }))}
                    placeholder="Min"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-500 caret-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>
                <textarea
                  value={workoutForm.notes}
                  onChange={(e) => setWorkoutForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Notes or intensity"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-500 caret-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                />
                <button
                  onClick={logWorkout}
                  disabled={loggingWorkout}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loggingWorkout ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Saving
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Log Workout
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Delete Workout?</h2>
            <p className="text-sm text-slate-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, workoutId: null })}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteModal.workoutId && deleteWorkout(deleteModal.workoutId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
