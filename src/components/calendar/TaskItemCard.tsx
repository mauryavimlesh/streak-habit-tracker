import React from 'react';
import { TaskItem } from '../../lib/taskService';
import { Check, Clock, Trash2, Edit3, Briefcase, Heart, Dumbbell, Calendar as CalendarIcon, Users, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface TaskItemCardProps {
  key?: React.Key;
  task: TaskItem;
  onToggle: (taskId: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
}

export function TaskItemCard({ task, onToggle, onEdit, onDelete }: TaskItemCardProps) {
  // Category-based or type-based icons and colors matching the reference
  const getCategoryConfig = () => {
    if (task.type === 'meeting') {
      return {
        icon: Users,
        iconBg: 'bg-[#212435]',
        iconColor: 'text-[#818cf8]',
        badgeBorder: 'border-[#3730a3]/40',
      };
    }
    if (task.type === 'event') {
      return {
        icon: CalendarIcon,
        iconBg: 'bg-[#2c223a]',
        iconColor: 'text-[#c084fc]',
        badgeBorder: 'border-[#6b21a8]/40',
      };
    }
    if (task.type === 'reminder') {
      return {
        icon: Bell,
        iconBg: 'bg-[#2e2617]',
        iconColor: 'text-[#fbbf24]',
        badgeBorder: 'border-[#78350f]/40',
      };
    }

    switch (task.category) {
      case 'Fitness':
        return {
          icon: Dumbbell,
          iconBg: 'bg-[#1e2f1f]',
          iconColor: 'text-[#8cee28]',
          badgeBorder: 'border-[#2d4d20]',
        };
      case 'Health':
        return {
          icon: Heart,
          iconBg: 'bg-[#172e2b]',
          iconColor: 'text-[#2dd4bf]',
          badgeBorder: 'border-[#134e48]',
        };
      case 'Work':
        return {
          icon: Briefcase,
          iconBg: 'bg-[#222736]',
          iconColor: 'text-[#60a5fa]',
          badgeBorder: 'border-[#1e3a5f]',
        };
      default:
        return {
          icon: Check,
          iconBg: 'bg-[#1f2421]',
          iconColor: 'text-[#8cee28]',
          badgeBorder: 'border-[#273824]',
        };
    }
  };

  const config = getCategoryConfig();
  const IconComponent = config.icon;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Tactile 'premium OS' feedback when marking a task as done
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (!task.completed) {
          navigator.vibrate([40, 50, 35]);
        } else {
          navigator.vibrate(12);
        }
      } catch {
        // ignore
      }
    }
    onToggle(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group relative flex items-center justify-between p-3.5 sm:p-4 rounded-[22px] transition-all duration-200 border select-none',
        task.completed
          ? 'bg-[#111318]/70 border-[#1a1d24] opacity-75'
          : 'bg-[#14161e] border-[#202532] hover:border-[#2f3647] shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
      )}
    >
      {/* Left section: Checkbox/Icon + Title & details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
        {/* Completion Check Button */}
        <button
          type="button"
          aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
          onClick={handleCheckboxClick}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer border',
            task.completed
              ? 'bg-[#23381c] border-[#3b5e28] text-[#8cee28]'
              : `${config.iconBg} ${config.badgeBorder} ${config.iconColor} hover:brightness-110`
          )}
        >
          {task.completed ? (
            <Check className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <IconComponent className="w-4 h-4 stroke-[2.2]" />
          )}
        </button>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                'text-sm font-semibold truncate transition-colors',
                task.completed ? 'text-[#7d8495] line-through' : 'text-white'
              )}
            >
              {task.title}
            </h4>

            {task.priority === 'high' && !task.completed && (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#f87171]" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#7d8495]">
            {task.time && (
              <span className="flex items-center gap-1 font-medium text-[#9da5b6]">
                <Clock className="w-3 h-3" />
                {task.time} {task.timeEnd ? `– ${task.timeEnd}` : ''}
              </span>
            )}

            {task.category && (
              <>
                <span className="text-white/20">•</span>
                <span className="font-medium">{task.category}</span>
              </>
            )}

            {task.type && task.type !== 'task' && (
              <>
                <span className="text-white/20">•</span>
                <span className="capitalize text-[#818cf8]">{task.type}</span>
              </>
            )}
          </div>

          {task.description && (
            <p className="text-[11px] text-[#636a7a] truncate mt-0.5 font-normal">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label="Edit task"
          onClick={() => onEdit(task)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Delete task"
          onClick={() => onDelete(task.id)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#7d8495] hover:text-[#f87171] hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
