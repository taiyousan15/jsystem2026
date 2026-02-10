import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['group_consult', 'offline_event', 'special']),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: z.string().max(500).optional(),
  onlineUrl: z.string().url().optional(),
  capacity: z.number().int().min(1),
  milesReward: z.number().int().min(0).default(0),
  isPaid: z.boolean().default(false),
  price: z.number().int().min(0).optional(),
  tierRequired: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
