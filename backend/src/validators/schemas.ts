import { z } from "zod";

export const createCalculationSchema = z.object({
  groupName: z.string().min(1).max(80).transform((s) => s.trim()),
  participants: z
    .array(z.string().min(1).max(40).transform((s) => s.trim()))
    .min(1)
    .max(50),
});

export const addParticipantSchema = z.object({
  name: z.string().min(1).max(40).transform((s) => s.trim()),
});

export const upsertExpenseSchema = z.object({
  description: z.string().max(120).optional().default(""),
  amountCents: z.number().int().positive().max(1_000_000_00), // up to 1,000,000.00
  payerId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
});
