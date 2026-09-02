// Tracks whether an assessment answering surface is mounted.
//
// Two Phase-1 rules depend on this signal:
// - the connection-lost banner switches to the non-dismissible red variant and
//   the "back online" toast uses the assessment copy (AC-08 / AC-11);
// - the new-version update prompt is deferred while a session is in progress,
//   so a learner is never reloaded mid-assessment (AC-12).

import { useEffect, useState } from "react";

let activeCount = 0;
const listeners = new Set<(active: boolean) => void>();

function emit() {
  const active = activeCount > 0;
  for (const listener of listeners) listener(active);
}

export function isAssessmentActive(): boolean {
  return activeCount > 0;
}

/** Marks an assessment session active for as long as the component is mounted. */
export function useMarkAssessmentActive(): void {
  useEffect(() => {
    activeCount += 1;
    emit();
    return () => {
      activeCount = Math.max(0, activeCount - 1);
      emit();
    };
  }, []);
}

export function useAssessmentActive(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(isAssessmentActive());
    listeners.add(setActive);
    return () => {
      listeners.delete(setActive);
    };
  }, []);
  return active;
}
