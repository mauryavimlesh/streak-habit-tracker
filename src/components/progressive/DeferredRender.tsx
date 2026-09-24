import React, { useState, useEffect } from 'react';

/**
 * Hook to progressively defer rendering of non-critical UI elements
 * (like auxiliary tabs, bottom navigation footers, or below-the-fold charts)
 * until after the primary dashboard content has painted.
 */
export function useProgressiveLoad(delay = 40): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let timerId: any;
    let idleId: any;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(
        () => setIsReady(true),
        { timeout: Math.max(80, delay) }
      );
    } else {
      timerId = setTimeout(() => setIsReady(true), delay);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [delay]);

  return isReady;
}

interface DeferredRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

/**
 * Component that defers rendering its children until the main thread has
 * completed painting the critical path, preventing layout stutter and blocking.
 */
export const DeferredRender: React.FC<DeferredRenderProps> = ({
  children,
  fallback = null,
  delay = 40,
}) => {
  const isReady = useProgressiveLoad(delay);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
