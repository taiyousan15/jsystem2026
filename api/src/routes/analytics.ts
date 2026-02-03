import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { analyzeKeywords, analyzeSentimentBatch } from '../services/analysis/index.js';

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

// GET /api/v1/analytics/summary/:accountId
analyticsRouter.get('/summary/:accountId', async (req: AuthRequest, res: Response) => {
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

  // Get follower metrics
  const metrics = await prisma.followerMetric.findMany({
    where: {
      accountId,
      recordedDate: {
        gte: startDate,
      },
    },
    orderBy: { recordedDate: 'asc' },
  });

  // Get posts for engagement calculation
  const posts = await prisma.post.findMany({
    where: {
      accountId,
      postedAt: {
        gte: startDate,
      },
    },
  });

  // Calculate follower growth
  let followerGrowth = 0;
  if (metrics.length >= 2) {
    followerGrowth = metrics[metrics.length - 1].followerCount - metrics[0].followerCount;
  }

  // Calculate engagement metrics
  let totalLikes = 0;
  let totalComments = 0;
  const latestFollowerCount = metrics[metrics.length - 1]?.followerCount || 0;

  posts.forEach((post) => {
    const engagement = post.engagement as { likes?: number; comments?: number } | null;
    totalLikes += engagement?.likes || 0;
    totalComments += engagement?.comments || 0;
  });

  const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
  const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;

  // Calculate engagement rate
  const totalEngagement = totalLikes + totalComments;
  const engagementRate =
    latestFollowerCount > 0 && posts.length > 0
      ? (totalEngagement / posts.length / latestFollowerCount) * 100
      : 0;

  // Find best performing day (mock data for now)
  const days_jp = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const topPerformingDay = days_jp[Math.floor(Math.random() * 7)];

  // Calculate reach trend (mock data for now)
  const reachTrend = Math.round((Math.random() - 0.3) * 20);

  res.json({
    success: true,
    data: {
      followerGrowth,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      avgLikes,
      avgComments,
      topPerformingDay,
      reachTrend,
    },
  });
});

// GET /api/v1/analytics/keywords/:accountId
analyticsRouter.get('/keywords/:accountId', async (req: AuthRequest, res: Response) => {
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

  const result = await analyzeKeywords(accountId, daysNum);

  res.json({
    success: true,
    data: result,
  });
});

// GET /api/v1/analytics/sentiment/:accountId
analyticsRouter.get('/sentiment/:accountId', async (req: AuthRequest, res: Response) => {
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

  const result = await analyzeSentimentBatch(accountId, daysNum);

  res.json({
    success: true,
    data: result,
  });
});
