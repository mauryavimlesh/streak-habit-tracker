import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  getAllTasks,
  subscribeToTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
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
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Calendar() {
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAddBottomSheetOpen, setIsAddBottomSheetOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [modalType, setModalType] = useState<'task' | 'meeting' | 'event' | 'reminder'>('task');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Gesture tracking for touch & pointer swipes
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragYOffset, setDragYOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Real-time task synchronization via Firestore and local cache
  useEffect(() => {
    const unsubscribe = subscribeToTasks(user?.uid, (updatedTasks) => {
      setTasks(updatedTasks);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Keep viewMonthDate in sync when user selects a date from another month
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (
      date.getMonth() !== viewMonthDate.getMonth() ||
      date.getFullYear() !== viewMonthDate.getFullYear()
    ) {
      setViewMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  // Jump to today
  const handleResetToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // 7 Days of the currently selected week (Monday-based)
  const currentWeekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Monday=0, Tuesday=1, ..., Sunday=6
    const mondayDiff = (dayOfWeek + 6) % 7;

    const monday = new Date(d);
    monday.setDate(d.getDate() - mondayDiff);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  }, [selectedDate]);

  // Navigate week
  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
    setViewMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
    setViewMonthDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  // Navigate month
  const handlePrevMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1));
  };

  // Task map for fast indicator dots on calendar days
  const taskDatesMap = useMemo(() => {
    const map: Record<
      string,
      { count: number; completedCount: number; hasHighPriority: boolean }
    > = {};

    tasks.forEach((t) => {
      if (!map[t.date]) {
        map[t.date] = { count: 0, completedCount: 0, hasHighPriority: false };
      }
      map[t.date].count += 1;
      if (t.completed) {
        map[t.date].completedCount += 1;
      }
      if (t.priority === 'high' && !t.completed) {
        map[t.date].hasHighPriority = true;
      }
    });

    return map;
  }, [tasks]);

  // Selected date key: YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Tasks for the selected date
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => t.date === selectedDateStr);
  }, [tasks, selectedDateStr]);

  // Calculate score for display (reflecting completion rate)
  const streakScore = useMemo(() => {
    if (selectedDateTasks.length === 0) return 68;
    const completed = selectedDateTasks.filter((t) => t.completed).length;
    const ratio = completed / selectedDateTasks.length;
    return Math.round(50 + ratio * 45);
  }, [selectedDateTasks]);

  // Task CRUD operations
  const handleToggleTask = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const willBeCompleted = targetTask ? !targetTask.completed : true;

    // Tactile 'premium OS' feedback via navigator.vibrate()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (willBeCompleted) {
          navigator.vibrate([40, 60, 40]);
        } else {
          navigator.vibrate(15);
        }
      } catch {
        // Ignore
      }
    }

    // Instant optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    await toggleTaskComplete(taskId, user?.uid);
  };

  const handleOpenAddModal = (type: 'task' | 'meeting' | 'event' | 'reminder' = 'task') => {
    setEditingTask(null);
    setModalType(type);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setModalType(task.type || 'task');
    setIsTaskModalOpen(true);
  };

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

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;
    const id = deletingTaskId;
    setDeletingTaskId(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTask(id, user?.uid);
  };

  // Gesture handlers for smooth swiping between compact week view and expanded month view
  const handleDragStart = (clientX: number, clientY: number) => {
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    };
    setIsSwiping(true);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const deltaY = clientY - dragStartRef.current.y;
    // Provide tactile elastic resistance during pull
    const elasticY = Math.sign(deltaY) * Math.min(24, Math.abs(deltaY) * 0.35);
    setDragYOffset(elasticY);
  };

  const handleDragEnd = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    const elapsed = Date.now() - dragStartRef.current.time;
    dragStartRef.current = null;
    setIsSwiping(false);
    setDragYOffset(0);

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
  };

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
          streakScore={streakScore}
        />

        {/* Interactive Calendar Section (Supports smooth slide-down / slide-up gestures & touch swiping) */}
        <motion.div
          animate={{ y: dragYOffset }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onMouseMove={(e) => {
            if (isSwiping) handleDragMove(e.clientX, e.clientY);
          }}
          onMouseUp={(e) => {
            if (isSwiping) handleDragEnd(e.clientX, e.clientY);
          }}
          className="rounded-[28px] bg-[#11131a] border border-[#1d222e] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors hover:border-[#2d3448] touch-pan-y select-none"
        >
          <AnimatePresence mode="wait">
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
        </motion.div>

        {/* Day Schedule & Task Details for Selected Date */}
        <DaySchedule
          selectedDate={selectedDate}
          tasks={selectedDateTasks}
          onToggleTask={handleToggleTask}
          onEditTask={handleEditTask}
          onDeleteTask={(id) => setDeletingTaskId(id)}
          onOpenAddModal={handleOpenAddModal}
          streakScore={streakScore}
        />
      </div>

      {/* Floating Bottom Action Button with Luminous Green Aura (Matching Reference) */}
      <div className="fixed bottom-[88px] right-5 sm:right-[max(1.25rem,calc(50%-200px))] z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setIsActionMenuOpen(true)}
          aria-label="Create New"
          className="w-14 h-14 rounded-full bg-accent-primary text-[#0a0c10] flex items-center justify-center shadow-[0_0_24px_rgba(140,238,40,0.4)] hover:shadow-[0_0_36px_rgba(140,238,40,0.65)] transition-all cursor-pointer"
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
    </div>
  );
}
