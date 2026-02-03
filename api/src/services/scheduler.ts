import { followerFetchQueue } from '../config/queue'
import { prisma } from '../utils/prisma'
import { FollowerFetchJobData, SnsPlatform } from './sns'

export async function scheduleFollowerFetchForAllAccounts() {
  console.log('[Scheduler] Scheduling follower fetch for all accounts...')

  const accounts = await prisma.snsAccount.findMany({
    select: {
      id: true,
      platform: true,
      accountId: true,
    },
  })

  console.log(`[Scheduler] Found ${accounts.length} accounts to process`)

  for (const account of accounts) {
    const jobData: FollowerFetchJobData = {
      snsAccountId: account.id,
      platform: account.platform as SnsPlatform,
      accountId: account.accountId,
    }

    await followerFetchQueue.add(`fetch-${account.id}`, jobData, {
      jobId: `follower-${account.id}-${new Date().toISOString().slice(0, 10)}`,
    })
  }

  console.log(`[Scheduler] Scheduled ${accounts.length} follower fetch jobs`)
}

export async function scheduleFollowerFetchForAccount(accountId: string) {
  const account = await prisma.snsAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      platform: true,
      accountId: true,
    },
  })

  if (!account) {
    throw new Error(`Account not found: ${accountId}`)
  }

  const jobData: FollowerFetchJobData = {
    snsAccountId: account.id,
    platform: account.platform as SnsPlatform,
    accountId: account.accountId,
  }

  const job = await followerFetchQueue.add(`fetch-${account.id}`, jobData)

  console.log(`[Scheduler] Scheduled follower fetch job ${job.id} for ${account.accountId}`)

  return job
}

// Start periodic scheduling (runs every 6 hours)
export function startPeriodicScheduler() {
  const SIX_HOURS = 6 * 60 * 60 * 1000

  // Run immediately on startup
  scheduleFollowerFetchForAllAccounts().catch(console.error)

  // Then run every 6 hours
  setInterval(() => {
    scheduleFollowerFetchForAllAccounts().catch(console.error)
  }, SIX_HOURS)

  console.log('[Scheduler] Periodic scheduler started (every 6 hours)')
}
