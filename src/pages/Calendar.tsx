import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  getAllTasks,
  subscribeToTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  updateTaskProgressQuantity,
  readLocalArchivedTasks,
  readLocalTasks,
  deduplicateTasks,
  TaskItem,
} from '../lib/taskService';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { WeekStrip } from '../components/calendar/WeekStrip';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { DaySchedule } from '../components/calendar/DaySchedule';
import { TaskModal } from '../components/calendar/TaskModal';
import { CreateTaskBottomSheet } from '../components/calendar/CreateTaskBottomSheet';
import { AddActionMenu } from '../components/calendar/AddActionMenu';
import { DeleteConfirmModal } from '../components/calendar/DeleteConfirmModal';
import { ArchivedTasksModal } from '../components/calendar/ArchivedTasksModal';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trackCalendarOpened, trackCalendarDateSelected } from '../lib/analyticsService';
import { getHabitLogs, getUserHabits, readLocalHabits, deduplicateHabits, readLocalLogs, Habit, HabitLog } from '../lib/habitService';
import { getUserActivities, getLocalActivities, Activity } from '../lib/activityService';
import { getUserGoals, readLocalGoals, Goal } from '../lib/goalService';
import { getUserJournal, readLocalJournal, JournalEntry } from '../lib/journalService';
import { formatDateKey } from '../lib/dateUtils';
import { buildCalendarDataIndex, selectDayData } from '../lib/calendarSelectors';

export default function Calendar() {
  const { user } = useAuth();

  // State initialized synchronously from local-first storage to prevent empty flash
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [tasks, setTasks] = useState<TaskItem[]>(() => deduplicateTasks(readLocalTasks()));
  const [habits, setHabits] = useState<Habit[]>(() => deduplicateHabits(readLocalHabits()));
  const [logs, setLogs] = useState<HabitLog[]>(() => readLocalLogs());
  const [activities, setActivities] = useState<Activity[]>(() => getLocalActivities());
  const [goals, setGoals] = useState<Goal[]>(() => readLocalGoals());
  const [journals, setJournals] = useState<JournalEntry[]>(() => readLocalJournal());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    trackCalendarOpened();
  }, []);

  // Modals
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAddBottomSheetOpen, setIsAddBottomSheetOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [modalType, setModalType] = useState<'task' | 'meeting' | 'event' | 'reminder'>('task');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archivedCount, setArchivedCount] = useState<number>(() => readLocalArchivedTasks().length);

  // Gesture tracking for touch & pointer swipes (ref-based for buttery 120fps performance without re-render lag)
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Real-time task synchronization via Firestore and local cache
  useEffect(() => {
    const unsubscribe = subscribeToTasks(user?.uid, (updatedTasks) => {
      setTasks(updatedTasks);
      setIsLoading(false);
    });

    async function loadExtraData() {
      if (user) {
        const [h, l, a, g, j] = await Promise.all([
          getUserHabits(user.uid),
          getHabitLogs(user.uid),
          getUserActivities(user.uid),
          getUserGoals(user.uid),
          getUserJournal(user.uid)
        ]);
        setHabits(h);
        setLogs(l);
        setActivities(a);
        setGoals(g);
        setJournals(j);
      } else {
        // Guest user local refresh
        setHabits(deduplicateHabits(readLocalHabits()));
        setLogs(readLocalLogs());
        setActivities(getLocalActivities());
        setGoals(readLocalGoals());
        setJournals(readLocalJournal());
      }
    }
    loadExtraData();

    const onDataUpdated = () => {
      loadExtraData();
    };

    const onTasksArchived = () => {
      setArchivedCount(readLocalArchivedTasks().length);
    };

    window.addEventListener('streak_habits_updated', onDataUpdated);
    window.addEventListener('streak_sleep_updated', onDataUpdated);
    window.addEventListener('streak_goals_updated', onDataUpdated);
    window.addEventListener('streak_activities_updated', onDataUpdated);
    window.addEventListener('streak_tasks_archived', onTasksArchived);
    window.addEventListener('streak_tasks_updated', onTasksArchived);

    return () => {
      unsubscribe();
      window.removeEventListener('streak_habits_updated', onDataUpdated);
      window.removeEventListener('streak_sleep_updated', onDataUpdated);
      window.removeEventListener('streak_goals_updated', onDataUpdated);
      window.removeEventListener('streak_activities_updated', onDataUpdated);
      window.removeEventListener('streak_tasks_archived', onTasksArchived);
      window.removeEventListener('streak_tasks_updated', onTasksArchived);
    };
  }, [user]);

  // Keep viewMonthDate in sync when user selects a date from another month
  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    trackCalendarDateSelected();
    setViewMonthDate((prev) => {
      if (
        date.getMonth() !== prev.getMonth() ||
        date.getFullYear() !== prev.getFullYear()
      ) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
      }
      return prev;
    });
  }, []);

  // Jump to today
  const handleResetToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    setViewMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  // 7 Days of the currently selected week (Monday-based, memoized to preserve object references)
  const currentWeekMondayTime = useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayDiff = (dayOfWeek + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayDiff);
    return monday.getTime();
  }, [selectedDate]);

  const currentWeekDays = useMemo(() => {
    const monday = new Date(currentWeekMondayTime);
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }, [currentWeekMondayTime]);

  // Navigate week
  const handlePrevWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      setViewMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      setViewMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      return newDate;
    });
  }, []);

  // Navigate month
  const handlePrevMonth = useCallback(() => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Selected date key: canonical YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    return formatDateKey(selectedDate);
  }, [selectedDate]);

  // High-performance memoized Calendar Data Index (computed only when underlying collections change)
  const calendarIndex = useMemo(() => {
    return buildCalendarDataIndex({ tasks, habits, logs, activities, goals, journals });
  }, [tasks, habits, logs, activities, goals, journals]);

  const taskDatesMap = calendarIndex.taskDatesMap;

  // Instant O(1) Day Data Query during day navigation
  const dayData = useMemo(() => {
    return selectDayData(calendarIndex, selectedDateStr);
  }, [calendarIndex, selectedDateStr]);

  const selectedDateTasks = dayData.tasks;
  const streakScore = dayData.stats.streakScore;

  // Task CRUD operations
  const handleToggleTask = useCallback(async (taskId: string) => {
    // Tactile 'premium OS' feedback via navigator.vibrate()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // Ignore
      }
    }

    // Instant optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    await toggleTaskComplete(taskId, user?.uid);
  }, [user?.uid]);

  const handleUpdateTaskProgress = useCallback(async (taskId: string, newQty: number) => {
    // Tactile feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // Ignore
      }
    }

    // Instant optimistic update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const target = t.targetQuantity || 1;
          const willBeDone = newQty >= target;
          return {
            ...t,
            progressQuantity: newQty,
            completed: willBeDone,
          };
        }
        return t;
      })
    );

    const updated = await updateTaskProgressQuantity(taskId, newQty, user?.uid);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  }, [user?.uid]);

  const handleOpenAddModal = useCallback((type: 'task' | 'meeting' | 'event' | 'reminder' = 'task') => {
    setEditingTask(null);
    setModalType(type);
    setIsTaskModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: TaskItem) => {
    setEditingTask(task);
    setModalType(task.type || 'task');
    setIsTaskModalOpen(true);
  }, []);

  const handleSaveTask = async (
    taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingTask) {
      // Update existing
      const updated = await updateTask(editingTask.id, taskData, user?.uid);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      }
    } else {
      // Create new
      const created = await createTask(taskData, user?.uid);
      setTasks((prev) => [created, ...prev]);

      // If created on a different date than currently selected, jump to that date to see it!
      if (taskData.date !== selectedDateStr) {
        const parts = taskData.date.split('-').map(Number);
        const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        setSelectedDate(targetDate);
        setViewMonthDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingTaskId) return;
    const id = deletingTaskId;
    setDeletingTaskId(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTask(id, user?.uid);
  }, [deletingTaskId, user?.uid]);

  // Gesture handlers for smooth touch swiping between week and month view
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    };
  }, []);

  const handleDragEnd = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    const elapsed = Date.now() - dragStartRef.current.time;
    dragStartRef.current = null;

    // Quick flick or moderate drag
    const isQuickFlick = elapsed < 350;
    const vThreshold = isQuickFlick ? 25 : 40;
    const hThreshold = isQuickFlick ? 35 : 55;

    // Vertical swipe: switch between compact week view and expanded month view
    if (Math.abs(deltaY) > vThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > 0 && viewMode === 'week') {
        // Swiped down -> Expand to full month
        setViewMode('month');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([10, 20]);
        }
      } else if (deltaY < 0 && viewMode === 'month') {
        // Swiped up -> Collapse to compact week
        setViewMode('week');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([10, 20]);
        }
      }
    } else if (Math.abs(deltaX) > hThreshold) {
      // Horizontal swipe navigation
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
      if (deltaX > 0) {
        // Swiped right -> Previous
        if (viewMode === 'week') handlePrevWeek();
        else handlePrevMonth();
      } else {
        // Swiped left -> Next
        if (viewMode === 'week') handleNextWeek();
        else handleNextMonth();
      }
    }
  }, [viewMode, handleNextWeek, handlePrevWeek, handleNextMonth, handlePrevMonth]);

  const deletingTaskItem = tasks.find((t) => t.id === deletingTaskId);

  return (
    <div className="relative min-h-screen bg-[#0a0b0e] text-white">
      <div className="p-4 sm:p-6 pb-28 space-y-3 max-w-md mx-auto">
        {/* Top Header */}
        <CalendarHeader
          selectedDate={selectedDate}
          viewMode={viewMode}
          onToggleViewMode={() =>
            setViewMode((prev) => (prev === 'week' ? 'month' : 'week'))
          }
          onResetToday={handleResetToday}
          onOpenArchive={() => setIsArchivedModalOpen(true)}
          archivedCount={archivedCount}
          streakScore={streakScore}
        />

        {/* Interactive Calendar Section */}
        <div
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
          className="rounded-[28px] bg-[#11131a] border border-[#1d222e] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors hover:border-[#2d3448] touch-pan-y gpu-layer"
        >
          <AnimatePresence mode="popLayout">
            {viewMode === 'week' ? (
              <motion.div
                key="week-strip-view"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <WeekStrip
                  currentWeekDays={currentWeekDays}
                  selectedDate={selectedDate}
                  todayDate={new Date()}
                  taskDatesMap={taskDatesMap}
                  onSelectDate={handleSelectDate}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  onSlideDown={() => {
                    setViewMode('month');
                    if (navigator.vibrate) navigator.vibrate([10, 20]);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="month-calendar-view"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <MonthCalendar
                  currentMonthDate={viewMonthDate}
                  selectedDate={selectedDate}
                  todayDate={new Date()}
                  taskDatesMap={taskDatesMap}
                  onSelectDate={handleSelectDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onSlideUp={() => {
                    setViewMode('week');
                    if (navigator.vibrate) navigator.vibrate([10, 20]);
                  }}
                  onJumpToday={handleResetToday}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Day Schedule & Task Details for Selected Date */}
        <DaySchedule
          selectedDate={selectedDate}
          tasks={selectedDateTasks}
          dayLogs={dayData.completedLogs}
          dayActivities={dayData.activities}
          dayJournals={dayData.journals}
          totalFocusMinutes={dayData.stats.totalFocusMinutes}
          hasGoalActivities={dayData.stats.hasGoalActivities}
          habits={habits}
          logs={logs}
          activities={activities}
          goals={goals}
          journals={journals}
          onToggleTask={handleToggleTask}
          onEditTask={handleEditTask}
          onDeleteTask={(id) => setDeletingTaskId(id)}
          onUpdateTaskProgress={handleUpdateTaskProgress}
          onOpenAddModal={handleOpenAddModal}
          streakScore={streakScore}
        />
      </div>

      {/* Floating Bottom Action Button with Luminous Green Aura (Matching Reference) */}
      <div
        className="fixed bottom-[88px] right-5 sm:right-[max(1.25rem,calc(50%-200px))] z-40 action-button-container floating-action-button"
        data-action-button
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setIsActionMenuOpen(true)}
          aria-label="Create New"
          className="w-14 h-14 rounded-full bg-accent-primary text-[#0a0c10] flex items-center justify-center shadow-[0_0_24px_rgba(140,238,40,0.4)] hover:shadow-[0_0_36px_rgba(140,238,40,0.65)] transition-all cursor-pointer action-button"
        >
          <Plus className="w-7 h-7 stroke-[2.8]" />
        </motion.button>
      </div>

      {/* Quick Add Action Menu ("Create New" Bottom Sheet) */}
      <AddActionMenu
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        onSelectAction={(actionType) => {
          setIsActionMenuOpen(false);
          setModalType(actionType);
          setIsAddBottomSheetOpen(true);
        }}
      />

      {/* Glass-Effect Bottom Sheet Component for Creating Tasks */}
      <CreateTaskBottomSheet
        isOpen={isAddBottomSheetOpen}
        onClose={() => setIsAddBottomSheetOpen(false)}
        onSaveTask={handleSaveTask}
        defaultDate={selectedDateStr}
        initialType={modalType}
      />

      {/* Add/Edit Task Modal for Detail Editing */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultDate={selectedDateStr}
        initialType={modalType}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleConfirmDelete}
        title={deletingTaskItem?.title || 'this task'}
      />

      {/* Dedicated Historical Archived Tasks Modal */}
      <ArchivedTasksModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
        userId={user?.uid}
        onTaskRestored={() => {
          setArchivedCount(readLocalArchivedTasks().length);
        }}
      />
    </div>
  );
}
