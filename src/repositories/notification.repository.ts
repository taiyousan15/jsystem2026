import { prisma } from '@/lib/db'
import type { Notification, Prisma } from '@prisma/client'

export const notificationRepository = {
  async getNotifications(
    userId: string,
    params: { page: number; limit: number; unreadOnly?: boolean }
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where = {
      userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    }
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ])
    return { notifications, total }
  },

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })
  },

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return result.count
  },

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  },

  async createNotification(data: {
    userId: string
    type: string
    title: string
    body: string
    metadata?: Prisma.InputJsonValue
  }): Promise<Notification> {
    return prisma.notification.create({ data })
  },
}
