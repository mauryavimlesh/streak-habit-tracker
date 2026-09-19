import React from 'react';
import { cn } from '../../lib/utils';

interface StreakLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  className?: string;
}

/**
 * Authoritative STREAK Official Logo Component.
 * Uses the official 1:1 STREAK torus ring asset.
 */
export const StreakLogo: React.FC<StreakLogoProps> = ({
  size = 40,
  className,
  alt = 'STREAK Logo',
  ...props
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src="/logo.png"
      alt={alt}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      style={{ width: dimension, height: dimension }}
      className={cn(
        'aspect-square object-contain select-none shrink-0',
        props.onClick ? 'cursor-pointer active:scale-95 transition-transform' : '',
        className
      )}
      loading="eager"
      decoding="async"
      {...props}
    />
  );
};

export default StreakLogo;
