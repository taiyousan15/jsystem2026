import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'

// Rate limiting configuration
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'リクエスト数が上限を超えました。しばらく待ってから再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Stricter rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: '認証リクエスト数が上限を超えました。しばらく待ってから再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
  )

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  next()
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential XSS vectors
        sanitized[key] = value
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .trim()
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value as Record<string, unknown>)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body)
  }

  next()
}

// SQL injection prevention (Prisma handles this, but extra validation)
export function validateInput(req: Request, res: Response, next: NextFunction) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
    /(--)|(\/\*)|(\*\/)/,
    /(;|\||\$|`)/,
  ]

  const checkValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return !sqlPatterns.some((pattern) => pattern.test(value))
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(checkValue)
    }
    return true
  }

  if (req.body && !checkValue(req.body)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: '不正な入力が検出されました',
      },
    })
  }

  if (req.query && !checkValue(req.query)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: '不正な入力が検出されました',
      },
    })
  }

  next()
}

// Request logging for audit
export function auditLog(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Audit]', JSON.stringify(logData))
    }
  })

  next()
}
