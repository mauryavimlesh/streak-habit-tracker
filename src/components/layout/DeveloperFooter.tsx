import React from 'react';
import { StreakLogo } from '../ui/StreakLogo';

export const DeveloperFooter: React.FC = () => {
  return (
    <footer className="pt-8 pb-4 text-center select-none flex flex-col items-center">
      <StreakLogo size={28} className="w-7 h-7 mb-2 opacity-80" />
      <p className="text-[12px] font-medium text-white/50 tracking-wide">
        Developed by <span className="text-white/80 font-semibold">Vimlesh</span>
      </p>
      <p className="text-[11px] text-[#5c6272] mt-1 font-mono tracking-wider">
        © STREAK. All rights reserved.
      </p>
    </footer>
  );
};
export default DeveloperFooter;
