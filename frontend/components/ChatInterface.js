'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import axios from 'axios';
import ChatSidebar from '@/components/ChatSidebar';
import {
  Send,
  Dumbbell,
  Menu,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fitness-tracker-api-jvja.onrender.com';

export default function ChatInterface() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'stats', 'logger', 'history'
  const [currentTime] = useState(() => Date.now());
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [workoutForm, setWorkoutForm] = useState({
    exercise: '',
    reps: '',
    sets: '1',
    durationMinutes: '',
    notes: '',
  });
  const [deleteModal, setDeleteModal] = useState({ open: false, workoutId: null });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'messages'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(msgs);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          console.info('workouts snapshot size=', snapshot.size);
        } catch {}

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
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/chat`,
        {
          message: userMessage,
          user_id: user.uid,
        },
        {
          timeout: 30000,
        }
      );

      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Detailed error:', error);

      let errorMessage = 'Sorry, something went wrong. Please try again.';

      if (error.code === 'ECONNABORTED') {
        errorMessage =
          'Request timed out. The AI is taking too long to respond. Please try again.';
      } else if (error.response) {
        errorMessage = `Error: ${error.response.data.detail || 'Server error'}`;
      } else if (error.request) {
        errorMessage =
          'Cannot connect to AI server. Make sure backend is running on port 8000.';
      }

      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const logWorkout = async () => {
    if (!user) return;

    const exercise = workoutForm.exercise.trim();
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
        {
          timeout: 10000,
        }
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
        content: `Logged ${exercise} for ${sets} set${sets === 1 ? '' : 's'} x ${reps} reps${
          durationMinutes ? ` over ${durationMinutes} min` : ''
        }. ${response.data.message}`,
        timestamp: new Date(),
      });

      try {
        const feedbackPrompt = `I just logged: ${exercise} — ${sets} sets x ${reps} reps${
          durationMinutes ? `, ${durationMinutes} min` : ''
        }. Please give a brief assessment and any quick tips.`;

        const aiResp = await axios.post(
          `${API_BASE_URL}/api/chat`,
          { message: feedbackPrompt, user_id: user.uid },
          { timeout: 20000 }
        );

        if (aiResp?.data?.response) {
          await addDoc(collection(db, 'messages'), {
            userId: user.uid,
            role: 'assistant',
            content: aiResp.data.response,
            timestamp: new Date(),
          });
        }
      } catch {
        await addDoc(collection(db, 'messages'), {
          userId: user.uid,
          role: 'assistant',
          content: 'Saved workout — could not fetch AI feedback at the moment.',
          timestamp: new Date(),
        });
      }

      setWorkoutForm({
        exercise: '',
        reps: '',
        sets: '1',
        durationMinutes: '',
        notes: '',
      });
    } catch {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: 'I could not save that workout right now. Please try again in a moment.',
        timestamp: new Date(),
      });
    } finally {
      setLoggingWorkout(false);
    }
  };

  const deleteWorkout = async (workoutId) => {
    if (!user) return;
    
    try {
      const workoutToDelete = workoutHistory.find((w) => w.id === workoutId);
      if (!workoutToDelete) return;

      await deleteDoc(doc(db, 'workouts', workoutId));
      setWorkoutHistory((prev) => prev.filter((w) => w.id !== workoutId));

      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: `Deleted workout: ${workoutToDelete.exercise}. You can always log it again anytime!`,
        timestamp: new Date(),
      });

      setDeleteModal({ open: false, workoutId: null });
    } catch (err) {
      console.error('Error deleting workout:', err);
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'assistant',
        content: 'Failed to delete workout. Please try again.',
        timestamp: new Date(),
      });
    }
  };

  const weeklyWorkouts = workoutHistory.filter((workout) => {
    if (!workout.timestamp) return false;
    const workoutDate = new Date(workout.timestamp);
    const weekAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
    return workoutDate.getTime() >= weekAgo;
  });

  const totalSets = workoutHistory.reduce((total, workout) => total + (Number(workout.sets) || 0), 0);
  const totalReps = workoutHistory.reduce(
    (total, workout) => total + (Number(workout.sets) || 0) * (Number(workout.reps) || 0),
    0
  );
  const totalDuration = workoutHistory.reduce(
    (total, workout) => total + (Number(workout.duration_minutes) || 0),
    0
  );

  const suggestions = [
    'I did 20 pushups today',
    'Build a 4-day strength plan',
    'Estimate calories for a 30 minute run',
    'What should I eat after leg day?',
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        suggestions={suggestions}
        setInput={setInput}
        workoutHistory={workoutHistory}
        weeklyWorkouts={weeklyWorkouts}
        totalReps={totalReps}
        totalSets={totalSets}
        totalDuration={totalDuration}
        workoutForm={workoutForm}
        setWorkoutForm={setWorkoutForm}
        logWorkout={logWorkout}
        loggingWorkout={loggingWorkout}
        setDeleteModal={setDeleteModal}
        user={user}
        logout={logout}
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white">
        {/* Header */}
        <header className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                AI Fitness Coach
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                Ask about workouts, meals, recovery, or training plans
              </p>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl mb-6 shadow-sm">
                  <Dumbbell className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  Welcome to Your Fitness Journey
                </h2>
                <p className="text-slate-500 max-w-md mx-auto mb-10">
                  I can log training, estimate calories, build plans, and keep
                  a running history of your progress.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(suggestion)}
                      className="text-left p-4 bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-indigo-500 rounded-xl hover:shadow-md transition-all duration-200 group flex items-center justify-between"
                    >
                      <p className="text-xs font-medium text-slate-700 group-hover:text-indigo-900">
                        {suggestion}
                      </p>
                      <span className="text-indigo-300 group-hover:text-indigo-500 text-xs transition">
                        &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xl px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium shadow-indigo-500/10'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/60'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200/60 px-5 py-4 rounded-2xl shadow-sm">
                  <div className="flex space-x-1.5 items-center">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-100 px-6 py-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!loading && input.trim()) {
                        sendMessage();
                      }
                    }
                  }}
                  placeholder="Ask about your regimen, diet, or workouts..."
                  rows={1}
                  style={{ maxHeight: '120px' }}
                  disabled={loading}
                  className="w-full px-4 py-3.5 pr-4 border border-slate-200 bg-slate-50/60 text-slate-800 rounded-xl placeholder-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none outline-none text-sm transition"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3.5 rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200 shadow-md shadow-indigo-600/20 group flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center select-none">
              Press Enter to send, Shift + Enter for a new line.
            </p>
          </div>
        </div>

        {/* Delete Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Workout?</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this workout? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, workoutId: null })}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteWorkout(deleteModal.workoutId)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}