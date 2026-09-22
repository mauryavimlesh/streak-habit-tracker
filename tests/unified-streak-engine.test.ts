/**
 * Automated Test Suite: Unified streakEngine Service
 * Verifies calculation of streak success based on historical daily completion records (actual vs target),
 * ensuring that incomplete days do not break continuity and only fully realized goals increment the streak count.
 */

import {
  isGoalFullyRealized,
  convertLogsToDailyRecords,
  calculateDailyRecordStreak,
  DailyCompletionRecord,
} from '../src/lib/streakEngine';
import { HabitLog, Habit } from '../src/lib/habitService';
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

export function runUnifiedStreakEngineTests() {
  console.log('='.repeat(70));
  console.log('🧪 RUNNING UNIFIED STREAK ENGINE (ACTUAL VS TARGET) TEST SUITE');
  console.log('='.repeat(70));

  const today = '2026-06-20';
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);

  // Test 1: Goal realization: actual < target does not count as realized
  {
    const record: DailyCompletionRecord = {
      date: today,
      actual: 15,
      target: 30,
    };
    const isRealized = isGoalFullyRealized(record);
    assertTest(
      1,
      'Actual < Target (15/30) is NOT fully realized',
      isRealized === false,
      `Expected false, got ${isRealized}`
    );
  }

  // Test 2: Goal realization: actual >= target is fully realized
  {
    const record: DailyCompletionRecord = {
      date: today,
      actual: 30,
      target: 30,
    };
    const isRealized = isGoalFullyRealized(record);
    assertTest(
      2,
      'Actual >= Target (30/30) IS fully realized',
      isRealized === true,
      `Expected true, got ${isRealized}`
    );
  }

  // Test 3: Minimum target threshold support
  {
    const record: DailyCompletionRecord = {
      date: today,
      actual: 20,
      target: 30,
      minimumTarget: 20,
    };
    const isRealized = isGoalFullyRealized(record);
    assertTest(
      3,
      'Actual >= MinimumTarget (20/30, min 20) IS fully realized',
      isRealized === true,
      `Expected true, got ${isRealized}`
    );
  }

  // Test 4: Incomplete day today does NOT break continuity from yesterday
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 },
      { date: yesterday, actual: 30, target: 30 },
      { date: today, actual: 10, target: 30 }, // Incomplete today (in progress)
    ];
    const stats = calculateDailyRecordStreak(records, { targetDateStr: today });
    assertTest(
      4,
      'Incomplete day today preserves yesterday continuity (streak = 2, not 0)',
      stats.currentStreak === 2,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 5: Incomplete day today does NOT increment streak count
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 },
      { date: yesterday, actual: 30, target: 30 },
      { date: today, actual: 15, target: 30 }, // Incomplete today
    ];
    const stats = calculateDailyRecordStreak(records, { targetDateStr: today });
    assertTest(
      5,
      'Incomplete day today does NOT increment streak count (remains 2, not 3)',
      stats.currentStreak === 2 && stats.isTodayRealized === false,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 6: Fully realized goal today DOES increment streak count
  {
    const records: DailyCompletionRecord[] = [
      { date: twoDaysAgo, actual: 30, target: 30 },
      { date: yesterday, actual: 30, target: 30 },
      { date: today, actual: 30, target: 30 }, // Fully realized today
    ];
    const stats = calculateDailyRecordStreak(records, { targetDateStr: today });
    assertTest(
      6,
      'Fully realized goal today increments streak count (reaches 3)',
      stats.currentStreak === 3 && stats.isTodayRealized === true,
      `Expected streak 3, got ${stats.currentStreak}`
    );
  }

  // Test 7: Flexible continuity mode: incomplete intermediate days do not break continuity
  {
    const records: DailyCompletionRecord[] = [
      { date: threeDaysAgo, actual: 20, target: 20 }, // Realized #1
      { date: twoDaysAgo, actual: 5, target: 20 },   // Incomplete day!
      { date: yesterday, actual: 20, target: 20 },    // Realized #2
      { date: today, actual: 8, target: 20 },        // Incomplete day!
    ];
    const stats = calculateDailyRecordStreak(records, {
      targetDateStr: today,
      allowIncompleteContinuity: true,
    });
    assertTest(
      7,
      'allowIncompleteContinuity mode: incomplete intermediate days do not break continuity',
      stats.currentStreak === 2 && stats.bestStreak === 2,
      `Expected current streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 8: Convert HabitLogs with progressValue & targetValue to DailyCompletionRecords
  {
    const logs: HabitLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        habitId: 'h1',
        date: yesterday,
        progressValue: 30,
        targetValue: 30,
        status: 'completed',
      },
      {
        id: 'l2',
        userId: 'u1',
        habitId: 'h1',
        date: today,
        progressValue: 10,
        targetValue: 30,
        status: 'in_progress',
      },
    ];
    const dailyRecords = convertLogsToDailyRecords(logs);
    assertTest(
      8,
      'convertLogsToDailyRecords produces accurate actual vs target records',
      dailyRecords.length === 2 &&
        dailyRecords[0].actual === 30 &&
        dailyRecords[0].target === 30 &&
        dailyRecords[1].actual === 10 &&
        dailyRecords[1].target === 30,
      `Conversion mismatch: ${JSON.stringify(dailyRecords)}`
    );
  }

  // Test 9: Deduplication takes maximum actual progress for the same day
  {
    const logs: HabitLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        habitId: 'h1',
        date: today,
        progressValue: 15,
        targetValue: 30,
        status: 'in_progress',
      },
      {
        id: 'l2',
        userId: 'u1',
        habitId: 'h1',
        date: today,
        progressValue: 30, // Later session hit full target!
        targetValue: 30,
        status: 'completed',
      },
    ];
    const dailyRecords = convertLogsToDailyRecords(logs);
    assertTest(
      9,
      'Multiple daily records aggregate to max actual (30/30)',
      dailyRecords.length === 1 && dailyRecords[0].actual === 30,
      `Expected single record with actual 30, got ${JSON.stringify(dailyRecords)}`
    );
  }

  // Test 10: Status reflection: todayStatus accurately reflects 'in_progress' when incomplete
  {
    const records: DailyCompletionRecord[] = [
      { date: today, actual: 10, target: 30 },
    ];
    const stats = calculateDailyRecordStreak(records, { targetDateStr: today });
    assertTest(
      10,
      'todayStatus reports in_progress with todayActual=10 and todayTarget=30',
      stats.todayStatus === 'in_progress' && stats.todayActual === 10 && stats.todayTarget === 30,
      `Got status ${stats.todayStatus}, actual ${stats.todayActual}`
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
runUnifiedStreakEngineTests();
