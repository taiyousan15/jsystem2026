import { prisma } from '@/lib/db'
import type { User, PointBalance } from '@prisma/client'

export const userRepository = {
  async findByClerkId(clerkId: string): Promise<(User & { pointBalance: PointBalance | null }) | null> {
    return prisma.user.findUnique({
      where: { clerkId },
      include: { pointBalance: true },
    })
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email } })
  },

  async create(data: {
    clerkId: string
    email: string
    displayName: string
    avatarUrl?: string
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        pointBalance: { create: {} },
        userStreak: { create: {} },
        notificationSettings: { create: {} },
      },
    })
  },

  async updateProfile(
    id: string,
    data: { displayName?: string; bio?: string; avatarUrl?: string }
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data })
  },

  async findMany(params: {
    page: number
    limit: number
    role?: string
  }): Promise<{ users: User[]; total: number }> {
    const where = params.role ? { role: params.role } : {}
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])
    return { users, total }
  },
}
