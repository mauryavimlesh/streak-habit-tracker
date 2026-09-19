import { useState, useEffect, useId } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  ChevronLeft, 
  ArrowRight, 
  Check, 
  Dumbbell, 
  BookOpen, 
  Heart, 
  Flame,
  X,
  User as UserIcon,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface GoalOption {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Dumbbell;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'fitness',
    title: 'Get Fit & Strong',
    subtitle: 'Move your body, build daily physical energy',
    icon: Dumbbell,
  },
  {
    id: 'learning',
    title: 'Learn & Focus',
    subtitle: 'Study, read deeply, sharpen mental clarity',
    icon: BookOpen,
  },
  {
    id: 'wellbeing',
    title: 'Feel Calm & Well',
    subtitle: 'Rest, breathe, mindful recovery',
    icon: Heart,
  },
  {
    id: 'discipline',
    title: 'Build Discipline',
    subtitle: 'Show up every day with unbroken momentum',
    icon: Flame,
  },
];

export default function Onboarding() {
  const { profile, userProfile, updateProfile, onboardingCompleted } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReplay = searchParams.get('replay') === 'true';

  // Step state: 0 = Intro, 1 = Name, 2 = Goals
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  
  // Form state
  const initialName = userProfile?.userName || userProfile?.name || profile?.userName || profile?.name || '';
  const [name, setName] = useState(initialName === 'Vimlesh' && !isReplay ? '' : initialName);
  const [nameHint, setNameHint] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    profile?.selectedGoals && profile.selectedGoals.length > 0 
      ? profile.selectedGoals 
      : ['fitness', 'discipline']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const nameInputId = useId();

  // If already completed and not in replay mode, redirect to main dashboard
  useEffect(() => {
    if (!isReplay && (onboardingCompleted || profile?.onboardingCompleted || profile?.hasCompletedOnboarding)) {
      navigate('/', { replace: true });
    }
  }, [onboardingCompleted, profile?.onboardingCompleted, profile?.hasCompletedOnboarding, isReplay, navigate]);

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  // Step 1 Validation & Actions
  const handleNameContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      // Graceful validation: provide gentle hint without frustrating blockers
      setNameHint("Enter your name, or simply tap 'Skip' below to continue.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (trimmed.length > 50) {
      setNameHint("Name must be under 50 characters.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setNameHint(null);
    goToStep(2);
  };

  const handleNameSkip = () => {
    setName('');
    setNameHint(null);
    goToStep(2);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameHint) {
      setNameHint(null);
    }
  };

  // Step 2 Goals Selection
  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  // Final Submission
  const handleFinalComplete = async () => {
    setIsSubmitting(true);
    const finalName = name.trim() || userProfile?.name || userProfile?.userName || 'Friend';
    
    await updateProfile({
      name: finalName,
      userName: finalName,
      selectedGoals: selectedGoals.length > 0 ? selectedGoals : ['fitness'],
      hasCompletedOnboarding: true,
      onboardingCompleted: true,
    });

    // Short tactile delay for smooth feedback
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/', { replace: true });
    }, 150);
  };

  // 300ms fade and slide animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 32 : -32,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3, // exactly 300ms
        ease: [0.16, 1, 0.3, 1], // Apple fluid bezier
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -32 : 32,
      opacity: 0,
      transition: {
        duration: 0.3, // exactly 300ms
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-background text-white flex flex-col justify-between overflow-hidden relative select-none">
      {/* Background ambient lighting */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full blur-[110px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--app-accent) 0%, var(--app-accent) 60%, transparent 80%)' }}
      />

      {/* Main Scrollable Viewport Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-md mx-auto relative flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ========================================================================= */}
          {/* SCREEN 0: INTRO                                                           */}
          {/* ========================================================================= */}
          {step === 0 && (
            <motion.div
              key="step-0-intro"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-6 pt-6 pb-6 flex-1 flex flex-col justify-between"
            >
              <div>
                {/* Official STREAK Brand Asset */}
                <div className="relative w-[112px] h-[112px] mx-auto mt-2 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full blur-[24px] opacity-40 bg-accent-primary pointer-events-none" />
                  <img
                    src="/logo.png"
                    alt="STREAK Official Logo"
                    width={112}
                    height={112}
                    className="relative w-28 h-28 aspect-square object-contain select-none drop-shadow-[0_0_28px_rgba(140,238,40,0.35)]"
                    loading="eager"
                  />
                </div>

                {/* Typography */}
                <h1 className="text-[36px] font-extrabold tracking-tight text-white mt-6 text-center leading-none">
                  STREAK
                </h1>
                <p className="text-[17px] font-medium text-[#d1d5db] mt-2 text-center">
                  Small actions. Every day.
                </p>
                <p className="text-[14px] font-normal text-[#808899] text-center leading-[1.55] max-w-[310px] mx-auto mt-2.5">
                  A personal operating system for consistency. Build habits, keep streaks, reflect, and become who you want to be.
                </p>

                {/* Feature Cards using glass-effect */}
                <div className="mt-7 space-y-3">
                  <div className="glass-effect rounded-[22px] p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#181d27]/90 border border-[#273040] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-accent-primary" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-semibold text-white tracking-tight">
                        Beautifully simple
                      </h3>
                      <p className="text-[13px] text-[#7d8495] mt-0.5 leading-snug">
                        One tap to log. Calm by design.
                      </p>
                    </div>
                  </div>

                  <div className="glass-effect rounded-[22px] p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#181d27]/90 border border-[#273040] flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-accent-primary" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-semibold text-white tracking-tight">
                        Real momentum
                      </h3>
                      <p className="text-[13px] text-[#7d8495] mt-0.5 leading-snug">
                        Schedule-aware streaks, honest analytics.
                      </p>
                    </div>
                  </div>

                  <div className="glass-effect rounded-[22px] p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#181d27]/90 border border-[#273040] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-accent-primary" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-semibold text-white tracking-tight">
                        Yours, privately
                      </h3>
                      <p className="text-[13px] text-[#7d8495] mt-0.5 leading-snug">
                        Works offline. Your data stays on your device.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 1: NAME INPUT & VALIDATION                                         */}
          {/* ========================================================================= */}
          {step === 1 && (
            <motion.div
              key="step-1-name"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-6 pt-5 pb-6 flex-1 flex flex-col justify-between"
            >
              <div>
                {/* Header: Back button + 3-Segment Progress Indicator */}
                <div className="flex items-center justify-between mb-8">
                  <button
                    id="btn-onboarding-back-name"
                    onClick={() => goToStep(0)}
                    aria-label="Back to intro"
                    className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="h-[3.5px] flex-1 rounded-full bg-accent-primary transition-colors duration-300" />
                    <div className="h-[3.5px] flex-1 rounded-full bg-[#1c212c] transition-colors duration-300" />
                    <div className="h-[3.5px] flex-1 rounded-full bg-[#1c212c] transition-colors duration-300" />
                  </div>
                </div>

                {/* Main Heading */}
                <h2 className="text-[32px] sm:text-[36px] font-bold text-white tracking-tight leading-[1.16]">
                  What should we call you?
                </h2>
                <p className="text-[15px] text-[#7d8495] leading-relaxed mt-3">
                  This personalizes your greeting. You can change or skip it anytime.
                </p>

                {/* Name Input Box with glass-effect */}
                <div className="mt-8">
                  <label 
                    htmlFor={nameInputId} 
                    className="text-[12px] font-bold text-[#7d8495] tracking-wider uppercase mb-2.5 flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-accent-primary" />
                    YOUR NAME
                  </label>

                  <motion.div
                    animate={isShaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "glass-effect relative rounded-[22px] transition-all duration-200",
                      name.trim().length > 0 
                        ? "border-accent-primary/80 shadow-[0_0_24px_rgba(140,238,40,0.18)]" 
                        : "border-white/10"
                    )}
                  >
                    <input
                      id={nameInputId}
                      type="text"
                      value={name}
                      maxLength={50}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameContinue();
                      }}
                      placeholder="e.g. Alex"
                      className="w-full h-[62px] bg-transparent px-5 pr-12 text-[17px] text-white font-medium outline-none placeholder:text-[#4a5163] transition-colors"
                      autoFocus
                    />

                    {name.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleNameChange('')}
                        aria-label="Clear name input"
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>

                  {/* Graceful Feedback Hint */}
                  <AnimatePresence>
                    {nameHint && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-3 flex items-start gap-2 text-[13px] text-[#fb923c] bg-[#fb923c]/10 border border-[#fb923c]/25 rounded-xl px-3.5 py-2.5"
                      >
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{nameHint}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subtle info footnote */}
                  <p className="text-[12.5px] text-[#555d70] mt-3.5 leading-normal">
                    Tip: You can always update this or your avatar in Settings later.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: GOALS SELECTION                                                 */}
          {/* ========================================================================= */}
          {step === 2 && (
            <motion.div
              key="step-2-goals"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-6 pt-5 pb-6 flex-1 flex flex-col justify-between"
            >
              <div>
                {/* Header: Back button + 3-Segment Progress Indicator */}
                <div className="flex items-center justify-between mb-7">
                  <button
                    id="btn-onboarding-back-goals"
                    onClick={() => goToStep(1)}
                    aria-label="Back to name"
                    className="w-10 h-10 rounded-full glass-effect flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="h-[3.5px] flex-1 rounded-full bg-accent-primary transition-colors duration-300" />
                    <div className="h-[3.5px] flex-1 rounded-full bg-accent-primary transition-colors duration-300" />
                    <div
                      className={cn(
                        "h-[3.5px] flex-1 rounded-full transition-colors duration-300",
                        isSubmitting ? "bg-accent-primary" : "bg-accent-primary/40"
                      )}
                    />
                  </div>
                </div>

                {/* Main Heading */}
                <h2 className="text-[32px] sm:text-[36px] font-bold text-white tracking-tight leading-[1.16]">
                  What matters most right now?
                </h2>
                <p className="text-[15px] text-[#7d8495] leading-relaxed mt-3">
                  We'll suggest a small starter set. Select one or more areas you care about:
                </p>

                {/* Selectable Goal Cards using glass-effect */}
                <div className="mt-6 space-y-3">
                  {GOAL_OPTIONS.map((goal) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    const Icon = goal.icon;
                    return (
                      <div
                        key={goal.id}
                        id={`goal-option-${goal.id}`}
                        onClick={() => toggleGoal(goal.id)}
                        className={cn(
                          "glass-effect rounded-[22px] p-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]",
                          isSelected
                            ? "border-2 border-accent-primary shadow-[0_0_22px_rgba(140,238,40,0.18)] bg-[#142316]/80"
                            : "hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors",
                              isSelected
                                ? "bg-[#21361c] text-accent-primary"
                                : "bg-[#181d27]/80 border border-[#273040] text-[#858d9e]"
                            )}
                          >
                            <Icon className="w-5 h-5" strokeWidth={2.2} />
                          </div>
                          <div>
                            <h3 className="text-[15.5px] font-semibold text-white tracking-tight">
                              {goal.title}
                            </h3>
                            <p className="text-[13px] text-[#7d8495] mt-0.5 leading-snug">
                              {goal.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Checkmark Circle */}
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ml-3",
                            isSelected
                              ? "bg-accent-primary text-[#0a0c10]"
                              : "border border-[#2d3444] bg-transparent"
                          )}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* PINNED BOTTOM ACTION DOCK (Safe-Area-Inset-Bottom Compliant)              */}
      {/* ========================================================================= */}
      <div 
        id="onboarding-bottom-dock"
        className="shrink-0 w-full max-w-md mx-auto px-6 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-background via-background/95 to-transparent border-t border-white/[0.05] z-30"
      >
        {step === 0 && (
          <div>
            <button
              id="btn-intro-continue"
              onClick={() => goToStep(1)}
              className="w-full h-[56px] rounded-full bg-accent-primary hover:bg-[#9cf33e] active:scale-[0.985] text-[#0a0c10] font-bold text-[16.5px] flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(140,238,40,0.35)] transition-all cursor-pointer"
            >
              Get Started <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              id="btn-intro-login"
              onClick={() => navigate('/login')}
              className="w-full text-center text-[13.5px] font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer pt-3 pb-1 block"
            >
              I already have an account
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <button
              id="btn-name-continue"
              onClick={handleNameContinue}
              className="w-full h-[56px] rounded-full bg-accent-primary hover:bg-[#9cf33e] active:scale-[0.985] text-[#0a0c10] font-bold text-[16.5px] flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(140,238,40,0.35)] transition-all cursor-pointer"
            >
              Continue <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              id="btn-name-skip"
              onClick={handleNameSkip}
              className="w-full text-center text-[13.5px] font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer pt-3 pb-1 block"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <button
              id="btn-goals-continue"
              onClick={handleFinalComplete}
              disabled={isSubmitting}
              className="w-full h-[56px] rounded-full bg-accent-primary hover:bg-[#9cf33e] active:scale-[0.985] text-[#0a0c10] font-bold text-[16.5px] flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(140,238,40,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0a0c10] border-t-transparent rounded-full animate-spin" />
                  Opening STREAK...
                </span>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <button
              id="btn-goals-skip"
              onClick={handleFinalComplete}
              disabled={isSubmitting}
              className="w-full text-center text-[13.5px] font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer pt-3 pb-1 block"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
