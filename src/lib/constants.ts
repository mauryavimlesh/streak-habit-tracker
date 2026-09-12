import { Activity, Droplets, BookOpen, Brain, Dumbbell, Coffee, Sun, Moon, List, Target } from 'lucide-react';

export const HABIT_ICONS = [
  { id: 'activity', icon: Activity },
  { id: 'droplets', icon: Droplets },
  { id: 'book-open', icon: BookOpen },
  { id: 'brain', icon: Brain },
  { id: 'dumbbell', icon: Dumbbell },
  { id: 'coffee', icon: Coffee },
  { id: 'sun', icon: Sun },
  { id: 'moon', icon: Moon },
  { id: 'list', icon: List },
  { id: 'target', icon: Target },
];

export const HABIT_COLORS = [
  { id: 'primary', class: 'bg-accent-primary text-black border-accent-primary', bg: 'bg-accent-primary/20', text: 'text-accent-primary' },
  { id: 'cyan', class: 'bg-accent-cyan text-black border-accent-cyan', bg: 'bg-accent-cyan/20', text: 'text-accent-cyan' },
  { id: 'violet', class: 'bg-accent-violet text-white border-accent-violet', bg: 'bg-accent-violet/20', text: 'text-accent-violet' },
  { id: 'pink', class: 'bg-accent-pink text-white border-accent-pink', bg: 'bg-accent-pink/20', text: 'text-accent-pink' },
  { id: 'orange', class: 'bg-accent-orange text-white border-accent-orange', bg: 'bg-accent-orange/20', text: 'text-accent-orange' },
];

export const getIcon = (id: string) => {
  const found = HABIT_ICONS.find(i => i.id === id);
  return found ? found.icon : Activity;
};

export const getColor = (id: string) => {
  const found = HABIT_COLORS.find(c => c.id === id);
  return found || HABIT_COLORS[0];
};
