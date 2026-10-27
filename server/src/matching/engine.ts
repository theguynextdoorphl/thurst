import {
  CHAT_SECONDS, CHAT_WARNING_SECONDS, EV, REVIEW_SECONDS,
  type ChatMessage, type Decision, type MatchState, type SessionState,
} from '@thurst/shared';
import { newId } from '../auth.js';
import type { DB } from '../db.js';
import { getUser, reputationOf, toPublic } from '../users.js';
import { distanceMiles, pairUp, type Candidate } from './score.js';

type Emit = (userId: string, event: string, payload: unknown) => void;

interface Presence {
  sockets: Set<string>;
  available: boolean;
  coords: { lat: number; lng: number } | null;
  waitingSince: number;
}

interface LiveMatch {
  id: string;
  users: [string, string];
  phase: 'review' | 'chat';
  decisions: Map<string, Decision>;
  endsAt: number;
  timers: NodeJS.Timeout[];
  /** Chat messages live only in memory and are gone when the chat ends. */
  messages: ChatMessage[];
}

export interface EngineTiming {
  reviewMs: number;
  chatMs: number;
  warningMs: number;
  declineCooldownMs: number;
}

export const DEFAULT_TIMING: EngineTiming = {
  reviewMs: REVIEW_SECONDS * 1000,
  chatMs: CHAT_SECONDS * 1000,
  warningMs: CHAT_WARNING_SECONDS * 1000,
  declineCooldownMs: 60 * 60 * 1000,
};

/**
 * Owns who is online, who is in the queue, and every live match.
 * The database records match outcomes; the live state is in memory.
 */
export class MatchEngine {
  private presence = new Map<string, Presence>();
  private matches = new Map<string, LiveMatch>();
  private matchOf = new Map<string, string>();

  constructor(
    private db: DB,
    private emit: Emit,
    private timing: EngineTiming = DEFAULT_TIMING,
  ) {}

  // ---- presence -------------------------------------------------------------

  connect(userId: string, socketId: string) {
    const p = this.presence.get(userId) ?? { sockets: new Set(), available: false, coords: null, waitingSince: 0 };
    p.sockets.add(socketId);
    this.presence.set(userId, p);
    this.push(userId);
  }

  disconnect(userId: string, socketId: string) {
    const p = this.presence.get(userId);
    if (!p) return;
    p.sockets.delete(socketId);
    if (p.sockets.size > 0) return;
    // Offline means hidden: leave the queue and pass on any pending review.
    p.available = false;
    const m = this.liveMatchOf(userId);
    if (m?.phase === 'review') this.decline(m);
    if (!m) this.presence.delete(userId);
  }

  setAvailable(userId: string, available: boolean, coords?: { lat: number; lng: number }) {
    const p = this.presence.get(userId);
    if (!p) return;
    if (available && !coords && !p.coords) throw new Error('Location is needed to find matches near you');
    if (coords) p.coords = coords;
    if (available && !p.available) p.waitingSince = Date.now();
    p.available = available;
    if (!available) {
      const m = this.liveMatchOf(userId);
      if (m?.phase === 'review') this.decline(m);
    }
    this.push(userId);
  }

  updateLocation(userId: string, coords: { lat: number; lng: number }) {
    const p = this.presence.get(userId);
    if (p) p.coords = coords;
  }

  isAvailable(userId: string): boolean {
    return this.presence.get(userId)?.available ?? false;
  }

  /** Photos are private: only the owner and his current match can see them. */
  canSeePhotosOf(viewerId: string, ownerId: string): boolean {
    if (viewerId === ownerId) return true;
    const m = this.liveMatchOf(viewerId);
    return !!m && m.users.includes(ownerId);
  }

  // ---- matching -------------------------------------------------------------

  /** One round of matching over everyone waiting in the queue. */
  tick(now = Date.now()) {
    const pool: Candidate[] = [];
    for (const [id, p] of this.presence) {
      if (!p.available || !p.coords || this.matchOf.has(id)) continue;
      const u = getUser(this.db, id);
      if (!u) continue;
      const c = toPublic(this.db, u, null);
      pool.push({
        id,
        age: c.age,
        profile: c.profile,
        prefs: JSON.parse(u.preferences),
        lat: p.coords.lat,
        lng: p.coords.lng,
        reputation: reputationOf(this.db, id),
        waitingSince: p.waitingSince,
      });
    }
    if (pool.length < 2) return;
    for (const { a, b, score } of pairUp(pool, (x, y) => this.excluded(x, y, now), now)) {
      this.startReview(a.id, b.id, score, now);
    }
  }

  private excluded(a: string, b: string, now: number): boolean {
    const blocked = this.db
      .prepare(
        `SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      )
      .get(a, b, b, a);
    if (blocked) return true;
    const recentDecline = this.db
      .prepare(
        `SELECT 1 FROM matches WHERE phase = 'declined' AND created_at > ?
         AND ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?))`,
      )
      .get(now - this.timing.declineCooldownMs, a, b, b, a);
    if (recentDecline) return true;
    const neverAgain = this.db
      .prepare(
        `SELECT 1 FROM ratings WHERE match_again = 0
         AND ((rater_id = ? AND ratee_id = ?) OR (rater_id = ? AND ratee_id = ?))`,
      )
      .get(a, b, b, a);
    return !!neverAgain;
  }

  private startReview(a: string, b: string, score: number, now: number) {
    const m: LiveMatch = {
      id: newId(),
      users: [a, b],
      phase: 'review',
      decisions: new Map(),
      endsAt: now + this.timing.reviewMs,
      timers: [],
      messages: [],
    };
    this.db
      .prepare(`INSERT INTO matches (id, user_a, user_b, score, phase, created_at) VALUES (?, ?, ?, ?, 'review', ?)`)
      .run(m.id, a, b, score, now);
    this.matches.set(m.id, m);
    this.matchOf.set(a, m.id);
    this.matchOf.set(b, m.id);
    // Whoever hasn't answered when the window closes counts as "Not Right Now".
    m.timers.push(setTimeout(() => this.decline(m), this.timing.reviewMs));
    this.push(a);
    this.push(b);
  }

  decide(userId: string, matchId: string, decision: Decision) {
    const m = this.matches.get(matchId);
    if (!m || !m.users.includes(userId) || m.phase !== 'review') throw new Error('This match is no longer open');
    if (m.decisions.has(userId)) return;
    m.decisions.set(userId, decision);
    const column = m.users[0] === userId ? 'decision_a' : 'decision_b';
    this.db.prepare(`UPDATE matches SET ${column} = ? WHERE id = ?`).run(decision, m.id);

    if (decision === 'pass') return this.decline(m);
    if (m.decisions.size === 2) return this.startChat(m);
    this.push(userId);
  }

  /** Ends a review without a chat. Both users go back to the queue if still available. */
  private decline(m: LiveMatch) {
    if (!this.matches.has(m.id)) return;
    this.close(m);
    this.db.prepare(`UPDATE matches SET phase = 'declined', ended_at = ? WHERE id = ?`).run(Date.now(), m.id);
    for (const u of m.users) {
      const p = this.presence.get(u);
      if (p) p.waitingSince = Date.now();
      this.push(u);
    }
  }

  private startChat(m: LiveMatch) {
    for (const t of m.timers) clearTimeout(t);
    const now = Date.now();
    m.phase = 'chat';
    m.endsAt = now + this.timing.chatMs;
    m.timers = [
      setTimeout(() => {
        for (const u of m.users) this.emit(u, EV.warning, { matchId: m.id, message: '1 minute remaining in chat' });
      }, this.timing.warningMs),
      setTimeout(() => this.endChat(m), this.timing.chatMs),
    ];
    this.db.prepare(`UPDATE matches SET phase = 'chat', chat_started_at = ? WHERE id = ?`).run(now, m.id);
    for (const u of m.users) this.push(u);
  }

  send(userId: string, matchId: string, kind: ChatMessage['kind'], body: string) {
    const m = this.matches.get(matchId);
    if (!m || !m.users.includes(userId) || m.phase !== 'chat' || Date.now() >= m.endsAt) {
      throw new Error('This chat has ended');
    }
    const msg: ChatMessage = { id: newId(), matchId, senderId: userId, kind, body, createdAt: Date.now() };
    m.messages.push(msg);
    for (const u of m.users) this.emit(u, EV.message, msg);
  }

  /** Chat is over: no extensions. Both users leave the queue and are asked to rate. */
  private endChat(m: LiveMatch) {
    if (!this.matches.has(m.id)) return;
    this.close(m);
    this.db
      .prepare(`UPDATE matches SET phase = 'ended', ended_at = ?, message_count = ? WHERE id = ?`)
      .run(Date.now(), m.messages.length, m.id);
    for (const u of m.users) {
      const p = this.presence.get(u);
      if (p) p.available = false;
      this.push(u);
    }
  }

  /** Ends any live match for this user at once, e.g. after a block or account deletion. */
  abortFor(userId: string) {
    const m = this.liveMatchOf(userId);
    if (!m) return;
    if (m.phase === 'review') return this.decline(m);
    this.endChat(m);
  }

  forget(userId: string) {
    this.abortFor(userId);
    this.presence.delete(userId);
  }

  private close(m: LiveMatch) {
    for (const t of m.timers) clearTimeout(t);
    this.matches.delete(m.id);
    for (const u of m.users) {
      if (this.matchOf.get(u) === m.id) this.matchOf.delete(u);
      if (this.presence.get(u)?.sockets.size === 0) this.presence.delete(u);
    }
  }

  private liveMatchOf(userId: string): LiveMatch | undefined {
    const id = this.matchOf.get(userId);
    return id ? this.matches.get(id) : undefined;
  }

  // ---- state for clients ----------------------------------------------------

  stateFor(userId: string): SessionState {
    const m = this.liveMatchOf(userId);
    let match: MatchState | null = null;
    if (m) {
      const otherId = m.users.find((u) => u !== userId)!;
      match = {
        matchId: m.id,
        phase: m.phase,
        other: this.publicProfile(otherId, userId),
        endsAt: m.endsAt,
        myDecision: m.decisions.get(userId) ?? null,
        messages: m.phase === 'chat' ? m.messages : [],
      };
    }
    return { available: this.isAvailable(userId), match, pendingRating: match ? null : this.pendingRating(userId) };
  }

  private pendingRating(userId: string): SessionState['pendingRating'] {
    const row = this.db
      .prepare(
        `SELECT m.id, m.user_a, m.user_b FROM matches m
         WHERE m.phase = 'ended' AND m.chat_started_at IS NOT NULL AND m.ended_at > ?
           AND (m.user_a = ? OR m.user_b = ?)
           AND NOT EXISTS (SELECT 1 FROM ratings r WHERE r.match_id = m.id AND r.rater_id = ?)
         ORDER BY m.ended_at DESC LIMIT 1`,
      )
      .get(Date.now() - 24 * 60 * 60 * 1000, userId, userId, userId) as
      | { id: string; user_a: string; user_b: string }
      | undefined;
    if (!row) return null;
    const otherId = row.user_a === userId ? row.user_b : row.user_a;
    const other = getUser(this.db, otherId);
    if (!other) return null;
    // Photos are no longer shareable once the match is over.
    return { matchId: row.id, other: { ...toPublic(this.db, other, null), photos: [] } };
  }

  private publicProfile(otherId: string, viewerId: string) {
    const u = getUser(this.db, otherId)!;
    const a = this.presence.get(viewerId)?.coords;
    const b = this.presence.get(otherId)?.coords;
    return toPublic(this.db, u, a && b ? distanceMiles(a, b) : null);
  }

  /** Sends a user, and his live match if any, their current state. */
  refresh(userId: string) {
    this.push(userId);
    const m = this.liveMatchOf(userId);
    if (m) for (const u of m.users) if (u !== userId) this.push(u);
  }

  private push(userId: string) {
    this.emit(userId, EV.state, this.stateFor(userId));
  }

  stop() {
    for (const m of this.matches.values()) for (const t of m.timers) clearTimeout(t);
  }
}
