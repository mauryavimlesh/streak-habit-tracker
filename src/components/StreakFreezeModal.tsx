import React, { useState, useEffect } from 'react';
import {
  X,
  Snowflake,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react';
import {
  StreakFreezeConfig,
  getFreezeStatus,
  FreezeStatus,
} from '../lib/streakEngine';
import {
  getStoredFreezeConfig,
  saveStoredFreezeConfig,
  planDayOff,
  unplanDayOff,
} from '../lib/freezeService';
import { getTodayDateKey, addDays } from '../lib/dateUtils';

interface StreakFreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onFreezeChange?: (config: StreakFreezeConfig) => void;
}

export const StreakFreezeModal: React.FC<StreakFreezeModalProps> = ({
  isOpen,
  onClose,
  userId,
  onFreezeChange,
}) => {
  const [config, setConfig] = useState<StreakFreezeConfig>(() => getStoredFreezeConfig(userId));
  const [freezeStatus, setFreezeStatus] = useState<FreezeStatus>(() => getFreezeStatus(config));
  const [customDate, setCustomDate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const todayStr = getTodayDateKey();
  const tomorrowStr = addDays(todayStr, 1);

  const refreshState = (newConfig: StreakFreezeConfig) => {
    setConfig(newConfig);
    setFreezeStatus(getFreezeStatus(newConfig, todayStr));
    if (onFreezeChange) {
      onFreezeChange(newConfig);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const current = getStoredFreezeConfig(userId);
      refreshState(current);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handlePlanDay = (dateStr: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = planDayOff(dateStr, userId);
    if (!result.success) {
      setErrorMessage(result.reason || 'Failed to plan day off');
    } else {
      refreshState(result.config);
      setSuccessMessage(`Protected ${dateStr} with a streak freeze!`);
    }
  };

  const handleCancelDay = (dateStr: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const updated = unplanDayOff(dateStr, userId);
    refreshState(updated);
    setSuccessMessage(`Restored freeze slot from ${dateStr}.`);
  };

  const handleToggleAutoConsume = () => {
    const updated: StreakFreezeConfig = {
      ...config,
      autoConsume: !config.autoConsume,
    };
    saveStoredFreezeConfig(updated, userId);
    refreshState(updated);
  };

  const isTodayPlanned = freezeStatus.protectedDates.includes(todayStr);
  const isTomorrowPlanned = freezeStatus.protectedDates.includes(tomorrowStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#13161d] border border-[#232936] rounded-[24px] p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232936]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#162736] border border-[#1e3d54] flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-[#60a5fa]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#f1f5f9]">Streak Freeze</h3>
              <p className="text-xs text-[#828b9e]">Protect your streak during days off</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#828b9e] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Freeze Capacity Indicator */}
        <div className="my-5 p-4 rounded-2xl bg-[#171b24] border border-[#262e3d] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#9ca2b2]">Freeze Balance</div>
            <div className="text-xl font-bold text-[#60a5fa] mt-0.5">
              {freezeStatus.availableCount} of {freezeStatus.totalAvailable} Available
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: freezeStatus.totalAvailable }).map((_, idx) => {
              const isAvailable = idx < freezeStatus.availableCount;
              return (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    isAvailable
                      ? 'bg-[#1e3d54] border-[#60a5fa]/50 text-[#60a5fa]'
                      : 'bg-white/5 border-white/10 text-white/20'
                  }`}
                  title={isAvailable ? 'Available Freeze' : 'Consumed/Reserved'}
                >
                  <Snowflake className="w-4 h-4" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Protect Buttons */}
        <div className="space-y-2 mb-5">
          <div className="text-xs font-semibold text-[#828b9e] uppercase tracking-wider">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => (isTodayPlanned ? handleCancelDay(todayStr) : handlePlanDay(todayStr))}
              disabled={!isTodayPlanned && freezeStatus.availableCount <= 0}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isTodayPlanned
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                  : freezeStatus.availableCount > 0
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isTodayPlanned ? 'Freeze Active Today' : 'Freeze Today'}</span>
            </button>

            <button
              onClick={() =>
                isTomorrowPlanned ? handleCancelDay(tomorrowStr) : handlePlanDay(tomorrowStr)
              }
              disabled={!isTomorrowPlanned && freezeStatus.availableCount <= 0}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isTomorrowPlanned
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                  : freezeStatus.availableCount > 0
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isTomorrowPlanned ? 'Freeze Tomorrow' : 'Plan Tomorrow'}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Planning */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-[#828b9e] uppercase tracking-wider mb-2">
            Plan Ahead For Absence
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={customDate}
              min={todayStr}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 bg-[#171b24] border border-[#262e3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
            />
            <button
              onClick={() => {
                if (customDate) {
                  handlePlanDay(customDate);
                  setCustomDate('');
                }
              }}
              disabled={!customDate || freezeStatus.availableCount <= 0}
              className="bg-[#1e3d54] hover:bg-[#254c68] disabled:opacity-40 disabled:cursor-not-allowed text-[#60a5fa] border border-[#60a5fa]/40 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Reserve
            </button>
          </div>
        </div>

        {/* Planned / Active Protected Dates List */}
        {freezeStatus.protectedDates.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-[#828b9e] uppercase tracking-wider mb-2">
              Protected Dates
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {freezeStatus.plannedDates.map((dateKey) => (
                <div
                  key={dateKey}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#171b24] border border-[#262e3d] text-xs"
                >
                  <div className="flex items-center gap-2 text-[#d1d5db]">
                    <Snowflake className="w-3.5 h-3.5 text-[#60a5fa]" />
                    <span>{dateKey} (Planned Day Off)</span>
                  </div>
                  <button
                    onClick={() => handleCancelDay(dateKey)}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                    title="Cancel freeze and restore resource"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {freezeStatus.consumedDates.map((dateKey) => (
                <div
                  key={dateKey}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9ca3af]"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{dateKey} (Streak Saved)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                    Used
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto Protection Toggle */}
        <div className="p-3 rounded-xl bg-[#171b24] border border-[#262e3d] flex items-center justify-between">
          <div className="pr-2">
            <div className="text-xs font-medium text-[#f1f5f9]">Auto-Protection</div>
            <div className="text-[11px] text-[#828b9e]">
              Automatically use an available freeze if you miss an unplanned day
            </div>
          </div>
          <button
            onClick={handleToggleAutoConsume}
            className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${
              config.autoConsume ? 'bg-[#2563eb]' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                config.autoConsume ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Done Button */}
        <div className="mt-5 pt-4 border-t border-[#232936]">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
