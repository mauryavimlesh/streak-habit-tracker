/**
 * Automated Test Suite: Timezone & Day-Boundary Consistency
 * Verifies consistency between habit completion records, streak calculations,
 * and analytics data across multiple global timezones at day boundaries.
 */

import { formatDateKey, addDays, diffDays, getTodayDateKey, getDayBoundaryTimestamps } from '../src/lib/dateUtils';
import { calculateStreakStats } from '../src/lib/streakEngine';
import {
  computeTimeframeDateRange,
  computeTrendData,
  computeProductivityScore,
  isDateInTimeframe,
} from '../src/lib/analyticsEngine';
import { Habit, HabitLog } from '../src/lib/habitService';
import { TaskItem } from '../src/lib/taskService';
import { Goal } from '../src/lib/goalService';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, message?: string, details?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] [${suite}] ${name}: ${message || 'Assertion failed'}`, details || '');
    results.push({ suite, name, passed: false, message, details });
  } else {
    console.log(`✅ [PASS] [${suite}] ${name}`);
    results.push({ suite, name, passed: true, message });
  }
}

// 8 Representative Global Timezones
export const TIMEZONES = [
  'UTC',
  'America/New_York',    // UTC-5 / UTC-4 (EDT)
  'America/Los_Angeles', // UTC-8 / UTC-7 (PDT)
  'Europe/London',       // UTC+0 / UTC+1 (BST)
  'Asia/Tokyo',          // UTC+9 (JST, no DST)
  'Asia/Kolkata',        // UTC+5:30 (IST, fractional offset)
  'Pacific/Auckland',    // UTC+12 / UTC+13 (NZST/NZDT)
  'Pacific/Honolulu',    // UTC-10 (HST, no DST)
];

export function runAllTimezoneConsistencyTests(): { results: TestResult[]; summary: { total: number; passed: number; failed: number } } {
  console.log('='.repeat(70));
  console.log('🧪 RUNNING TIMEZONE & DAY BOUNDARY CONSISTENCY AUDIT SUITE');
  console.log('='.repeat(70));

  // -----------------------------------------------------------------------------
  // SUITE 1: Day Boundary Transitions & Timestamp Localization
  // -----------------------------------------------------------------------------
  TIMEZONES.forEach((tz) => {
    const testDate = '2026-06-15';
    const boundary = getDayBoundaryTimestamps(testDate, tz);

    // Start of day in tz should format exactly to testDate
    const startKey = formatDateKey(boundary.startMs, tz);
    assert(
      startKey === testDate,
      'Boundary Timestamps',
      `[${tz}] Start of day matches test date (${testDate})`,
      `Expected ${testDate}, got ${startKey}`
    );

    // 1 millisecond before start of day must format to the previous calendar day
    const prevKey = formatDateKey(boundary.startMs - 1, tz);
    assert(
      prevKey === addDays(testDate, -1),
      'Boundary Timestamps',
      `[${tz}] 1ms prior to midnight transitions to yesterday (${addDays(testDate, -1)})`,
      `Expected ${addDays(testDate, -1)}, got ${prevKey}`
    );

    // End of day in tz should format exactly to testDate
    const endKey = formatDateKey(boundary.endMs, tz);
    assert(
      endKey === testDate,
      'Boundary Timestamps',
      `[${tz}] End of day (23:59:59.999) matches test date (${testDate})`,
      `Expected ${testDate}, got ${endKey}`
    );

    // 1 millisecond after end of day must format to tomorrow
    const nextKey = formatDateKey(boundary.endMs + 1, tz);
    assert(
      nextKey === addDays(testDate, 1),
      'Boundary Timestamps',
      `[${tz}] 1ms past midnight transitions to tomorrow (${addDays(testDate, 1)})`,
      `Expected ${addDays(testDate, 1)}, got ${nextKey}`
    );
  });

  // -----------------------------------------------------------------------------
  // SUITE 2: Habit Completion Records at Day Boundaries
  // -----------------------------------------------------------------------------
  TIMEZONES.forEach((tz) => {
    const day1 = '2026-09-17';
    const day2 = addDays(day1, 1); // '2026-09-18'

    const day1Boundary = getDayBoundaryTimestamps(day1, tz);
    const day2Boundary = getDayBoundaryTimestamps(day2, tz);

    // Completion at 23:59:00 on Day 1
    const timeDay1Late = day1Boundary.endMs - 60000;
    // Completion at 00:01:00 on Day 2 (2 minutes later)
    const timeDay2Early = day2Boundary.startMs + 60000;

    const log1Date = formatDateKey(timeDay1Late, tz);
    const log2Date = formatDateKey(timeDay2Early, tz);

    assert(
      log1Date === day1 && log2Date === day2,
      'Habit Logs Rollover',
      `[${tz}] Midnight crossing (23:59 -> 00:01) generates consecutive date keys (${day1} -> ${day2})`,
      `Got ${log1Date} and ${log2Date}`
    );

    // Deduplication test: two completions on same day in same tz
    const logs: HabitLog[] = [
      {
        id: 'l1',
        habitId: 'h1',
        date: log1Date,
        status: 'completed',
        userId: 'u1',
        updatedAt: new Date(timeDay1Late).toISOString(),
      },
      {
        id: 'l1_dup',
        habitId: 'h1',
        date: log1Date,
        status: 'completed',
        userId: 'u1',
        updatedAt: new Date(timeDay1Late + 1000).toISOString(),
      },
      {
        id: 'l2',
        habitId: 'h1',
        date: log2Date,
        status: 'completed',
        userId: 'u1',
        updatedAt: new Date(timeDay2Early).toISOString(),
      },
    ];

    const stats = calculateStreakStats(logs, 'daily', undefined, day2);
    assert(
      stats.currentStreak === 2,
      'Habit Logs Rollover',
      `[${tz}] Streak engine calculates 2 consecutive days despite duplicate completion on Day 1`,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  });

  // -----------------------------------------------------------------------------
  // SUITE 3: Streak Engine Integrity Across Day Boundaries
  // -----------------------------------------------------------------------------
  TIMEZONES.forEach((tz) => {
    const today = getTodayDateKey(tz);
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);
    const threeDaysAgo = addDays(today, -3);

    // Case 3A: Habit completed 3 days in a row up to yesterday, today NOT completed yet
    const logsUpToYesterday: HabitLog[] = [
      { id: '1', habitId: 'h1', date: threeDaysAgo, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: '2', habitId: 'h1', date: twoDaysAgo, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: '3', habitId: 'h1', date: yesterday, status: 'completed', userId: 'u1', updatedAt: '' },
    ];

    const statsBeforeCompletion = calculateStreakStats(logsUpToYesterday, 'daily', undefined, today);
    assert(
      statsBeforeCompletion.currentStreak === 3,
      'Streak Engine',
      `[${tz}] Streak preserved at 3 when yesterday completed and today not yet completed`,
      `Expected 3, got ${statsBeforeCompletion.currentStreak}`
    );

    // Case 3B: User completes habit today -> streak increments to 4
    const logsWithToday: HabitLog[] = [
      ...logsUpToYesterday,
      { id: '4', habitId: 'h1', date: today, status: 'completed', userId: 'u1', updatedAt: '' },
    ];
    const statsAfterCompletion = calculateStreakStats(logsWithToday, 'daily', undefined, today);
    assert(
      statsAfterCompletion.currentStreak === 4,
      'Streak Engine',
      `[${tz}] Completing habit today increments current streak from 3 to 4`,
      `Expected 4, got ${statsAfterCompletion.currentStreak}`
    );

    // Case 3C: User missed yesterday -> streak resets to 0 (or 1 if completed today)
    const logsMissingYesterday: HabitLog[] = [
      { id: '1', habitId: 'h1', date: threeDaysAgo, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: '2', habitId: 'h1', date: twoDaysAgo, status: 'completed', userId: 'u1', updatedAt: '' },
      // yesterday missing!
    ];
    const statsBroken = calculateStreakStats(logsMissingYesterday, 'daily', undefined, today);
    assert(
      statsBroken.currentStreak === 0,
      'Streak Engine',
      `[${tz}] Missing yesterday breaks streak to 0`,
      `Expected 0, got ${statsBroken.currentStreak}`
    );

    // Case 3D: Recovery streak tracking
    const logsRecovery: HabitLog[] = [
      // Historic 5-day best streak
      { id: 'a1', habitId: 'h1', date: addDays(today, -20), status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'a2', habitId: 'h1', date: addDays(today, -19), status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'a3', habitId: 'h1', date: addDays(today, -18), status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'a4', habitId: 'h1', date: addDays(today, -17), status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'a5', habitId: 'h1', date: addDays(today, -16), status: 'completed', userId: 'u1', updatedAt: '' },
      // Current recovery streak of 2 days
      { id: 'b1', habitId: 'h1', date: yesterday, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'b2', habitId: 'h1', date: today, status: 'completed', userId: 'u1', updatedAt: '' },
    ];
    const statsRecovery = calculateStreakStats(logsRecovery, 'daily', undefined, today);
    assert(
      statsRecovery.bestStreak === 5 && statsRecovery.currentStreak === 2 && statsRecovery.recoveryStreak === 2,
      'Streak Engine',
      `[${tz}] Recovery streak accurately identified (best=5, current=2, recovery=2)`,
      `Got best=${statsRecovery.bestStreak}, curr=${statsRecovery.currentStreak}, rec=${statsRecovery.recoveryStreak}`
    );
  });

  // -----------------------------------------------------------------------------
  // SUITE 4: Analytics Data & Timeframe Boundary Alignment
  // -----------------------------------------------------------------------------
  TIMEZONES.forEach((tz) => {
    const today = getTodayDateKey(tz);

    // Test 4A: 7-day date list contains exactly 7 items ending on today
    const range7 = computeTimeframeDateRange('7days', today);
    assert(
      range7.dateList.length === 7 && range7.endDate === today && range7.startDate === addDays(today, -6),
      'Analytics Ranges',
      `[${tz}] 7-day range covers exactly [${addDays(today, -6)} .. ${today}]`,
      `Got ${range7.startDate} to ${range7.endDate}`
    );

    // Test 4B: Boundary inclusion test
    const boundaryYesterday = addDays(today, -1);
    const boundarySevenDaysAgo = addDays(today, -6);
    const outOfRangeEightDaysAgo = addDays(today, -7);

    assert(
      isDateInTimeframe(boundarySevenDaysAgo, '7days', range7.startDate, range7.endDate, today) === true,
      'Analytics Filtering',
      `[${tz}] Earliest boundary day (T-6) is included in 7-day timeframe`
    );
    assert(
      isDateInTimeframe(outOfRangeEightDaysAgo, '7days', range7.startDate, range7.endDate, today) === false,
      'Analytics Filtering',
      `[${tz}] Out of range day (T-7) is excluded from 7-day timeframe`
    );

    // Test 4C: Trend aggregation consistency
    const habitLogs: HabitLog[] = [
      { id: 'h1', habitId: 'hab_1', date: today, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'h2', habitId: 'hab_2', date: today, status: 'completed', userId: 'u1', updatedAt: '' },
      { id: 'h3', habitId: 'hab_1', date: boundaryYesterday, status: 'completed', userId: 'u1', updatedAt: '' },
    ];
    const tasks: TaskItem[] = [
      { id: 't1', title: 'Task 1', completed: true, date: today, userId: 'u1', createdAt: '', updatedAt: '' },
      { id: 't2', title: 'Task 2', completed: false, date: today, userId: 'u1', createdAt: '', updatedAt: '' },
      { id: 't3', title: 'Task 3', completed: true, date: boundaryYesterday, userId: 'u1', createdAt: '', updatedAt: '' },
    ];

    const trend = computeTrendData(range7.dateList, habitLogs, tasks, [], '7days');
    const todayPoint = trend.find((p) => p.date === today);
    const yesterdayPoint = trend.find((p) => p.date === boundaryYesterday);

    assert(
      todayPoint?.habits === 2 && todayPoint?.tasks === 1 && todayPoint?.completions === 3,
      'Analytics Aggregation',
      `[${tz}] Today's completions match habits (2) + tasks (1) = 3`,
      `Got completions: ${todayPoint?.completions}`
    );

    assert(
      yesterdayPoint?.habits === 1 && yesterdayPoint?.tasks === 1 && yesterdayPoint?.completions === 2,
      'Analytics Aggregation',
      `[${tz}] Yesterday's completions match habits (1) + tasks (1) = 2`,
      `Got completions: ${yesterdayPoint?.completions}`
    );

    // Test 4D: Productivity Score empty state is strictly 0
    const emptyScore = computeProductivityScore([], [], [], [], [], 'today', today);
    assert(
      emptyScore.total === 0,
      'Analytics Score',
      `[${tz}] Empty productivity score is strictly 0`,
      `Got ${emptyScore.total}`
    );

    // Test 4E: Active habit completion awards score correctly
    const activeHabit: Habit = {
      id: 'hab_1',
      name: 'Hydrate',
      category: 'Health',
      icon: 'droplet',
      color: '#38bdf8',
      frequencyType: 'daily',
      frequencyValue: [],
      targetType: 'binary',
      targetValue: 1,
      userId: 'u1',
      createdAt: '',
      updatedAt: '',
    };
    const completedScore = computeProductivityScore([activeHabit], [], [], [], habitLogs, 'today', today);
    assert(
      completedScore.total > 0 && completedScore.breakdown.habits.earned === 30,
      'Analytics Score',
      `[${tz}] Completed habit awards full 30 points in 'today' timeframe`,
      `Got habit score: ${completedScore.breakdown.habits.earned}`
    );
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('='.repeat(70));
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('='.repeat(70));

  return { results, summary: { total: results.length, passed, failed } };
}

// Auto-run if executed directly via Node / tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('timezone-consistency.test')) {
  const { summary } = runAllTimezoneConsistencyTests();
  if (summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
