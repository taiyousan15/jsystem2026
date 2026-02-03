import { Router, Response } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'
import { AppError } from '../middleware/errorHandler.js'
import { z } from 'zod'

export const reportsRouter = Router()

const createReportSchema = z.object({
  accountIds: z.array(z.string()).min(1, 'アカウントを選択してください'),
  format: z.enum(['PDF', 'EXCEL']),
  dateRange: z.string(),
})

// GET /api/v1/reports
reportsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const reports = await prisma.report.findMany({
    where: {
      userId: req.user!.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json({
    success: true,
    data: reports,
  })
})

// POST /api/v1/reports
reportsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = createReportSchema.parse(req.body)

  const report = await prisma.report.create({
    data: {
      userId: req.user!.userId,
      teamId: req.user!.teamId,
      format: body.format,
      status: 'PENDING',
      parameters: {
        accountIds: body.accountIds,
        dateRange: body.dateRange,
      },
    },
  })

  // In a real implementation, this would trigger a background job
  // For now, we'll simulate report generation
  setTimeout(async () => {
    try {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'PROCESSING',
        },
      })

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 3000))

      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileUrl: `/reports/${report.id}.${body.format.toLowerCase()}`,
        },
      })
    } catch (error) {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
        },
      })
    }
  }, 1000)

  res.status(201).json({
    success: true,
    data: report,
  })
})

// GET /api/v1/reports/:id
reportsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const report = await prisma.report.findFirst({
    where: {
      id,
      userId: req.user!.userId,
    },
  })

  if (!report) {
    throw new AppError(404, 'REPORT_NOT_FOUND', 'レポートが見つかりません')
  }

  res.json({
    success: true,
    data: report,
  })
})

// DELETE /api/v1/reports/:id
reportsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const report = await prisma.report.findFirst({
    where: {
      id,
      userId: req.user!.userId,
    },
  })

  if (!report) {
    throw new AppError(404, 'REPORT_NOT_FOUND', 'レポートが見つかりません')
  }

  await prisma.report.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'レポートを削除しました',
  })
})
