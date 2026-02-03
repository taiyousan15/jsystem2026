import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const accountRouter = Router();

const createAccountSchema = z.object({
  platform: z.enum(['X', 'INSTAGRAM', 'TIKTOK']),
  accountId: z.string().min(1, 'アカウントIDを入力してください'),
});

// GET /api/v1/accounts
accountRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const accounts = await prisma.snsAccount.findMany({
    where: { teamId: req.user!.teamId },
    orderBy: { createdAt: 'desc' },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });

  const total = await prisma.snsAccount.count({
    where: { teamId: req.user!.teamId },
  });

  res.json({
    data: accounts,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// POST /api/v1/accounts
accountRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = createAccountSchema.parse(req.body);

  // Check team account limit (50 per team)
  const accountCount = await prisma.snsAccount.count({
    where: { teamId: req.user!.teamId },
  });

  if (accountCount >= 50) {
    throw new AppError(
      400,
      'ACCOUNT_LIMIT_REACHED',
      'チームあたりの登録上限（50アカウント）に達しています'
    );
  }

  // Check for duplicate
  const existing = await prisma.snsAccount.findFirst({
    where: {
      teamId: req.user!.teamId,
      platform: body.platform,
      accountId: body.accountId,
    },
  });

  if (existing) {
    throw new AppError(409, 'ACCOUNT_EXISTS', 'このアカウントは既に登録されています');
  }

  // TODO: Validate account exists on platform via API
  // For now, we'll skip validation and add it directly

  const account = await prisma.snsAccount.create({
    data: {
      teamId: req.user!.teamId,
      platform: body.platform,
      accountId: body.accountId,
      displayName: body.accountId, // Will be updated by data fetch job
      metadata: {},
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'ACCOUNT_REGISTER',
      details: { accountId: account.id, platform: body.platform },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    },
  });

  res.status(201).json({
    message: 'アカウントを登録しました',
    data: account,
  });
});

// DELETE /api/v1/accounts/:id
accountRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const account = await prisma.snsAccount.findFirst({
    where: {
      id,
      teamId: req.user!.teamId,
    },
  });

  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'アカウントが見つかりません');
  }

  await prisma.snsAccount.delete({
    where: { id },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'ACCOUNT_DELETE',
      details: { accountId: id, platform: account.platform },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    },
  });

  res.json({ success: true });
});
