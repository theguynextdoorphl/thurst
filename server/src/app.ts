import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
import { EV } from '@thurst/shared';
import { readSession } from './auth.js';
import { openDb } from './db.js';
import { DEFAULT_TIMING, MatchEngine, type EngineTiming } from './matching/engine.js';
import { createRoutes } from './routes.js';
import { getUser } from './users.js';
import { coordsSchema } from './validation.js';

export interface ServerOptions {
  databaseFile: string;
  uploadDir: string;
  matchIntervalMs: number;
  timing?: Partial<EngineTiming>;
}

const availabilitySchema = z.object({ available: z.boolean(), coords: coordsSchema.optional() });
const decideSchema = z.object({ matchId: z.string(), decision: z.enum(['hook', 'pass']) });
const sendSchema = z.discriminatedUnion('kind', [
  z.object({ matchId: z.string(), kind: z.literal('text'), body: z.string().trim().min(1).max(1000) }),
  z.object({ matchId: z.string(), kind: z.literal('location'), body: coordsSchema }),
]);

export function createServer(opts: ServerOptions) {
  const db = openDb(opts.databaseFile);
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  const engine = new MatchEngine(
    db,
    (userId, event, payload) => io.to(`user:${userId}`).emit(event, payload),
    { ...DEFAULT_TIMING, ...opts.timing },
  );

  // Auth is a bearer token, not a cookie, so any origin may call the API (needed for the web build).
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return void res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(createRoutes(db, engine, opts.uploadDir, (id) => engine.refresh(id)));

  io.use((socket, next) => {
    const userId = readSession(String(socket.handshake.auth?.token ?? ''));
    if (!userId || !getUser(db, userId)) return next(new Error('unauthorized'));
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    engine.connect(userId, socket.id);

    // Every handler answers with an ack: { ok: true } or { error }.
    const handle =
      <T extends z.ZodType>(schema: T, fn: (data: z.infer<T>) => void) =>
      (raw: unknown, ack?: (res: unknown) => void) => {
        const parsed = schema.safeParse(raw);
        try {
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid request');
          fn(parsed.data);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ error: (err as Error).message });
        }
      };

    socket.on(EV.setAvailable, handle(availabilitySchema, (d) => engine.setAvailable(userId, d.available, d.coords)));
    socket.on(EV.updateLocation, handle(coordsSchema, (d) => engine.updateLocation(userId, d)));
    socket.on(EV.decide, handle(decideSchema, (d) => engine.decide(userId, d.matchId, d.decision)));
    socket.on(
      EV.send,
      handle(sendSchema, (d) =>
        engine.send(userId, d.matchId, d.kind, typeof d.body === 'string' ? d.body : JSON.stringify(d.body)),
      ),
    );
    socket.on('disconnect', () => engine.disconnect(userId, socket.id));
  });

  const interval = setInterval(() => engine.tick(), opts.matchIntervalMs);

  return {
    server,
    engine,
    db,
    close: async () => {
      clearInterval(interval);
      engine.stop();
      await io.close();
      db.close();
    },
  };
}
