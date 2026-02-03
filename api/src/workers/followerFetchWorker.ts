import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '../utils/prisma'
import { getSnsClient, FollowerFetchJobData } from '../services/sns'
import { QUEUE_NAMES } from '../config/queue'

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

async function processFollowerFetch(job: Job<FollowerFetchJobData>) {
  const { snsAccountId, platform, accountId } = job.data

  console.log(`[Worker] Processing follower fetch for ${accountId} (${platform})`)

  try {
    const client = getSnsClient(platform)
    const accountData = await client.getAccountData(accountId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert follower metric (one record per day)
    await prisma.followerMetric.upsert({
      where: {
        accountId_recordedDate: {
          accountId: snsAccountId,
          recordedDate: today,
        },
      },
      update: {
        followerCount: accountData.followerCount,
      },
      create: {
        accountId: snsAccountId,
        recordedDate: today,
        followerCount: accountData.followerCount,
      },
    })

    // Update display name if changed
    await prisma.snsAccount.update({
      where: { id: snsAccountId },
      data: {
        displayName: accountData.displayName,
        metadata: accountData.metadata,
      },
    })

    console.log(
      `[Worker] Successfully fetched ${accountData.followerCount} followers for ${accountId}`
    )

    return {
      success: true,
      followerCount: accountData.followerCount,
      accountId,
    }
  } catch (error) {
    console.error(`[Worker] Error fetching followers for ${accountId}:`, error)
    throw error
  }
}

export function startFollowerFetchWorker() {
  const worker = new Worker<FollowerFetchJobData>(
    QUEUE_NAMES.FOLLOWER_FETCH,
    processFollowerFetch,
    {
      connection: redisConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err)
  })

  console.log('[Worker] Follower fetch worker started')

  return worker
}
