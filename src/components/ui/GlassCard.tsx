import React from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
}

export function GlassCard({ children, className, interactive, ...props }: GlassCardProps) {
  return (
    <div 
      className={cn(
        interactive ? "glass-effect-interactive" : "glass-effect",
        "rounded-[28px]",
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
