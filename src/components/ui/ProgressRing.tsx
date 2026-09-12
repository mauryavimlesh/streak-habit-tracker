import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ProgressRingProps {
  percentage: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
  glowColor?: string; // e.g. "rgba(34,211,238,0.5)" for cyan
  colorClass?: string; // e.g. "stroke-accent-cyan"
  trackClass?: string; // e.g. "stroke-white/10"
  className?: string;
  showText?: boolean;
  text?: React.ReactNode;
}

export function ProgressRing({
  percentage,
  size = 72,
  strokeWidth = 12,
  glowColor,
  colorClass = 'stroke-[#A3E635]',
  trackClass = 'stroke-[#262626]',
  className,
  showText = true,
  text,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          className={trackClass} 
          strokeWidth={strokeWidth} 
          fill="none" 
        />
        {/* Progress */}
        <motion.circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          className={colorClass} 
          strokeWidth={strokeWidth} 
          fill="none"
          strokeLinecap="round"
          style={glowColor ? { filter: `drop-shadow(0 0 8px ${glowColor})` } : undefined}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${circumference - offset} ${circumference}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {showText && (
        <div className="relative z-10 flex flex-col items-center justify-center">
          {text ? text : <span className="text-sm font-semibold text-white">{Math.round(clampedPercentage)}%</span>}
        </div>
      )}
    </div>
  );
}
