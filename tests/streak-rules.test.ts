/**
 * Automated Test Suite: Streak Rules & Completion Verification
 * Validates the 12 core requirements for daily completion rules,
 * target editing data integrity, and streak calculations.
 */

import {
  evaluateHabitProgress,
  isLogCompleted,
  calculateHabitStreakStats,
  calculateGlobalHabitStreak,
} from '../src/lib/habitEngine';
import { Habit, HabitLog } from '../src/lib/habitService';
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

const createMockHabit = (partial: Partial<Habit>): Habit => ({
  id: 'test-habit',
  userId: 'test-user',
  name: 'Test Habit',
  category: 'fitness',
  icon: 'dumbbell',
  color: '#10b981',
  frequencyType: 'daily',
  frequencyValue: [],
  targetType: 'count',
  targetValue: 1,
  ...partial,
});

export function runStreakRuleTests() {
  console.log('='.repeat(70));
  console.log('🧪 RUNNING 12-POINT STREAK & COMPLETION INTEGRITY TEST SUITE');
  console.log('='.repeat(70));

  const today = '2026-06-15';
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);

  // Test 1: Partial workout does NOT count as streak completion
  {
    const workoutHabit = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 30,
      minimumTarget: 30,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const progress = evaluateHabitProgress(workoutHabit, 15);
    assertTest(
      1,
      'Partial workout (15/30 min) does not count as complete',
      progress.isCompleted === false && progress.status === 'in_progress' && progress.remaining === 15,
      `Expected incomplete, got status: ${progress.status}`
    );
  }

  // Test 2: Full minimum required workout target (30/30 min) counts as streak completion
  {
    const workoutHabit = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 30,
      minimumTarget: 30,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const progress = evaluateHabitProgress(workoutHabit, 30);
    assertTest(
      2,
      'Meeting minimum target (30/30 min) marks as completed',
      progress.isCompleted === true && progress.status === 'completed' && progress.remaining === 0,
      `Expected completed, got status: ${progress.status}`
    );
  }

  // Test 3: Consecutive daily completions increment streak correctly
  {
    const workoutHabit = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 30,
      minimumTarget: 30,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const logs: HabitLog[] = [
      {
        id: 'l-1',
        userId: 'test-user',
        habitId: 'h-workout',
        date: twoDaysAgo,
        status: 'completed',
        progressValue: 30,
        targetValue: 30,
        minimumTarget: 30,
      },
      {
        id: 'l-2',
        userId: 'test-user',
        habitId: 'h-workout',
        date: yesterday,
        status: 'completed',
        progressValue: 30,
        targetValue: 30,
        minimumTarget: 30,
      },
    ];
    const stats = calculateHabitStreakStats(workoutHabit, logs, today);
    assertTest(
      3,
      'Consecutive completions across 2 past days yield current streak of 2',
      stats.currentStreak === 2,
      `Expected streak 2, got ${stats.currentStreak}`
    );
  }

  // Test 4: Missing yesterday breaks streak (streak is 0)
  {
    const workoutHabit = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 30,
      minimumTarget: 30,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const logs: HabitLog[] = [
      {
        id: 'l-1',
        userId: 'test-user',
        habitId: 'h-workout',
        date: twoDaysAgo,
        status: 'completed',
        progressValue: 30,
        targetValue: 30,
        minimumTarget: 30,
      },
      // Note: yesterday was skipped/missing!
    ];
    const stats = calculateHabitStreakStats(workoutHabit, logs, today);
    assertTest(
      4,
      'Skipping yesterday resets current streak to 0',
      stats.currentStreak === 0,
      `Expected streak 0, got ${stats.currentStreak}`
    );
  }

  // Test 5: Opening app today after skipping yesterday does NOT show confusing streak continuation
  {
    const workoutHabit = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 30,
      minimumTarget: 30,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const logs: HabitLog[] = [
      {
        id: 'l-1',
        userId: 'test-user',
        habitId: 'h-workout',
        date: twoDaysAgo,
        status: 'completed',
        progressValue: 30,
        targetValue: 30,
        minimumTarget: 30,
      },
    ];
    const stats = calculateHabitStreakStats(workoutHabit, logs, today);
    assertTest(
      5,
      'Opening app on a new day with yesterday skipped shows 0 streak, not confusing continuation',
      stats.currentStreak === 0,
      `Expected 0, got ${stats.currentStreak}`
    );
  }

  // Test 6: Historical data integrity: target snapshot in logs protects past records from target edits
  {
    const habitUpdatedTo45 = createMockHabit({
      id: 'h-workout',
      name: 'Workout',
      targetValue: 45, // Updated today from 30 to 45
      minimumTarget: 45,
      targetUnit: 'min',
      targetType: 'duration',
    });
    const historicalLog: HabitLog = {
      id: 'l-hist',
      userId: 'test-user',
      habitId: 'h-workout',
      date: yesterday,
      status: 'completed',
      progressValue: 30,
      targetValue: 30, // Snapshotted when target was 30
      minimumTarget: 30, // Snapshotted when min was 30
    };
    const wasCompleted = isLogCompleted(historicalLog, habitUpdatedTo45);
    assertTest(
      6,
      'Editing habit target from 30 to 45 min does NOT invalidate historical 30 min completion',
      wasCompleted === true,
      `Historical completion was corrupted by habit target edit`
    );
  }

  // Test 7: Configurable minimumTarget distinct from total targetValue
  {
    const habitWithLowerMin = createMockHabit({
      id: 'h-run',
      name: 'Daily Run',
      targetValue: 30, // Full goal is 30 min
      minimumTarget: 20, // Minimum required for streak is 20 min
      targetUnit: 'min',
      targetType: 'duration',
    });
    const progressAt20 = evaluateHabitProgress(habitWithLowerMin, 20);
    assertTest(
      7,
      'Progress reaching minimumTarget (20 min) qualifies as complete for streak even if targetValue is 30',
      progressAt20.isCompleted === true && progressAt20.status === 'completed',
      `Expected completed at 20 min, got ${progressAt20.status}`
    );
  }

  // Test 8: Study habit unit handling (e.g. 1 lecture minimum)
  {
    const studyHabit = createMockHabit({
      id: 'h-study',
      name: 'Study',
      category: 'learning',
      icon: 'book',
      color: '#3b82f6',
      targetValue: 2,
      minimumTarget: 1, // 1 lecture minimum
      targetUnit: 'lecture',
      targetType: 'count',
    });
    const zeroProgress = evaluateHabitProgress(studyHabit, 0);
    const oneProgress = evaluateHabitProgress(studyHabit, 1);
    assertTest(
      8,
      'Study habit: 0 lectures is not started, 1 lecture meets streak requirement',
      zeroProgress.status === 'not_started' &&
        zeroProgress.isCompleted === false &&
        oneProgress.isCompleted === true &&
        oneProgress.status === 'completed',
      `Failed study habit evaluation: zero=${zeroProgress.status}, one=${oneProgress.status}`
    );
  }

  // Test 9: Weekly schedule days (e.g. Mon, Wed, Fri schedule)
  {
    const weekdayHabit = createMockHabit({
      id: 'h-gym',
      name: 'Gym',
      targetValue: 1,
      minimumTarget: 1,
      targetUnit: 'session',
      targetType: 'binary',
      frequencyType: 'custom',
      frequency: 'custom',
      scheduleDays: [1, 5], // Monday (1) and Friday (5) only
    });

    const logs: HabitLog[] = [
      {
        id: 'l-fri',
        userId: 'test-user',
        habitId: 'h-gym',
        date: '2026-06-12', // Friday
        status: 'completed',
        progressValue: 1,
        targetValue: 1,
        minimumTarget: 1,
      },
      {
        id: 'l-mon',
        userId: 'test-user',
        habitId: 'h-gym',
        date: '2026-06-15', // Monday
        status: 'completed',
        progressValue: 1,
        targetValue: 1,
        minimumTarget: 1,
      },
    ];
    const stats = calculateHabitStreakStats(weekdayHabit, logs, '2026-06-15');
    assertTest(
      9,
      'Scheduled custom days (Mon/Fri) do not penalize non-scheduled weekend days',
      stats.currentStreak === 2,
      `Expected streak 2 across custom days, got ${stats.currentStreak}`
    );
  }

  // Test 10: Multiple habits global streak calculation
  {
    const habitA = createMockHabit({
      id: 'ha',
      userId: 'u1',
      name: 'Habit A',
      targetValue: 1,
      minimumTarget: 1,
    });
    const habitB = createMockHabit({
      id: 'hb',
      userId: 'u1',
      name: 'Habit B',
      targetValue: 1,
      minimumTarget: 1,
    });
    const globalLogs: HabitLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        habitId: 'ha',
        date: yesterday,
        status: 'completed',
        progressValue: 1,
        targetValue: 1,
        minimumTarget: 1,
      },
      {
        id: 'l2',
        userId: 'u1',
        habitId: 'ha',
        date: today,
        status: 'completed',
        progressValue: 1,
        targetValue: 1,
        minimumTarget: 1,
      },
    ];
    const globalStats = calculateGlobalHabitStreak([habitA, habitB], globalLogs, today);
    assertTest(
      10,
      'Global streak reflects active completed days across all habits',
      globalStats.currentStreak === 2,
      `Expected global streak 2, got ${globalStats.currentStreak}`
    );
  }

  // Test 11: Explicit 4-state status calculation (not_started, in_progress, completed, missed)
  {
    const habit = createMockHabit({
      id: 'h-state',
      userId: 'u1',
      name: 'Writing',
      targetValue: 100,
      minimumTarget: 50,
      targetUnit: 'words',
    });
    const stateNotStarted = evaluateHabitProgress(habit, 0);
    const stateInProgress = evaluateHabitProgress(habit, 25);
    const stateCompleted = evaluateHabitProgress(habit, 50);

    const allStatesValid =
      stateNotStarted.status === 'not_started' &&
      stateInProgress.status === 'in_progress' &&
      stateCompleted.status === 'completed';

    assertTest(
      11,
      'Explicit status returns not_started, in_progress, or completed accurately',
      allStatesValid,
      `State mismatch: not_started=${stateNotStarted.status}, in_progress=${stateInProgress.status}, completed=${stateCompleted.status}`
    );
  }

  // Test 12: Zero false positive streaks for fresh accounts or empty logs
  {
    const freshHabit = createMockHabit({
      id: 'h-fresh',
      userId: 'u-new',
      name: 'Drink Water',
      targetValue: 8,
      minimumTarget: 8,
      targetUnit: 'glasses',
    });
    const stats = calculateHabitStreakStats(freshHabit, [], today);
    const globalStats = calculateGlobalHabitStreak([freshHabit], [], today);

    assertTest(
      12,
      'Zero false-positive streaks for new habits or empty activity logs',
      stats.currentStreak === 0 && globalStats.currentStreak === 0,
      `Expected 0 streak for empty logs, got habit: ${stats.currentStreak}, global: ${globalStats.currentStreak}`
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('='.repeat(70));
  console.log(`SUMMARY: ${passedCount}/12 PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run immediately when executed directly
runStreakRuleTests();
