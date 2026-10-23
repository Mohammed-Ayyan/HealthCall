import { z } from "zod";
import { Priority, Sentiment } from "@prisma/client";

export const PriorityEnum = z.nativeEnum(Priority, {
  errorMap: () => ({
    message: "priority must be one of: LOW, MEDIUM, HIGH, URGENT",
  }),
});

export const SentimentEnum = z.nativeEnum(Sentiment, {
  errorMap: () => ({
    message: "sentiment must be one of: POSITIVE, NEUTRAL, NEGATIVE, CRITICAL",
  }),
});

export const callIdParamSchema = z.object({
  id: z.string().uuid("Invalid Call ID format. Must be a valid UUID."),
});

export const createCallSchema = z
  .object({
    patientName: z.string().min(1, "patientName is required").max(255).optional(),
    patientPhone: z.string().min(1, "patientPhone is required").max(50).optional(),
    patientMrn: z.string().max(100).optional().nullable(),
    transcript: z.string().min(1, "transcript is required"),
    summary: z.string().min(1, "summary is required"),
    detectedIntent: z.string().min(1, "detectedIntent is required").max(100).optional(),
    priority: PriorityEnum,
    sentiment: SentimentEnum,
    callTimestamp: z.coerce.date().optional(),

    // Support snake_case aliases for convenience
    patient_name: z.string().min(1).max(255).optional(),
    patient_phone: z.string().min(1).max(50).optional(),
    patient_mrn: z.string().max(100).optional().nullable(),
    detected_intent: z.string().min(1).max(100).optional(),
    call_timestamp: z.coerce.date().optional(),
  })
  .transform((data) => {
    const patientName = data.patientName || data.patient_name;
    const patientPhone = data.patientPhone || data.patient_phone;
    const detectedIntent = data.detectedIntent || data.detected_intent;
    const patientMrn = data.patientMrn !== undefined ? data.patientMrn : data.patient_mrn;
    const callTimestamp = data.callTimestamp || data.call_timestamp || new Date();

    if (!patientName) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["patientName"],
          message: "patientName is required",
        },
      ]);
    }

    if (!patientPhone) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["patientPhone"],
          message: "patientPhone is required",
        },
      ]);
    }

    if (!detectedIntent) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["detectedIntent"],
          message: "detectedIntent is required",
        },
      ]);
    }

    return {
      patientName,
      patientPhone,
      patientMrn: patientMrn || null,
      transcript: data.transcript,
      summary: data.summary,
      detectedIntent,
      priority: data.priority,
      sentiment: data.sentiment,
      callTimestamp,
    };
  });

export const updateCallSchema = z
  .object({
    patientName: z.string().min(1).max(255).optional(),
    patientPhone: z.string().min(1).max(50).optional(),
    patientMrn: z.string().max(100).optional().nullable(),
    transcript: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    detectedIntent: z.string().min(1).max(100).optional(),
    priority: PriorityEnum.optional(),
    sentiment: SentimentEnum.optional(),
    callTimestamp: z.coerce.date().optional(),

    // snake_case aliases
    patient_name: z.string().min(1).max(255).optional(),
    patient_phone: z.string().min(1).max(50).optional(),
    patient_mrn: z.string().max(100).optional().nullable(),
    detected_intent: z.string().min(1).max(100).optional(),
    call_timestamp: z.coerce.date().optional(),
  })
  .transform((data) => {
    return {
      patientName: data.patientName || data.patient_name,
      patientPhone: data.patientPhone || data.patient_phone,
      patientMrn: data.patientMrn !== undefined ? data.patientMrn : data.patient_mrn,
      transcript: data.transcript,
      summary: data.summary,
      detectedIntent: data.detectedIntent || data.detected_intent,
      priority: data.priority,
      sentiment: data.sentiment,
      callTimestamp: data.callTimestamp || data.call_timestamp,
    };
  })
  .refine((data) => Object.values(data).some((val) => val !== undefined), {
    message: "At least one field must be provided to update",
  });

export const listCallsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    patientPhone: z.string().optional(),
    detectedIntent: z.string().optional(),
    priority: PriorityEnum.optional(),
    sentiment: SentimentEnum.optional(),

    // aliases
    patient_phone: z.string().optional(),
    detected_intent: z.string().optional(),
  })
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    patientPhone: data.patientPhone || data.patient_phone,
    detectedIntent: data.detectedIntent || data.detected_intent,
    priority: data.priority,
    sentiment: data.sentiment,
  }));

export type CreateCallDTO = z.infer<typeof createCallSchema>;
export type UpdateCallDTO = z.infer<typeof updateCallSchema>;
export type ListCallsQueryDTO = z.infer<typeof listCallsQuerySchema>;
