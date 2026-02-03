import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    teamId: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as {
      sub: string;
      email: string;
      role: string;
      teamId: string;
    };

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      teamId: decoded.teamId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています',
        },
      });
    }

    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: '無効なトークンです',
      },
    });
  }
};
