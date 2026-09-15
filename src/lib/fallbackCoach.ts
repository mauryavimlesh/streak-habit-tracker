export interface FallbackCoachContext {
  userName?: string;
  habits?: Array<{
    id?: string;
    title?: string;
    category?: string;
    streak?: number;
    frequency?: string;
  }>;
  activeHabitCount?: number;
  totalStreaks?: number;
}

/**
 * Generates an empathetic, actionable Atomic Habits coaching response
 * when cloud AI models are momentarily experiencing high-demand spikes (503).
 */
export function generateFallbackCoaching(
  prompt: string,
  context?: FallbackCoachContext | null
): string {
  const query = (prompt || '').toLowerCase().trim();
  const userName = context?.userName ? context.userName.split(' ')[0] : 'friend';
  const habits = context?.habits || [];
  const habitNames = habits.map(h => h.title).filter(Boolean);
  const habitListStr = habitNames.length > 0 
    ? `your current habits (${habitNames.slice(0, 3).join(', ')}${habitNames.length > 3 ? '...' : ''})`
    : 'your habits';
  const streakCount = context?.totalStreaks || 0;

  // 1. Consistency / Building Habits
  if (query.includes('consisten') || query.includes('stick') || query.includes('routine') || query.includes('daily')) {
    return `Consistency isn’t a personality trait, ${userName}—it is a design problem. Most people struggle with consistency not because of weak willpower, but because they set the starting barrier too high.

To make ${habitListStr} practically automatic, apply these core levers:

*   **The 2-Minute Rule:** Shrink the habit until it takes less than 120 seconds to begin. If you're building a reading habit, commit to 1 page. If fitness, commit to putting on your shoes and doing 5 push-ups. Master the art of *showing up* before optimizing the performance.
*   **Habit Anchoring:** Never leave execution floating in free time. Anchor it to an unshakeable trigger: *"After I pour my morning coffee, I will [Habit]."* Or *"Before I turn on my computer, I will take 3 mindful breaths."*
*   **The Identity Shift:** Every time you complete a micro-action, you are casting a vote for the person you want to become. You aren't just checking a box; you are reinforcing an identity.

${streakCount > 0 ? `You already have ${streakCount} total streak days banked across your habits. Momentum is on your side.` : `Start small today, ${userName}. Small actions. Every single day.`} Focus on just winning today's 2-minute version.`;
  }

  // 2. Missed Days / Broken Streak / Recovery
  if (query.includes('miss') || query.includes('broke') || query.includes('fail') || query.includes('lost') || query.includes('restart') || query.includes('guilt')) {
    return `Take a breath, ${userName}. Missing a day is not a failure; it is simply a data point in a lifelong system.

Here is the golden rule of high performers: **Never miss twice.**

*   **One missed day is an accident:** Life happens. An unexpected meeting, illness, or travel is inevitable. A single missed day will never ruin a habit.
*   **Two missed days is the start of a new, negative habit:** The danger isn't the break itself; it’s the psychological spiral of "I blew it, so why bother?"
*   **Rebound with a micro-dose:** Do not try to compensate by doing double tomorrow. That creates dread. Instead, do the simplest possible version today just to preserve the chain in your mind.

Drop the guilt, ${userName}. What is one 60-second action you can execute right now to reclaim your momentum?`;
  }

  // 3. Low Motivation / Tired / Burnout / Procrastination
  if (query.includes('tired') || query.includes('motivat') || query.includes('lazy') || query.includes('procrastinat') || query.includes('exhaust') || query.includes('hard')) {
    return `It is completely normal to feel low on energy, ${userName}. Motivation is an emotional wave—it peaks and valleys. If you wait until you feel motivated, you will only be consistent on your best days.

When resistance is high, try these strategies:

*   **Scale down to the Minimum Viable Action (MVA):** Ask yourself: *"What is the absolute smallest piece of this habit I can do with zero effort?"* If you can't do a 30-minute workout, do 3 gentle stretches. If you can't write an article, write a bullet point.
*   **Respect the transition:** Often, the hardest part is the friction of initiating. Tell yourself: *"I will only do this for 3 minutes. If I still want to stop, I have permission to stop."* Nine times out of ten, momentum takes over once you start.
*   **Protect your recovery:** If your body is genuinely exhausted, active rest or a good night's sleep IS the highest-leverage habit you can execute.

Be gentle with yourself today. Focus on completing just one small, friction-free win.`;
  }

  // 4. Starting a New Habit / Overwhelmed
  if (query.includes('start') || query.includes('begin') || query.includes('new') || query.includes('overwhelm') || query.includes('where')) {
    return `When starting a new habit, ${userName}, your biggest enemy is excessive ambition. Starting five massive new habits at once creates overwhelming friction that collapses within two weeks.

Follow the STREAK Blueprint for starting:

*   **Pick ONE Keystone Habit:** Choose the single habit that creates positive ripple effects (e.g., getting 7 hours of sleep, morning hydration, or a 10-minute walk).
*   **Design the Environment:** Make the good cues obvious and the friction low. Put your notebook on your desk, prepare your workout clothes the night before, or keep a water bottle within arm's reach.
*   **Track the streak visually:** Mark each day as complete in STREAK. Watching your counter increment triggers a natural dopamine loop that solidifies the behavior.

What is the single most important habit you want to lock in this week? Let's break it down into a friction-free step together.`;
  }

  // 5. Breaking Bad Habits / Distractions
  if (query.includes('bad habit') || query.includes('quit') || query.includes('stop') || query.includes('phone') || query.includes('scroll') || query.includes('distract')) {
    return `To break an unwanted pattern, ${userName}, don't try to eliminate it through sheer willpower. Instead, reverse the habit loop:

*   **Make the cue invisible:** If phone scrolling is the issue, place your device in another room or turn on grayscale mode during deep work hours.
*   **Increase the friction:** Add extra steps between the urge and the action. Log out of time-sink apps or put a physical obstacle in the way.
*   **Substitute, don't just eliminate:** When an urge hits, your brain is seeking a dopamine or relaxation reward. Swap the unwanted action with a positive alternative: reach for a glass of cold water, take 5 deep breaths, or step outside for a minute of fresh air.

Remember: you don't rise to the level of your goals; you fall to the level of your systems. Design your environment so that good choices become the path of least resistance.`;
  }

  // 6. Default Habit Strategy Coach
  return `Consistency is built through quiet, deliberate execution, ${userName}. 

Looking at your habit journey${habits.length > 0 ? ` with ${habitListStr}` : ''}:

*   **Focus on the system, not the outcome:** The goal isn't just to reach a 30-day milestone; it is to build a reliable lifestyle where showing up is your default state.
*   **Protect your baseline:** On days when schedules get chaotic, never skip completely. Complete a 60-second micro-dose to keep your behavioral groove alive.
*   **Never miss twice:** Treat every day as day one. A clean slate, a focused mind, and small intentional actions.

What specific challenge or habit would you like to brainstorm right now? I'm here to help you dial in the easiest starting step.`;
}
