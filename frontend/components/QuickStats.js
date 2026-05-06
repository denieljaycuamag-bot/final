import { Activity, Calendar, Flame } from 'lucide-react';

export default function QuickStats({ workoutHistory, weeklyWorkouts, totalSets }) {
  return (
    <div className="space-y-2">
      <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-2xl p-3 flex items-center justify-between gap-2.5">
        <div>
          <p className="text-[11px] font-medium text-indigo-600/80 mb-1">
            Total Logged Workouts
          </p>
          <p className="text-lg font-black tracking-tight text-indigo-700 leading-none">
            {workoutHistory.length}
          </p>
        </div>
        <div className="bg-white/80 p-2 rounded-xl shadow-sm border border-slate-100 text-indigo-600 shrink-0">
          <Activity className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="bg-violet-50/70 border border-violet-100/50 rounded-2xl p-3 flex items-center justify-between gap-2.5">
        <div>
          <p className="text-[11px] font-medium text-violet-600/80 mb-1">
            This Week
          </p>
          <p className="text-lg font-black tracking-tight text-violet-700 leading-none">
            {weeklyWorkouts.length}
          </p>
        </div>
        <div className="bg-white/80 p-2 rounded-xl shadow-sm border border-slate-100 text-violet-600 shrink-0">
          <Calendar className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="bg-amber-50/80 border border-amber-100 rounded-2xl p-3 flex items-center justify-between gap-2.5">
        <div>
          <p className="text-[11px] font-medium text-amber-600/90 mb-1">
            Training Volume
          </p>
          <p className="text-lg font-black tracking-tight text-amber-700 leading-none">
            {totalSets}
          </p>
        </div>
        <div className="bg-white/80 p-2 rounded-xl shadow-sm border border-slate-100 text-amber-600 shrink-0">
          <Flame className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}
