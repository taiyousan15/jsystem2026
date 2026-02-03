import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const analyticsRouter = Router();

// GET /api/v1/analytics/followers/:accountId
analyticsRouter.get('/followers/:accountId', async (req: AuthRequest, res: Response) => {
  const { accountId } = req.params;
  const { days = '90' } = req.query;
  const daysNum = parseInt(days as string, 10);

  // Verify account belongs to user's team
  const account = await prisma.snsAccount.findFirst({
    where: {
      id: accountId,
      teamId: req.user!.teamId,
    },
  });

  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'アカウントが見つかりません');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  const metrics = await prisma.followerMetric.findMany({
    where: {
      accountId,
      recordedDate: {
        gte: startDate,
      },
    },
    orderBy: { recordedDate: 'asc' },
  });

  // Calculate daily changes
  const data = metrics.map((m, i) => {
    const prev = i > 0 ? metrics[i - 1].followerCount : m.followerCount;
    return {
      date: m.recordedDate.toISOString().split('T')[0],
      count: m.followerCount,
      change: m.followerCount - prev,
    };
  });

  res.json({
    accountId,
    period: `${daysNum}days`,
    data,
  });
});

// GET /api/v1/analytics/engagement/:accountId
analyticsRouter.get('/engagement/:accountId', async (req: AuthRequest, res: Response) => {
  const { accountId } = req.params;
  const { days = '30' } = req.query;
  const daysNum = parseInt(days as string, 10);

  // Verify account belongs to user's team
  const account = await prisma.snsAccount.findFirst({
    where: {
      id: accountId,
      teamId: req.user!.teamId,
    },
  });

  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'アカウントが見つかりません');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  const posts = await prisma.post.findMany({
    where: {
      accountId,
      postedAt: {
        gte: startDate,
      },
    },
    orderBy: { postedAt: 'desc' },
  });

  // Get follower metrics for engagement calculation
  const followerMetrics = await prisma.followerMetric.findMany({
    where: {
      accountId,
      recordedDate: {
        gte: startDate,
      },
    },
    orderBy: { recordedDate: 'desc' },
  });

  const latestFollowerCount = followerMetrics[0]?.followerCount || 0;

  const data = posts.map((post) => {
    const engagement = post.engagement as {
      likes?: number;
      comments?: number;
      shares?: number;
    } | null;

    const likes = engagement?.likes || 0;
    const comments = engagement?.comments || 0;
    const shares = engagement?.shares || 0;
    const total = likes + comments + shares;

    // Calculate engagement rate
    const rate =
      latestFollowerCount > 0
        ? ((total / latestFollowerCount) * 100).toFixed(2)
        : 'N/A';

    return {
      postId: post.id,
      postedAt: post.postedAt.toISOString(),
      likes,
      comments,
      shares,
      engagementRate: rate,
    };
  });

  // Calculate average engagement rate
  const validRates = data
    .filter((d) => d.engagementRate !== 'N/A')
    .map((d) => parseFloat(d.engagementRate as string));

  const averageRate =
    validRates.length > 0
      ? (validRates.reduce((a, b) => a + b, 0) / validRates.length).toFixed(2)
      : 'N/A';

  res.json({
    accountId,
    period: `${daysNum}days`,
    averageEngagementRate: averageRate,
    posts: data,
  });
});
