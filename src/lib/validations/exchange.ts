import { z } from 'zod'

export const createExchangeSchema = z.object({
  catalogItemId: z.string().uuid(),
  shippingAddressId: z.string().uuid().optional(),
})

export const shippingAddressSchema = z.object({
  recipientName: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{3}-?\d{4}$/),
  prefecture: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  addressLine: z.string().min(1).max(500),
  phone: z.string().regex(/^0\d{9,10}$/),
  isDefault: z.boolean().optional(),
})

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>
