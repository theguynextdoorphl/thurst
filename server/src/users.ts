import type { MatchPreferences, Me, Photo, Profile, PublicProfile } from '@thurst/shared';
import { ageFrom } from './auth.js';
import type { DB } from './db.js';

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  birthdate: string;
  city: string | null;
  zip: string | null;
  profile: string;
  preferences: string;
}

export function getUser(db: DB, id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function photosOf(db: DB, userId: string): Photo[] {
  const rows = db
    .prepare('SELECT id, position FROM photos WHERE user_id = ? ORDER BY position')
    .all(userId) as { id: string; position: number }[];
  return rows.map((r) => ({ id: r.id, position: r.position, url: `/photos/${r.id}` }));
}

export function toMe(db: DB, u: UserRow): Me {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    age: ageFrom(u.birthdate),
    city: u.city,
    zip: u.zip,
    profile: JSON.parse(u.profile) as Profile,
    preferences: JSON.parse(u.preferences) as MatchPreferences,
    photos: photosOf(db, u.id),
  };
}

export function toPublic(db: DB, u: UserRow, distanceMiles: number | null): PublicProfile {
  return {
    id: u.id,
    username: u.username,
    age: ageFrom(u.birthdate),
    // Rounded so exact location can't be triangulated.
    distanceMiles: distanceMiles === null ? null : Math.max(1, Math.round(distanceMiles)),
    profile: JSON.parse(u.profile) as Profile,
    photos: photosOf(db, u.id),
  };
}

/** Average stars a user has received, or null if never rated. */
export function reputationOf(db: DB, userId: string): number | null {
  const row = db.prepare('SELECT AVG(stars) AS avg FROM ratings WHERE ratee_id = ?').get(userId) as {
    avg: number | null;
  };
  return row.avg;
}
