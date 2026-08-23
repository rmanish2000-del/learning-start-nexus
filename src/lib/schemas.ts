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
