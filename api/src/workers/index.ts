import { startFollowerFetchWorker } from './followerFetchWorker'
import { startPeriodicScheduler } from '../services/scheduler'

export function startWorkers() {
  // Start workers
  const followerWorker = startFollowerFetchWorker()

  // Start scheduler
  startPeriodicScheduler()

  console.log('[Workers] All workers started')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Workers] Shutting down workers...')
    await followerWorker.close()
    console.log('[Workers] Workers stopped')
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return { followerWorker }
}
