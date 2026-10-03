import { beforeEach, describe, expect, it } from "vitest";
import { ATTEMPT_OWNER_KEY, claimAttemptStorage, clearAttemptStorage } from "../attempt-storage";

class MemStorage {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

let ls: MemStorage;
beforeEach(() => {
  ls = new MemStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: ls };
});

describe("attempt storage isolation", () => {
  it("wipes another learner's saved attempt on account change", () => {
    claimAttemptStorage("learner-a");
    ls.setItem("eduos.pyq.open", "{}");
    ls.setItem("eduos.pyq.answers.s1", '{"q":"A"}');
    claimAttemptStorage("learner-b");
    expect(ls.getItem("eduos.pyq.open")).toBeNull();
    expect(ls.getItem("eduos.pyq.answers.s1")).toBeNull();
    expect(ls.getItem(ATTEMPT_OWNER_KEY)).toBe("learner-b");
  });
  it("keeps the same learner's attempt", () => {
    claimAttemptStorage("learner-a");
    ls.setItem("eduos.pyq.answers.s1", "{}");
    claimAttemptStorage("learner-a");
    expect(ls.getItem("eduos.pyq.answers.s1")).toBe("{}");
  });
  it("sign-out clears everything but unrelated keys", () => {
    claimAttemptStorage("learner-a");
    ls.setItem("eduos.pyq.answers.s1", "{}");
    ls.setItem("other", "x");
    clearAttemptStorage();
    expect(ls.getItem("eduos.pyq.answers.s1")).toBeNull();
    expect(ls.getItem(ATTEMPT_OWNER_KEY)).toBeNull();
    expect(ls.getItem("other")).toBe("x");
  });
  it("no user means nothing restorable", () => {
    ls.setItem("eduos.pyq.open", "{}");
    expect(claimAttemptStorage(null)).toBe(false);
    expect(ls.getItem("eduos.pyq.open")).toBeNull();
  });
});
