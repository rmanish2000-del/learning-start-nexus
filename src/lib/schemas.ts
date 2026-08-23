import { z } from "zod";

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{1,29}$/, "2–30 characters: lowercase letters, numbers, dot, dash, underscore");

export const pinSchema = z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits");

export const createLearnerSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(80),
  handle: handleSchema,
  pin: pinSchema,
  grade: z.number().int().min(1).max(12),
  subject: z.string().trim().min(2).max(60),
  educatorId: z.string().uuid().optional(),
});

export const createStaffUserSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["admin", "educator"]),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "educator", "student"]),
});

export const resetPinSchema = z.object({
  learnerId: z.string().uuid(),
  pin: pinSchema,
});

export const assignEducatorSchema = z.object({
  learnerId: z.string().uuid(),
  educatorId: z.string().uuid(),
});

// Sprint 2: assessment engine (Grade 6 · Mathematics · Fractions)
export const createAssessmentSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(120),
  description: z.string().trim().max(500).optional(),
  timeLimitMinutes: z.number().int().min(1).max(180).optional(),
  itemIds: z.array(z.string().uuid()).min(1, "Pick at least one question").max(50),
  publishNow: z.boolean(),
});

export const assignAssessmentSchema = z.object({
  assessmentId: z.string().uuid(),
  learnerIds: z.array(z.string().uuid()).min(1, "Pick at least one learner").max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const saveProgressSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z
    .record(z.string().uuid(), z.string().trim().max(200))
    .refine((o) => Object.keys(o).length <= 100, "Too many answers"),
  currentPosition: z.number().int().min(0).max(500),
});
