import crypto from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

/** At least 8 characters with a lowercase letter, an uppercase letter and a digit. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(password)) return 'Password needs a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password needs an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password needs a number';
  return null;
}

export function hashCode(code: string): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');
}

export function newId(): string {
  return crypto.randomUUID();
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'session' }, config.jwtSecret, { expiresIn: '30d' });
}

/** Proves the holder verified this email; lets them finish registration. */
export function signRegistration(email: string): string {
  return jwt.sign({ email, typ: 'register' }, config.jwtSecret, { expiresIn: '30m' });
}

export function readSession(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return payload.typ === 'session' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function readRegistration(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return payload.typ === 'register' && typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

export function ageFrom(birthdate: string, now = new Date()): number {
  const b = new Date(`${birthdate}T00:00:00Z`);
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const userId = header.startsWith('Bearer ') ? readSession(header.slice(7)) : null;
  if (!userId) return res.status(401).json({ error: 'Not signed in' });
  req.userId = userId;
  next();
}
