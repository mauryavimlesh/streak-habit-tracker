import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center justify-center p-8 text-center min-h-[240px]">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 shadow-glass-sm border border-white/10">
          <Icon className="w-8 h-8 text-text-secondary" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-[240px] mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="liquid-glass-interactive px-6 py-2.5 rounded-full text-sm font-medium text-white shadow-liquid-glass"
        >
          {actionLabel}
        </button>
      )}
    </GlassCard>
  );
}
