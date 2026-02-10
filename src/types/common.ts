export type WithId<T> = T & { readonly id: string }

export type WithTimestamps<T> = T & {
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
