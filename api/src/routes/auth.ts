import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const authRouter = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
});

const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  name: z.string().min(1, '名前を入力してください').max(100),
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { teamMembers: { include: { team: true } } },
  });

  if (!user) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'メールアドレスまたはパスワードが正しくありません'
    );
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      401,
      'ACCOUNT_LOCKED',
      `アカウントがロックされています。${user.lockedUntil.toLocaleString()}以降に再試行してください。`
    );
  }

  const isValidPassword = await bcrypt.compare(body.password, user.passwordHash);

  if (!isValidPassword) {
    // Increment failed attempts
    const failedAttempts = (user.failedAttempts || 0) + 1;

    if (failedAttempts >= 5) {
      // Lock account for 30 minutes
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      throw new AppError(
        401,
        'ACCOUNT_LOCKED',
        'アカウントがロックされました。30分後に再試行してください。'
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts },
    });

    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'メールアドレスまたはパスワードが正しくありません'
    );
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  // Get primary team
  const primaryTeam = user.teamMembers[0]?.team;

  // Generate tokens
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      teamId: primaryTeam?.id || null,
    },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    { expiresIn: '7d' }
  );

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      details: { ip: req.ip, userAgent: req.headers['user-agent'] },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    },
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// POST /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    throw new AppError(409, 'USER_EXISTS', 'このメールアドレスは既に登録されています');
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      role: 'MEMBER',
    },
  });

  // Create default team
  const team = await prisma.team.create({
    data: {
      name: `${body.name}のチーム`,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'ADMIN',
        },
      },
    },
  });

  res.status(201).json({
    message: 'ユーザーを登録しました',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError(400, 'MISSING_TOKEN', 'リフレッシュトークンが必要です');
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'default-refresh-secret'
    ) as { sub: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { teamMembers: { include: { team: true } } },
    });

    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
    }

    const primaryTeam = user.teamMembers[0]?.team;

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        teamId: primaryTeam?.id || null,
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', '無効なリフレッシュトークンです');
  }
});
