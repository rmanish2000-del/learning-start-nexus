// Browser-saved timed-attempt answers are scoped to one signed-in account.
// They are wiped on sign-out and whenever a different account signs in on the
// same device, so one learner never sees another learner's saved attempt.
export const ATTEMPT_PREFIX = "eduos.pyq.";
export const ATTEMPT_OWNER_KEY = `${ATTEMPT_PREFIX}owner`;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function clearAttemptStorage(): void {
  const s = store();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(ATTEMPT_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

/** Ensure saved attempts belong to `userId`; wipe them otherwise. Returns true if storage is usable. */
export function claimAttemptStorage(userId: string | null | undefined): boolean {
  const s = store();
  if (!s) return false;
  if (!userId) {
    clearAttemptStorage();
    return false;
  }
  try {
    if (s.getItem(ATTEMPT_OWNER_KEY) !== userId) {
      clearAttemptStorage();
      s.setItem(ATTEMPT_OWNER_KEY, userId);
    }
    return true;
  } catch {
    return false;
  }
}
