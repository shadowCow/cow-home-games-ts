import { z } from 'zod';

// ========================================
// Validation Errors
// ========================================

// Failure: Request validation failed
export const ValidationFailure = z.object({
  kind: z.literal('ValidationFailure'),
  message: z.string(),
});

export type ValidationFailure = z.infer<typeof ValidationFailure>;
