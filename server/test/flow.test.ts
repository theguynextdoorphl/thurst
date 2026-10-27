import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { EV, type ChatMessage, type SessionState } from '@thurst/shared';
import { createServer } from '../src/app.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thurst-'));
const srv = createServer({
  databaseFile: path.join(dir, 'test.db'),
  uploadDir: path.join(dir, 'uploads'),
  matchIntervalMs: 50,
  timing: { reviewMs: 400, chatMs: 600, warningMs: 300, declineCooldownMs: 60_000 },
});
let base = '';
const codes = new Map<string, string>();
const realLog = console.log;

before(async () => {
  console.log = (...args: unknown[]) => {
    const m = String(args[0]).match(/verification code for (\S+): (\d{6})/);
    if (m) codes.set(m[1]!, m[2]!);
    else realLog(...args);
  };
  await new Promise<void>((r) => srv.server.listen(0, r));
  base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;
});

after(async () => {
  console.log = realLog;
  await srv.close();
  srv.server.close();
});

async function call(method: string, url: string, body?: unknown, token?: string) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function register(username: string, birthdate = '1990-01-01') {
  const email = `${username}@example.com`;
  const started = await call('POST', '/auth/email/start', { email });
  assert.equal(started.status, 200);
  // No email service in tests, so the server hands the code back for the app to show.
  assert.equal(started.body.devCode, codes.get(email));
  const wrong = await call('POST', '/auth/email/verify', { email, code: '000000' === codes.get(email) ? '111111' : '000000' });
  assert.equal(wrong.status, 400);
  const verified = await call('POST', '/auth/email/verify', { email, code: codes.get(email) });
  assert.equal(verified.status, 200);
  const res = await call('POST', '/auth/register', {
    registrationToken: verified.body.registrationToken,
    username,
    password: 'Secret123',
    birthdate,
    acceptTerms: true,
  });
  return res;
}

interface Client {
  socket: Socket;
  states: SessionState[];
  messages: ChatMessage[];
  warnings: unknown[];
  next: (pred: (s: SessionState) => boolean) => Promise<SessionState>;
  emit: (ev: string, data: unknown) => Promise<any>;
}

async function connect(token: string): Promise<Client> {
  const socket = io(base, { auth: { token }, transports: ['websocket'] });
  const c: Client = {
    socket,
    states: [],
    messages: [],
    warnings: [],
    next: (pred) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timed out waiting for state')), 3000);
        const check = (s: SessionState) => {
          if (pred(s)) {
            clearTimeout(t);
            socket.off(EV.state, check);
            resolve(s);
          }
        };
        socket.on(EV.state, check);
      }),
    emit: (ev, data) => new Promise((r) => socket.emit(ev, data, r)),
  };
  socket.on(EV.state, (s) => c.states.push(s));
  socket.on(EV.message, (m) => c.messages.push(m));
  socket.on(EV.warning, (w) => c.warnings.push(w));
  await new Promise<void>((r, reject) => {
    socket.on('connect', () => r());
    socket.on('connect_error', reject);
  });
  return c;
}

const NYC = { lat: 40.7128, lng: -74.006 };
const NEARBY = { lat: 40.72, lng: -74.0 };

test('registration rules', async () => {
  const minor = await register('kiddo', new Date().toISOString().slice(0, 10));
  assert.equal(minor.status, 403);
  const ok = await register('alpha');
  assert.equal(ok.status, 201);
  assert.equal(ok.body.me.username, 'alpha');
  assert.equal((await call('POST', '/auth/email/start', { email: 'alpha@example.com' })).status, 409);
  const login = await call('POST', '/auth/login', { login: 'alpha', password: 'Secret123' });
  assert.equal(login.status, 200);
  assert.equal((await call('POST', '/auth/login', { login: 'alpha', password: 'nope' })).status, 401);
});

test('profile validation rejects unknown options and drops blanks', async () => {
  const { body } = await register('bravo');
  const bad = await call('PUT', '/me/profile', { position: 'Upside Down' }, body.token);
  assert.equal(bad.status, 400);
  const good = await call('PUT', '/me/profile', { position: 'Top', smoker: '', likes: [] }, body.token);
  assert.equal(good.status, 200);
  assert.deepEqual(good.body.profile, { position: 'Top' });
});

test('full match flow: review, decline, rematch, chat, warning, rating', async () => {
  const a = (await register('top_guy')).body;
  const b = (await register('bottom_guy')).body;
  const c = (await register('third_guy')).body;
  await call('PUT', '/me/profile', { position: 'Top', likes: ['Kissing'] }, a.token);
  await call('PUT', '/me/profile', { position: 'Bottom', likes: ['Kissing'] }, b.token);
  await call('PUT', '/me/profile', { position: 'Top' }, c.token);
  // c only wants bottoms, so he can only ever match b.
  await call('PUT', '/me/preferences', { positions: ['Bottom'] }, c.token);

  const ca = await connect(a.token);
  const cb = await connect(b.token);

  // Going available needs a location.
  assert.match((await ca.emit(EV.setAvailable, { available: true })).error, /Location/);

  const aReview = ca.next((s) => s.match?.phase === 'review');
  const bReview = cb.next((s) => s.match?.phase === 'review');
  await ca.emit(EV.setAvailable, { available: true, coords: NYC });
  await cb.emit(EV.setAvailable, { available: true, coords: NEARBY });
  const [sa, sb] = await Promise.all([aReview, bReview]);
  assert.equal(sa.match!.matchId, sb.match!.matchId);
  assert.equal(sa.match!.other.username, 'bottom_guy');
  assert.ok(sa.match!.other.distanceMiles! >= 1);

  // b says Not Right Now: both go back to the queue with the match gone.
  const aBack = ca.next((s) => s.match === null && s.available);
  await cb.emit(EV.decide, { matchId: sb.match!.matchId, decision: 'pass' });
  await aBack;

  // c joins; the a/b pair is on cooldown, so b gets c.
  const cc = await connect(c.token);
  const bReview2 = cb.next((s) => s.match?.phase === 'review');
  await cc.emit(EV.setAvailable, { available: true, coords: NYC });
  const sb2 = await bReview2;
  assert.equal(sb2.match!.other.username, 'third_guy');

  // Nobody answers: the review window expires and counts as a pass.
  await cb.next((s) => s.match === null);

  // Both say Hook Me Up -> chat.
  // a and b are on cooldown, so a fresh user d is the one a gets.
  cc.socket.disconnect();
  const d = (await register('delta_guy')).body;
  await call('PUT', '/me/profile', { position: 'Bottom' }, d.token);
  const cd = await connect(d.token);
  cb.socket.disconnect();
  const aReview3 = ca.next((s) => s.match?.phase === 'review');
  await cd.emit(EV.setAvailable, { available: true, coords: NEARBY });
  const sa3 = await aReview3;
  const matchId = sa3.match!.matchId;
  assert.equal(sa3.match!.other.username, 'delta_guy');

  const aChat = ca.next((s) => s.match?.phase === 'chat');
  const dChat = cd.next((s) => s.match?.phase === 'chat');
  await ca.emit(EV.decide, { matchId, decision: 'hook' });
  assert.equal(ca.states.at(-1)!.match!.myDecision, 'hook');
  await cd.emit(EV.decide, { matchId, decision: 'hook' });
  await Promise.all([aChat, dChat]);

  assert.deepEqual(await ca.emit(EV.send, { matchId, kind: 'text', body: 'hey, host?' }), { ok: true });
  assert.deepEqual(await cd.emit(EV.send, { matchId, kind: 'location', body: NEARBY }), { ok: true });
  assert.ok((await cd.emit(EV.send, { matchId: 'nope', kind: 'text', body: 'x' })).error);

  const aEnded = ca.next((s) => s.match === null && s.pendingRating?.matchId === matchId);
  const sEnded = await aEnded;
  assert.equal(sEnded.available, false, 'chat end takes you out of the queue');
  assert.equal(ca.messages.length, 2);
  assert.equal(ca.warnings.length, 1, 'one-minute warning was sent');
  assert.ok((await ca.emit(EV.send, { matchId, kind: 'text', body: 'too late' })).error);

  const rating = await call('POST', `/matches/${matchId}/rating`, { stars: 5, matchAgain: false }, a.token);
  assert.equal(rating.status, 201);
  assert.equal(
    (await call('POST', `/matches/${matchId}/rating`, { stars: 5, matchAgain: true }, a.token)).status,
    409,
  );
  // Messages are not stored, only counted.
  const row = srv.db.prepare('SELECT message_count FROM matches WHERE id = ?').get(matchId) as any;
  assert.equal(row.message_count, 2);

  ca.socket.disconnect();
  cd.socket.disconnect();
});

test('photos are private outside a match', async () => {
  const e = (await register('echo_guy')).body;
  const form = new FormData();
  // Smallest valid PNG.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  form.append('photo', new Blob([png], { type: 'image/png' }), 'p.png');
  const up = await fetch(`${base}/me/photos`, { method: 'POST', headers: { authorization: `Bearer ${e.token}` }, body: form });
  assert.equal(up.status, 201);
  const me = (await up.json()) as any;
  const url = me.photos[0].url;
  assert.equal((await fetch(base + url, { headers: { authorization: `Bearer ${e.token}` } })).status, 200);
  const f = (await register('foxtrot_guy')).body;
  assert.equal((await fetch(base + url, { headers: { authorization: `Bearer ${f.token}` } })).status, 404);
});
