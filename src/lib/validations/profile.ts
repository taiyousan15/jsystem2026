import { z } from 'zod'

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
