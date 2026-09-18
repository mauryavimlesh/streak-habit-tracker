import React, { useState, useEffect } from 'react';
import {
  Archive,
  X,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Tag,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  ArchivedTaskItem,
  getArchivedTasks,
  restoreArchivedTask,
  deleteArchivedTask,
  clearAllArchivedTasks,
  autoArchiveOldCompletedTasks,
} from '../../lib/taskService';
import { diffDays, getTodayDateKey } from '../../lib/dateUtils';

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onTaskRestored?: () => void;
}

export function ArchivedTasksModal({
  isOpen,
  onClose,
  userId,
  onTaskRestored,
}: ArchivedTasksModalProps) {
  const [tasks, setTasks] = useState<ArchivedTaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isArchivingNow, setIsArchivingNow] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadArchived = async () => {
    setLoading(true);
    try {
      const data = await getArchivedTasks(userId);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load archived tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadArchived();
      setConfirmClear(false);
      setActionMessage(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleManualArchiveTrigger = async () => {
    setIsArchivingNow(true);
    setActionMessage(null);
    try {
      const result = await autoArchiveOldCompletedTasks(userId, { force: true, daysThreshold: 30 });
      await loadArchived();
      if (result.archivedCount > 0) {
        setActionMessage(`Successfully archived ${result.archivedCount} completed task${result.archivedCount === 1 ? '' : 's'} older than 30 days.`);
        if (onTaskRestored) onTaskRestored();
      } else {
        setActionMessage('No additional completed tasks older than 30 days found.');
      }
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Manual auto-archive failed:', err);
      setActionMessage('Could not run auto-archive check. Please try again.');
    } finally {
      setIsArchivingNow(false);
    }
  };

  const handleRestore = async (taskId: string) => {
    try {
      await restoreArchivedTask(taskId, userId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setActionMessage('Task restored to active schedule.');
      setTimeout(() => setActionMessage(null), 3000);
      if (onTaskRestored) onTaskRestored();
    } catch (err) {
      console.error('Failed to restore task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteArchivedTask(taskId, userId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete archived task:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllArchivedTasks(userId);
      setTasks([]);
      setConfirmClear(false);
      setActionMessage('Archived task history cleared.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to clear archived tasks:', err);
    }
  };

  const todayKey = getTodayDateKey();

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.date && t.date.includes(q))
    );
  });

  return (
    <div
      id="archived-tasks-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="archived-tasks-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#11131a] border border-[#212634] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#212634] bg-[#141722]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center text-[#60a5fa]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Archived Tasks
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#212634] text-[#94a3b8]">
                  {tasks.length}
                </span>
              </div>
              <p className="text-xs text-[#8e96a8]">
                Historical completed tasks preserved for performance
              </p>
            </div>
          </div>
          <button
            id="archived-modal-close-btn"
            onClick={onClose}
            className="p-1.5 text-[#8e96a8] hover:text-white rounded-lg hover:bg-[#212634] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-[#181c28] px-5 py-3 border-b border-[#212634] flex items-center justify-between gap-3 text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <span>
              Completed tasks older than 30 days are automatically archived to keep your active calendar fast and responsive.
            </span>
          </div>
          <button
            id="trigger-auto-archive-btn"
            onClick={handleManualArchiveTrigger}
            disabled={isArchivingNow}
            className="shrink-0 flex items-center gap-1.5 bg-[#212634] hover:bg-[#2a3144] text-[#e2e8f0] px-2.5 py-1.5 rounded-lg font-medium transition-colors text-xs disabled:opacity-50"
            title="Scan active tasks and move any completed >30 days to archive"
          >
            {isArchivingNow ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
            ) : (
              <Archive className="w-3.5 h-3.5 text-[#38bdf8]" />
            )}
            <span>{isArchivingNow ? 'Scanning...' : 'Archive Now (>30d)'}</span>
          </button>
        </div>

        {/* Alert / Notification message */}
        {actionMessage && (
          <div className="bg-[#102a43] border-b border-[#1e4e79] px-5 py-2 text-xs text-[#70c0ff] flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[#212634] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#13151f]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              id="archived-search-input"
              type="text"
              placeholder="Search archived tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181c28] border border-[#262c3d] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] transition-colors"
            />
          </div>

          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              {confirmClear ? (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <span className="text-xs text-rose-400">Clear all?</span>
                  <button
                    id="confirm-clear-archive-btn"
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                  >
                    Yes, Purge
                  </button>
                  <button
                    id="cancel-clear-archive-btn"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#212634] text-[#cbd5e1] hover:bg-[#2c3346] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="open-clear-archive-btn"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-2 rounded-xl transition-colors border border-rose-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Archive</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-7 h-7 text-[#38bdf8] animate-spin mb-3" />
              <p className="text-xs text-[#8e96a8]">Loading archived tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#181c28] border border-[#262c3d] flex items-center justify-center mb-3 text-[#64748b]">
                <Archive className="w-7 h-7 opacity-70" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">
                {searchQuery ? 'No matching archived tasks' : 'No archived tasks'}
              </h3>
              <p className="text-xs text-[#8e96a8] max-w-sm px-4">
                {searchQuery
                  ? 'Try searching with a different keyword or filter.'
                  : 'Completed tasks older than 30 days will automatically appear here to keep your active planner snappy.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const daysAgo = task.date ? diffDays(task.date, todayKey) : 0;
              return (
                <div
                  key={task.id}
                  id={`archived-task-card-${task.id}`}
                  className="bg-[#141722] border border-[#212634] hover:border-[#2d3447] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-800/40 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-white line-through opacity-90 truncate">
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-[#8e96a8]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#64748b]" />
                          {task.date}
                        </span>
                        {task.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#64748b]" />
                            {task.time}
                          </span>
                        )}
                        {task.category && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1f2433] text-[#94a3b8]">
                            <Tag className="w-2.5 h-2.5" />
                            {task.category}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-[#212634] text-[#38bdf8] font-mono text-[10px]">
                          {daysAgo > 0 ? `${daysAgo}d ago` : 'recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      id={`restore-task-btn-${task.id}`}
                      onClick={() => handleRestore(task.id)}
                      className="flex items-center gap-1 text-xs bg-[#1f2535] hover:bg-[#283147] text-[#93c5fd] hover:text-white px-2.5 py-1.5 rounded-lg border border-[#2d374e] transition-colors"
                      title="Restore task to active calendar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      id={`delete-archived-task-btn-${task.id}`}
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-[#64748b] hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      title="Permanently delete from archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#212634] bg-[#141722] flex items-center justify-between text-xs text-[#8e96a8]">
          <span>
            Showing {filteredTasks.length} of {tasks.length} archived items
          </span>
          <button
            id="archived-modal-done-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#212634] hover:bg-[#2a3144] text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
