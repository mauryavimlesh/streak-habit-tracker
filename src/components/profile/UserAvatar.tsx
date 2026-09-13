import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBadge?: boolean;
  onBadgeClick?: () => void;
  onClick?: () => void;
  className?: string;
  badgeClassName?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
  '2xl': 'w-24 h-24 text-4xl',
};

const badgeSizeClasses = {
  xs: 'w-3 h-3 p-0.5',
  sm: 'w-4 h-4 p-0.5',
  md: 'w-4.5 h-4.5 p-1',
  lg: 'w-6 h-6 p-1.5',
  xl: 'w-7 h-7 p-1.5',
  '2xl': 'w-8 h-8 p-2',
};

const badgeIconSizes = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
  '2xl': 'w-4.5 h-4.5',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  size = 'md',
  showBadge = false,
  onBadgeClick,
  onClick,
  className,
  badgeClassName,
}) => {
  const [imageError, setImageError] = useState(false);

  // Compute first letter of name, fallback to 'V'
  const resolvedName = (name || 'Vimlesh').trim();
  const initial = resolvedName ? resolvedName.charAt(0).toUpperCase() : 'V';
  const hasPhoto = Boolean(avatarUrl && !imageError && avatarUrl.trim().length > 0);

  return (
    <div className={cn('relative inline-block shrink-0 select-none', className)}>
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-bold tracking-tight',
          'transition-all duration-200 border',
          sizeClasses[size],
          hasPhoto
            ? 'bg-[#181c24] border-white/10 ring-1 ring-white/5'
            : 'bg-[#23381c] border-[#345228]/40 text-accent-primary shadow-[inset_0_0_12px_rgba(140,238,40,0.15)]',
          onClick && 'cursor-pointer active:scale-95 hover:opacity-95'
        )}
      >
        {hasPhoto ? (
          <img
            src={avatarUrl!}
            alt={resolvedName}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : (
          <span className="font-bold">{initial}</span>
        )}
      </div>

      {showBadge && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onBadgeClick) onBadgeClick();
            else if (onClick) onClick();
          }}
          aria-label="Change photo"
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full',
            'bg-accent-primary text-black border-2 border-background',
            'flex items-center justify-center shadow-md',
            'hover:scale-105 active:scale-90 transition-transform cursor-pointer',
            badgeSizeClasses[size],
            badgeClassName
          )}
        >
          <Camera className={cn(badgeIconSizes[size], 'stroke-[2.5]')} />
        </button>
      )}
    </div>
  );
};
export default UserAvatar;
