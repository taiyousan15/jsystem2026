import { Router, Request, Response } from 'express'
import { scheduleFollowerFetchForAccount, scheduleFollowerFetchForAllAccounts } from '../services/scheduler'
import { followerFetchQueue } from '../config/queue'

export const jobsRouter = Router()

// Trigger follower fetch for a specific account
jobsRouter.post('/fetch-followers/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params
    const job = await scheduleFollowerFetchForAccount(accountId)

    res.json({
      success: true,
      message: 'Follower fetch job scheduled',
      jobId: job.id,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to schedule job' },
    })
  }
})

// Trigger follower fetch for all accounts
jobsRouter.post('/fetch-followers-all', async (req: Request, res: Response) => {
  try {
    await scheduleFollowerFetchForAllAccounts()

    res.json({
      success: true,
      message: 'Follower fetch jobs scheduled for all accounts',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to schedule jobs' },
    })
  }
})

// Get queue status
jobsRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      followerFetchQueue.getWaitingCount(),
      followerFetchQueue.getActiveCount(),
      followerFetchQueue.getCompletedCount(),
      followerFetchQueue.getFailedCount(),
    ])

    res.json({
      success: true,
      data: {
        queue: 'follower-fetch',
        waiting,
        active,
        completed,
        failed,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get queue status' },
    })
  }
})
