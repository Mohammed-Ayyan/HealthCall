import { z } from "zod";

export const evaluateRoutingSchema = z.object({
  intent: z.string().min(1, "intent is required"),
  priority: z.string().optional(),
  sentiment: z.string().optional(),
});

export type EvaluateRoutingDTO = z.infer<typeof evaluateRoutingSchema>;
