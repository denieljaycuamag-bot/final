'use client';

import {
  LogOut,
  Dumbbell,
  User,
  X,
  Activity,
  Calendar,
  Flame,
  LoaderCircle,
  PlusCircle,
  ClipboardList,
  MessageSquare,
  BarChart3,
  History,
} from 'lucide-react';

const navItems = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'stats', label: 'Quick Stats', icon: BarChart3 },
  { id: 'logger', label: 'Log Workout', icon: ClipboardList },
  { id: 'history', label: 'History', icon: History },
];

export default function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  suggestions,
  setInput,
  workoutHistory,
  weeklyWorkouts,
  totalReps,
  totalSets,
  totalDuration,
  workoutForm,
  setWorkoutForm,
  logWorkout,
  loggingWorkout,
  setDeleteModal,
  user,
  logout,
}) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-[17rem] max-w-[84vw] sm:w-[18rem] lg:w-[17rem] xl:w-[17.5rem] bg-white border-r border-slate-200 shadow-2xl lg:shadow-none flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-900 truncate">
                Fitness Tracker
              </span>
              <span className="block text-[10px] text-slate-400 truncate">AI-Powered Coach</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-3 py-3 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' && (
            <div className="space-y-3">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4">
                  <MessageSquare className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">AI Chat Assistant</h3>
                <p className="text-xs text-slate-500 leading-relaxed px-2">
                  Ask me anything about fitness, nutrition, workout plans, or progress tracking.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Quick Prompts
                </p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(suggestion);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all text-xs text-slate-700 hover:text-indigo-900 group"
                  >
                    <span className="flex items-center justify-between">
                      <span>{suggestion}</span>
                      <span className="text-slate-300 group-hover:text-indigo-400 transition">→</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Performance Overview
              </h3>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-indigo-600/80 mb-1">Total Workouts</p>
                    <p className="text-3xl font-black tracking-tight text-indigo-700">
                      {workoutHistory.length}
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl shadow-sm border border-indigo-100">
                    <Activity className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-[10px] text-indigo-600/60 font-medium">All time logged sessions</p>
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-violet-600/80 mb-1">This Week</p>
                    <p className="text-3xl font-black tracking-tight text-violet-700">
                      {weeklyWorkouts.length}
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl shadow-sm border border-violet-100">
                    <Calendar className="w-5 h-5 text-violet-600" />
                  </div>
                </div>
                <p className="text-[10px] text-violet-600/60 font-medium">Last 7 days activity</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-amber-600/80 mb-1">Total Volume</p>
                    <p className="text-3xl font-black tracking-tight text-amber-700">{totalReps}</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl shadow-sm border border-amber-100">
                    <Flame className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-[10px] text-amber-600/60 font-medium">Total reps completed</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Total Sets</p>
                  <p className="text-xl font-black text-slate-700">{totalSets}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-slate-500 mb-1">Total Time</p>
                  <p className="text-xl font-black text-slate-700">{totalDuration}m</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logger' && (
            <div className="space-y-4">
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl mb-3">
                  <ClipboardList className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Log New Workout</h3>
                <p className="text-xs text-slate-500 mt-1">Quick entry for your training</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Exercise Name
                  </label>
                  <input
                    value={workoutForm.exercise}
                    onChange={(e) => setWorkoutForm((current) => ({ ...current, exercise: e.target.value }))}
                    placeholder="e.g., Bench Press"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Reps</label>
                    <input
                      value={workoutForm.reps}
                      onChange={(e) => setWorkoutForm((current) => ({ ...current, reps: e.target.value }))}
                      placeholder="12"
                      inputMode="numeric"
                      className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Sets</label>
                    <input
                      value={workoutForm.sets}
                      onChange={(e) => setWorkoutForm((current) => ({ ...current, sets: e.target.value }))}
                      placeholder="3"
                      inputMode="numeric"
                      className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Min</label>
                    <input
                      value={workoutForm.durationMinutes}
                      onChange={(e) =>
                        setWorkoutForm((current) => ({ ...current, durationMinutes: e.target.value }))
                      }
                      placeholder="15"
                      inputMode="numeric"
                      className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={workoutForm.notes}
                    onChange={(e) => setWorkoutForm((current) => ({ ...current, notes: e.target.value }))}
                    placeholder="Intensity, form notes, etc."
                    rows={3}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  onClick={logWorkout}
                  disabled={loggingWorkout}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/20"
                >
                  {loggingWorkout ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Log Workout
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Workout History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{workoutHistory.length} total sessions</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Volume</p>
                  <p className="text-xs font-bold text-slate-600">
                    {totalSets} sets · {totalDuration}m
                  </p>
                </div>
              </div>

              {workoutHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-2xl mb-3">
                    <History className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No workouts logged yet.
                    <br />
                    Start tracking your progress!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...workoutHistory].reverse().map((workout, index) => (
                    <div
                      key={`${workout.timestamp}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3.5 transition group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{workout.exercise}</h4>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                          {new Date(workout.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                        <span className="font-semibold">
                          {workout.sets || 1} × {workout.reps}
                        </span>
                        {workout.duration_minutes > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{workout.duration_minutes} min</span>
                          </>
                        )}
                      </div>

                      {workout.notes && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                          {workout.notes}
                        </p>
                      )}

                      <button
                        onClick={() => setDeleteModal({ open: true, workoutId: workout.id })}
                        className="w-full px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition opacity-0 group-hover:opacity-100"
                      >
                        Delete Workout
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
        <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {user?.email || 'test@gmail.com'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
