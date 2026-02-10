type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (shouldLog('debug')) {
      process.stdout.write(JSON.stringify({ level: 'debug', message, data, timestamp: new Date().toISOString() }) + '\n')
    }
  },
  info(message: string, data?: unknown) {
    if (shouldLog('info')) {
      process.stdout.write(JSON.stringify({ level: 'info', message, data, timestamp: new Date().toISOString() }) + '\n')
    }
  },
  warn(message: string, data?: unknown) {
    if (shouldLog('warn')) {
      process.stderr.write(JSON.stringify({ level: 'warn', message, data, timestamp: new Date().toISOString() }) + '\n')
    }
  },
  error(message: string, error?: unknown) {
    if (shouldLog('error')) {
      process.stderr.write(JSON.stringify({ level: 'error', message, error: error instanceof Error ? error.message : error, timestamp: new Date().toISOString() }) + '\n')
    }
  },
}
