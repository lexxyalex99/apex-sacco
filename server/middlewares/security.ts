import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types';
import logger from '../services/logger';

const JWT_SECRET = process.env.JWT_SECRET || "apexsacco-fintech-jwt-key-2026";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
    memberId?: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Secure HTTPAccess: fallback and check request cookies
  if (!token && req.cookies) {
    token = req.cookies['sacco_session'];
  }

  if (!token) {
    logger.warn(`Unauthorized api attempt to requested endpoint: ${req.originalUrl}`);
    res.status(401).json({ error: "Access denied. Auth token required." });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
      fullName: string;
      memberId?: string;
    };
    req.user = verified;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      logger.info(`Expired session attempted by user: ${req.cookies?.userEmail || 'unknown'}`);
      res.status(401).json({ error: "Access token is expired.", code: "TOKEN_EXPIRED" });
      return;
    }
    logger.error('Token validation failed', { error: err.message });
    res.status(403).json({ error: "Access forbidden. Invalid authorization token." });
  }
};


export const requireRoles = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access Denied. Insufficient administrative permissions.` });
      return;
    }
    next();
  };
};
