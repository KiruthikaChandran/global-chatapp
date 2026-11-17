import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db, { UserRow } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'relayroom_dev_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    profileImage: string;
    bio: string;
    createdAt: string;
  };
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded && typeof decoded.userId === 'number') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }

  const user = db
    .prepare(
      `SELECT id, full_name, username, email, profile_image, bio, created_at FROM users WHERE id = ?`
    )
    .get(payload.userId) as Omit<UserRow, 'password'> | undefined;

  if (!user) {
    res.status(401).json({ error: 'Authenticated user account no longer exists.' });
    return;
  }

  req.authUser = {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    profileImage: user.profile_image,
    bio: user.bio,
    createdAt: user.created_at,
  };

  next();
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
