/**
 * Automated Test Suite: Streak Freeze Engine & Resource Management
 * Verifies that Streak Freeze protects streak continuity during planned days off and absences,
 * enforces freeze resource deductions and capacity limits, and ensures only realized goals increment count.
 */

import {
  StreakFreezeConfig,
  getFreezeStatus,
  planStreakFreeze,
  unplanStreakFreeze,
  consumeStreakFreeze,
  refundStreakFreeze,
  calculateDailyRecordStreak,
  DailyCompletionRecord,
} from '../src/lib/streakEngine';
import { addDays } from '../src/lib/dateUtils';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: any;
}

const results: TestResult[] = [];

function assertTest(
  id: number,
  name: string,
  condition: boolean,
  message?: string,
  details?: any
) {
  if (!condition) {
    console.error(`❌ [FAIL] Test ${id}: ${name} - ${message || 'Assertion failed'}`, details || '');
    results.push({ id, name, passed: false, message, details });
  } else {
    console.log(`✅ [PASS] Test ${id}: ${name}`);
    results.push({ id, name, passed: true, message });
  }
}

export function runStreakFreezeTests() {
  console.log('='.repeat(70));
  console.log('🧪 RUNNING STREAK FREEZE & RESOURCE DEDUCTION TEST SUITE');
  console.log('='.repeat(70));

  const today = '2026-07-15';
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);
  const tomorrow = addDays(today, 1);

  // Test 1: Initial freeze capacity status
  {
    const config: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [],
    };
    const status = getFreezeStatus(config, today);
    assertTest(
      1,
      'Initial freeze status correctly reflects 2 available freezes',
      status.availableCount === 2 && status.freezesRemaining === 2 && status.canFreeze === true,
      `Expected 2 available, got ${status.availableCount}`
    );
  }

  // Test 2: Planning a day off reserves 1 freeze slot
  {
    const config: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [],
    };
    const result = planStreakFreeze(config, tomorrow);
    const status = getFreezeStatus(result.updatedConfig, today);
    assertTest(
      2,
      'Planning a day off reserves 1 freeze (remaining: 1)',
      result.success === true &&
        status.availableCount === 1 &&
        status.plannedDates.includes(tomorrow),
      `Expected remaining 1, got ${status.availableCount}`
    );
  }

  // Test 3: Limited freeze resource: cannot exceed total capacity
  {
    const config: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: ['2026-07-01'],
      plannedDates: ['2026-07-10'],
    };
    // Both freezes are already allocated!
    const result = planStreakFreeze(config, tomorrow);
    assertTest(
      3,
      'Cannot plan day off when freeze resource is exhausted',
      result.success === false && result.reason?.includes('No freeze resources remaining'),
      `Expected failure, got success: ${result.success}`
    );
  }

  // Test 4: Canceling a planned day off refunds the freeze slot
  {
    const config: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [tomorrow],
    };
    const updated = unplanStreakFreeze(config, tomorrow);
    const status = getFreezeStatus(updated, today);
    assertTest(
      4,
      'Unplanning a day off refunds the freeze slot back to 2',
      status.availableCount === 2 && !status.plannedDates.includes(tomorrow),
      `Expected 2, got ${status.availableCount}`
    );
  }

  // Test 5: Planned day off protects streak continuity across yesterday
  {
    const records: DailyCompletionRecord[] = [
      { date: threeDaysAgo, actual: 30, target: 30 },
      { date: twoDaysAgo, actual: 30, target: 30 },
      // Yesterday was a planned day off (missed, but frozen)
      { date: today, actual: 0, target: 30 }, // Today incomplete
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [yesterday],
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      5,
      'Planned day off yesterday preserves streak continuity (streak = 2)',
      stats.currentStreak === 2,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 6: Freeze day does NOT increment streak count
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 }, // 1 day realized
      // Yesterday was frozen
      { date: today, actual: 0, target: 30 },
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [yesterday],
      plannedDates: [],
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      6,
      'Frozen day maintains continuity but does NOT increment streak (remains 1, not 2)',
      stats.currentStreak === 1,
      `Expected streak 1, got ${stats.currentStreak}`
    );
  }

  // Test 7: Completing goal on day following a freeze increments streak correctly
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 }, // Day 1: Realized
      // Yesterday was frozen
      { date: today, actual: 30, target: 30 },       // Today: Realized!
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [yesterday],
      plannedDates: [],
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      7,
      'Completing goal today across frozen yesterday increments streak to 2',
      stats.currentStreak === 2 && stats.isTodayRealized === true,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 8: Auto-consume on unplanned missed day protects streak and deducts resource
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 },
      // Yesterday was missed unplanned!
      { date: today, actual: 0, target: 30 },
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [],
      autoConsume: true,
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      8,
      'Auto-consume protects missed yesterday and deducts 1 freeze resource',
      stats.currentStreak === 1 &&
        stats.freezeState?.freezesRemaining === 1 &&
        stats.freezeState?.consumed.includes(yesterday),
      `Expected remaining 1, got ${stats.freezeState?.freezesRemaining}`
    );
  }

  // Test 9: Zero freezes remaining causes missed day to break streak
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 },
      // Yesterday missed
      { date: today, actual: 0, target: 30 },
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 1,
      usedFreezes: [threeDaysAgo], // Already used the only freeze!
      plannedDates: [],
      autoConsume: true,
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      9,
      'Missed yesterday with 0 freezes breaks streak to 0',
      stats.currentStreak === 0 && stats.streakStatus === 'broken',
      `Expected streak 0, got ${stats.currentStreak}`
    );
  }

  // Test 10: Today marked as frozen reflects todayStatus = 'frozen'
  {
    const records: DailyCompletionRecord[] = [
      { date: yesterday, actual: 30, target: 30 },
      { date: today, actual: 0, target: 30 },
    ];
    const freezeConfig: StreakFreezeConfig = {
      totalAvailable: 2,
      usedFreezes: [],
      plannedDates: [today], // Today is a planned freeze day off
    };
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      freezeConfig,
    });
    assertTest(
      10,
      'Planned day off today sets isTodayFrozen=true and todayStatus=frozen',
      stats.isTodayFrozen === true &&
        stats.todayStatus === 'frozen' &&
        stats.currentStreak === 1,
      `Expected frozen today, got status: ${stats.todayStatus}`
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('='.repeat(70));
  console.log(`SUMMARY: ${passedCount}/10 PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run if executed directly
runStreakFreezeTests();
