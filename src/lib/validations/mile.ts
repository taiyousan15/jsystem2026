import { z } from 'zod'

export const earnMilesSchema = z.object({
  actionCode: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
})

export const adjustMilesSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
})

export type EarnMilesInput = z.infer<typeof earnMilesSchema>
export type AdjustMilesInput = z.infer<typeof adjustMilesSchema>
