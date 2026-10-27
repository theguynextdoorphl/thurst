import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { MAX_PHOTOS, MIN_AGE } from '@thurst/shared';
import {
  ageFrom, hashCode, hashPassword, newId, passwordProblem, readRegistration, requireAuth,
  signRegistration, signSession, verifyPassword,
} from './auth.js';
import type { DB } from './db.js';
import { sendVerificationCode } from './mailer.js';
import type { MatchEngine } from './matching/engine.js';
import { getUser, photosOf, toMe, type UserRow } from './users.js';
import {
  emailSchema, locationSchema, preferencesSchema, profileSchema, ratingSchema, registerSchema,
  reportSchema, stripEmpty,
} from './validation.js';

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request');
  return result.data;
}

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export function createRoutes(db: DB, engine: MatchEngine, uploadDir: string, onUserChanged: (id: string) => void) {
  const r = express.Router();
  fs.mkdirSync(uploadDir, { recursive: true });

  const me = (req: Request): UserRow => {
    const u = getUser(db, req.userId!);
    if (!u) throw new HttpError(401, 'Account not found');
    return u;
  };

  // ---- registration and sign in ---------------------------------------------

  r.post('/auth/email/start', async (req, res) => {
    const email = parse(emailSchema, req.body?.email);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
    }
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    db.prepare(
      `INSERT INTO email_codes (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
    ).run(email, hashCode(code), Date.now() + CODE_TTL_MS);
    await sendVerificationCode(email, code);
    res.json({ ok: true });
  });

  r.post('/auth/email/verify', (req, res) => {
    const email = parse(emailSchema, req.body?.email);
    const code = parse(z.string().regex(/^\d{6}$/, 'Enter the 6 digit code'), req.body?.code);
    const row = db.prepare('SELECT * FROM email_codes WHERE email = ?').get(email) as
      | { code_hash: string; expires_at: number; attempts: number }
      | undefined;
    if (!row || row.expires_at < Date.now() || row.attempts >= MAX_CODE_ATTEMPTS) {
      throw new HttpError(400, 'That code has expired. Request a new one.');
    }
    if (row.code_hash !== hashCode(code)) {
      db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      throw new HttpError(400, 'That code is not right');
    }
    db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
    res.json({ registrationToken: signRegistration(email) });
  });

  r.post('/auth/register', async (req, res) => {
    const body = parse(registerSchema, req.body);
    const email = readRegistration(body.registrationToken);
    if (!email) throw new HttpError(400, 'Your email verification expired. Start again.');
    const problem = passwordProblem(body.password);
    if (problem) throw new HttpError(400, problem);
    if (ageFrom(body.birthdate) < MIN_AGE) throw new HttpError(403, `You must be ${MIN_AGE} or older to use Thurst`);
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(body.username)) {
      throw new HttpError(409, 'That username is taken');
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const id = newId();
    db.prepare(
      `INSERT INTO users (id, email, username, password_hash, birthdate, terms_accepted_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, email, body.username, await hashPassword(body.password), body.birthdate, Date.now(), Date.now());
    res.status(201).json({ token: signSession(id), me: toMe(db, getUser(db, id)!) });
  });

  r.post('/auth/login', async (req, res) => {
    const login = parse(z.string().trim().min(1, 'Enter your username or email'), req.body?.login);
    const password = parse(z.string().min(1, 'Enter your password'), req.body?.password);
    const u = db
      .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
      .get(login.toLowerCase(), login) as UserRow | undefined;
    if (!u || !(await verifyPassword(password, u.password_hash))) {
      throw new HttpError(401, 'Wrong username or password');
    }
    res.json({ token: signSession(u.id), me: toMe(db, u) });
  });

  // ---- my account -----------------------------------------------------------

  r.get('/me', requireAuth, (req, res) => {
    res.json(toMe(db, me(req)));
  });

  r.put('/me/location', requireAuth, (req, res) => {
    const { city, zip } = parse(locationSchema, req.body);
    db.prepare('UPDATE users SET city = ?, zip = ? WHERE id = ?').run(city, zip, req.userId!);
    res.json(toMe(db, me(req)));
  });

  r.put('/me/profile', requireAuth, (req, res) => {
    const profile = parse(profileSchema, stripEmpty(req.body ?? {}));
    db.prepare('UPDATE users SET profile = ? WHERE id = ?').run(JSON.stringify(profile), req.userId!);
    onUserChanged(req.userId!);
    res.json(toMe(db, me(req)));
  });

  r.put('/me/preferences', requireAuth, (req, res) => {
    const prefs = parse(preferencesSchema, stripEmpty(req.body ?? {}));
    db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(prefs), req.userId!);
    res.json(toMe(db, me(req)));
  });

  r.delete('/me', requireAuth, (req, res) => {
    engine.forget(req.userId!);
    for (const p of db.prepare('SELECT filename FROM photos WHERE user_id = ?').all(req.userId!) as {
      filename: string;
    }[]) {
      fs.rmSync(path.join(uploadDir, p.filename), { force: true });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.userId!);
    res.json({ ok: true });
  });

  // ---- photos ---------------------------------------------------------------

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${newId()}${file.mimetype === 'image/png' ? '.png' : '.jpg'}`),
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype)),
  });

  r.post('/me/photos', requireAuth, upload.single('photo'), (req, res) => {
    if (!req.file) throw new HttpError(400, 'Upload a JPEG or PNG photo');
    const count = (db.prepare('SELECT COUNT(*) AS n FROM photos WHERE user_id = ?').get(req.userId!) as { n: number })
      .n;
    if (count >= MAX_PHOTOS) {
      fs.rmSync(req.file.path, { force: true });
      throw new HttpError(400, `You can have up to ${MAX_PHOTOS} photos`);
    }
    // Automated content screening hooks in here before a photo goes live (Phase 2).
    db.prepare('INSERT INTO photos (id, user_id, filename, position) VALUES (?, ?, ?, ?)').run(
      newId(), req.userId!, req.file.filename, count,
    );
    onUserChanged(req.userId!);
    res.status(201).json(toMe(db, me(req)));
  });

  r.put('/me/photos/order', requireAuth, (req, res) => {
    const ids = parse(z.array(z.string()).max(MAX_PHOTOS), req.body?.ids);
    const mine = new Set(photosOf(db, req.userId!).map((p) => p.id));
    if (ids.length !== mine.size || !ids.every((id) => mine.has(id))) {
      throw new HttpError(400, 'Send every photo id exactly once');
    }
    const update = db.prepare('UPDATE photos SET position = ? WHERE id = ?');
    ids.forEach((id, i) => update.run(i, id));
    onUserChanged(req.userId!);
    res.json(toMe(db, me(req)));
  });

  r.delete('/me/photos/:id', requireAuth, (req, res) => {
    const row = db
      .prepare('SELECT filename FROM photos WHERE id = ? AND user_id = ?')
      .get(req.params.id as string, req.userId!) as { filename: string } | undefined;
    if (!row) throw new HttpError(404, 'Photo not found');
    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id as string);
    fs.rmSync(path.join(uploadDir, row.filename), { force: true });
    const update = db.prepare('UPDATE photos SET position = ? WHERE id = ?');
    photosOf(db, req.userId!).forEach((p, i) => update.run(i, p.id));
    onUserChanged(req.userId!);
    res.json(toMe(db, me(req)));
  });

  r.get('/photos/:id', requireAuth, (req, res) => {
    const row = db.prepare('SELECT user_id, filename FROM photos WHERE id = ?').get(req.params.id as string) as
      | { user_id: string; filename: string }
      | undefined;
    if (!row || !engine.canSeePhotosOf(req.userId!, row.user_id)) throw new HttpError(404, 'Photo not found');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.resolve(uploadDir, row.filename));
  });

  // ---- after a match --------------------------------------------------------

  r.post('/matches/:id/rating', requireAuth, (req, res) => {
    const body = parse(ratingSchema, req.body);
    const m = db
      .prepare(`SELECT * FROM matches WHERE id = ? AND phase = 'ended' AND chat_started_at IS NOT NULL`)
      .get(req.params.id as string) as { id: string; user_a: string; user_b: string } | undefined;
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) throw new HttpError(404, 'Match not found');
    const ratee = m.user_a === req.userId ? m.user_b : m.user_a;
    const result = db
      .prepare(
        `INSERT OR IGNORE INTO ratings (match_id, rater_id, ratee_id, stars, match_again, feedback, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(m.id, req.userId!, ratee, body.stars, body.matchAgain ? 1 : 0, body.feedback ?? null, Date.now());
    if (result.changes === 0) throw new HttpError(409, 'You already rated this match');
    onUserChanged(req.userId!);
    res.status(201).json({ ok: true });
  });

  r.post('/users/:id/block', requireAuth, (req, res) => {
    const other = req.params.id as string;
    if (other === req.userId || !getUser(db, other)) throw new HttpError(404, 'User not found');
    db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').run(
      req.userId!, other, Date.now(),
    );
    if (engine.canSeePhotosOf(req.userId!, other)) engine.abortFor(req.userId!);
    res.json({ ok: true });
  });

  r.post('/users/:id/report', requireAuth, (req, res) => {
    const other = req.params.id as string;
    const body = parse(reportSchema, req.body);
    if (other === req.userId || !getUser(db, other)) throw new HttpError(404, 'User not found');
    db.prepare(
      `INSERT INTO reports (id, reporter_id, reported_id, match_id, reason, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(newId(), req.userId!, other, body.matchId ?? null, body.reason, body.details ?? null, Date.now());
    res.status(201).json({ ok: true });
  });

  r.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return r;
}
