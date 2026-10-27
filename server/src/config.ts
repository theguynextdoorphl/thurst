import 'dotenv/config';

const env = process.env;

if (env.NODE_ENV === 'production' && (!env.JWT_SECRET || env.JWT_SECRET === 'change-me')) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  isProduction: env.NODE_ENV === 'production',
  port: Number(env.PORT ?? 4000),
  jwtSecret: env.JWT_SECRET ?? 'dev-only-secret',
  databaseFile: env.DATABASE_FILE ?? './thurst.db',
  uploadDir: env.UPLOAD_DIR ?? './uploads',
  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
      }
    : null,
  mailFrom: env.MAIL_FROM ?? 'Thurst <no-reply@thurst.app>',
  /** How often the matcher looks for new pairs. */
  matchIntervalMs: Number(env.MATCH_INTERVAL_MS ?? 2000),
  /** After "Not Right Now", the same pair is not offered again for this long. */
  declineCooldownMs: 60 * 60 * 1000,
};
