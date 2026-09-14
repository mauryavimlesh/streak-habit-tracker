import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Trash2, Clock, Play, BarChart2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { getUserActivities, deleteActivity, Activity } from '../../lib/activityService';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { useTimer } from '../../lib/timer/TimerContext';
import { cn } from '../../lib/utils';

export default function ActivityHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: timerState, elapsedMs: timerElapsed } = useTimer();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getUserActivities(user?.uid || 'local');
      setActivities(data);
      setLoading(false);
    }
    load();
  }, [user]);

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteActivity(deletingId, user?.uid);
    setActivities(prev => prev.filter(a => a.id !== deletingId));
    setDeletingId(null);
  };

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayActivities = activities.filter(a => a.date === todayStr);
  const totalTodayMinutes = todayActivities.reduce((acc, a) => acc + a.durationMinutes + (a.durationSeconds / 60), 0);
  const totalTodayHours = Math.floor(totalTodayMinutes / 60);
  const totalTodayMinsRem = Math.floor(totalTodayMinutes % 60);

  const formatTimerDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-[15px]">Focus / Timer</span>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 p-5 overflow-y-auto space-y-8 pb-24">
        {/* Statistics Block */}
        <div className="glass-effect rounded-[28px] p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#7d8495] font-semibold text-xs tracking-wider uppercase mb-1">
            <BarChart2 className="w-4 h-4" /> Today's Focus
          </div>
          <div className="text-4xl font-extrabold tracking-tight text-white">
            {totalTodayHours > 0 ? `${totalTodayHours}h ` : ''}{totalTodayMinsRem}m
          </div>
          <p className="text-sm font-medium text-[#7d8495] mt-1">
            Across {todayActivities.length} session{todayActivities.length !== 1 ? 's' : ''} today
          </p>
        </div>

        {/* Start / Active Session */}
        <div>
          <h3 className="text-xs font-semibold text-[#828899] uppercase tracking-wider mb-3 ml-2">Active Session</h3>
          
          {timerState.status !== 'idle' && timerState.status !== 'completed' ? (
            <div 
              onClick={() => navigate('/activity')}
              className="glass-effect rounded-[24px] p-5 flex items-center justify-between cursor-pointer group border border-accent-primary/20 hover:border-accent-primary/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="22" className="stroke-[#1f232c]" strokeWidth="4" fill="none" />
                    <circle 
                      cx="24" cy="24" r="22" 
                      className="stroke-accent-primary transition-all duration-1000" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      strokeDasharray="138"
                      strokeDashoffset={138 - ((timerElapsed % 60000) / 60000) * 138}
                      fill="none" 
                    />
                  </svg>
                  <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-0.5">{timerState.activityName}</h3>
                  <p className="text-[13px] font-medium text-accent-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                    {timerState.status === 'paused' ? 'Paused' : 'Running'}
                  </p>
                </div>
              </div>
              <div className="text-xl font-mono font-bold">
                {formatTimerDuration(
                  timerState.mode === 'countdown' && timerState.targetDurationMs
                    ? Math.max(0, timerState.targetDurationMs - timerElapsed)
                    : timerElapsed
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/activity')}
              className="w-full glass-effect-interactive rounded-[24px] p-5 flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-accent-primary text-accent-primary ml-1" />
              </div>
              <div className="flex flex-col items-start">
                <h3 className="text-[15px] font-bold text-white mb-0.5">Start New Session</h3>
                <p className="text-[13px] font-medium text-[#7d8495]">Stopwatch, Pomodoro or Countdown</p>
              </div>
            </button>
          )}
        </div>

        {/* History List */}
        <div>
          <h3 className="text-xs font-semibold text-[#828899] uppercase tracking-wider mb-3 ml-2">Recent Sessions</h3>
          {loading ? (
            <div className="text-center text-[#7d8495] py-8 text-sm">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-[24px] bg-surface-card border border-[#1f232c]">
              <p className="text-sm font-medium text-[#7d8495]">No activities recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act, index) => {
                const isToday = act.date === todayStr;
                return (
                  <div key={act.id || index} className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] flex items-center justify-between group hover:border-[#2a2f3d] transition-colors">
                    <div>
                      <h3 className="font-bold text-white text-[15px] mb-1 tracking-tight">{act.name}</h3>
                      <div className="flex items-center gap-2 text-[12px] font-medium text-[#7d8495]">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {act.durationMinutes}m {act.durationSeconds}s</span>
                        <span>·</span>
                        <span>{isToday ? 'Today' : act.date} {act.time}</span>
                        {act.linkedHabitId && (
                          <>
                            <span>·</span>
                            <span className="text-accent-primary border border-accent-primary/20 bg-accent-primary/10 px-1.5 py-0.5 rounded text-[10px] font-bold">LINKED</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setDeletingId(act.id!)}
                      className="p-2.5 rounded-xl hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Activity Session"
        itemType="activity"
      />
    </div>
  );
}
