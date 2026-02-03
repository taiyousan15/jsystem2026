import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { z } from 'zod'

export const usersRouter = Router()

const updateProfileSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
})

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string().min(8, 'パスワードは8文字以上必要です'),
})

// GET /api/v1/users/profile
usersRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません')
  }

  res.json({
    success: true,
    user,
  })
})

// PATCH /api/v1/users/profile
usersRouter.patch('/profile', async (req: AuthRequest, res: Response) => {
  const body = updateProfileSchema.parse(req.body)

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name: body.name },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  res.json({
    success: true,
    user,
  })
})

// PATCH /api/v1/users/password
usersRouter.patch('/password', async (req: AuthRequest, res: Response) => {
  const body = updatePasswordSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  })

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません')
  }

  // Verify current password
  const isValid = await bcrypt.compare(body.currentPassword, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'INVALID_PASSWORD', '現在のパスワードが正しくありません')
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(body.newPassword, 12)

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash },
  })

  res.json({
    success: true,
    message: 'パスワードを変更しました',
  })
})
