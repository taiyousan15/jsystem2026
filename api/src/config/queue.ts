import { Queue, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const QUEUE_NAMES = {
  FOLLOWER_FETCH: 'follower-fetch',
  ENGAGEMENT_FETCH: 'engagement-fetch',
} as const

export const followerFetchQueue = new Queue(QUEUE_NAMES.FOLLOWER_FETCH, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const engagementFetchQueue = new Queue(QUEUE_NAMES.ENGAGEMENT_FETCH, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const followerQueueEvents = new QueueEvents(QUEUE_NAMES.FOLLOWER_FETCH, {
  connection: redisConnection,
})

export { redisConnection }
