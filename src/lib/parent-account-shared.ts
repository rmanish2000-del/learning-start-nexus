// Identity-first purchase flow — pure, client-safe contracts.
//
// Every parent purchase is owned by an authenticated user and a student
// profile. These schemas are the single validation surface for both the
// browser forms and the server functions.

import { z } from "zod";

// Pilot scope (P0): CBSE Class 10, Mathematics & Science only. Parent-facing
// surfaces must never offer a board or class the content packs do not cover.
export const PILOT_BOARD = "CBSE" as const;
export const PILOT_CLASS = 10 as const;
export const BOARDS = [PILOT_BOARD] as const;
export const CLASSES = [PILOT_CLASS] as const;


export const registerParentSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid mobile number"),
});

// Post-email-confirmation claim: the auth user already exists, so the mobile
// number may only be available from signup metadata (or not at all yet).
export const claimParentSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/)
    .optional(),
});

export const addStudentSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the student's name").max(80),
  grade: z.literal(PILOT_CLASS, {
    errorMap: () => ({ message: "The pilot covers CBSE Class 10 only" }),
  }),
  board: z.enum(BOARDS),
});


/** Parent-assisted student credential recovery: set or reset the 6-digit PIN. */
export const setStudentPinSchema = z.object({
  learnerId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/, "The PIN must be exactly 6 digits"),
});

export type ParentProfile = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
};

/** Operational state of a student profile from the parent's point of view. */
export type AssignmentStatus = "awaiting_assignment" | "assigned";

export type ParentStudent = {
  id: string;
  fullName: string;
  grade: number;
  board: string;
  subject: string;
  masteryScore: number;
  createdAt: string;
  /** Student sign-in handle (parents need it for handle/PIN recovery). */
  handle: string;
  /** True once a student login exists for this profile. */
  hasLogin: boolean;
  assignmentStatus: AssignmentStatus;
  educatorName: string | null;
};


export type ParentPurchase = {
  orderRef: string;
  purpose: string;
  status: string;
  amountPaise: number;
  subject: string | null;
  unitTitle: string | null;
  studentId: string | null;
  studentName: string | null;
  accessToken: string | null;
  sessionStatus: "not_started" | "in_progress" | "submitted";
  scorePct: number | null;
  paidAt: string | null;
  createdAt: string;
};

export type ParentAccount = {
  profile: ParentProfile;
  students: ParentStudent[];
  purchases: ParentPurchase[];
};

/** The four conditions Razorpay order creation is gated on. */
export type PurchaseGuard = {
  authenticated: boolean;
  parentExists: boolean;
  studentExists: boolean;
  studentSelected: boolean;
};

export function guardPassed(guard: PurchaseGuard): boolean {
  return guard.authenticated && guard.parentExists && guard.studentExists && guard.studentSelected;
}
