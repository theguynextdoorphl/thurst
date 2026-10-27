import type { MatchPreferences, Profile } from '@thurst/shared';

export interface Candidate {
  id: string;
  age: number;
  profile: Profile;
  prefs: MatchPreferences;
  lat: number;
  lng: number;
  /** Average stars this user has received, or null if never rated. */
  reputation: number | null;
  waitingSince: number;
}

const DEFAULT_RADIUS_MILES = 25;
const KM_PER_MILE = 1.609344;

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

export function radiusMiles(prefs: MatchPreferences): number {
  if (!prefs.distance) return DEFAULT_RADIUS_MILES;
  return prefs.distanceUnit === 'km' ? prefs.distance / KM_PER_MILE : prefs.distance;
}

/** An unanswered field passes a list filter; an answer outside the list fails it. */
function passes<T>(wanted: T[] | undefined, actual: T | undefined): boolean {
  return !wanted?.length || actual === undefined || wanted.includes(actual);
}

/** Does `seeker` accept `other` under his filters? */
export function accepts(seeker: Candidate, other: Candidate, miles: number): boolean {
  const p = seeker.prefs;
  const o = other.profile;
  if (miles > radiusMiles(p)) return false;
  if (p.ageMin !== undefined && other.age < p.ageMin) return false;
  if (p.ageMax !== undefined && other.age > p.ageMax) return false;
  if (!passes(p.bodyTypes, o.bodyType)) return false;
  if (!passes(p.positions, o.position)) return false;
  if (!passes(p.smoker, o.smoker)) return false;
  if (!passes(p.drinker, o.drinker)) return false;
  if (!passes(p.drugUse, o.drugUse)) return false;
  if (!passes(p.hivStatuses, o.hivStatus)) return false;
  if (!passes(p.hostTravel, o.hostTravel)) return false;
  if (p.mustHaveLikes?.length && !p.mustHaveLikes.every((l) => o.likes?.includes(l))) return false;
  return true;
}

const RAW = 'Raw - Bareback Only';
const CONDOMS = 'Safely - Condoms Are a Must';

function saferSexClash(a: Profile, b: Profile): boolean {
  return (a.saferSex === RAW && b.saferSex === CONDOMS) || (a.saferSex === CONDOMS && b.saferSex === RAW);
}

const TOPNESS: Record<string, number> = { Top: 1, 'Vers Top': 0.75, Versatile: 0.5, 'Vers Bottom': 0.25, Bottom: 0 };

export function positionFit(a?: string, b?: string): number {
  if (!a || !b) return 0.5;
  if (a === 'Side' || b === 'Side') return a === b ? 1 : 0.4;
  return 1 - Math.abs(TOPNESS[a]! + TOPNESS[b]! - 1);
}

function hostFit(a?: string, b?: string): number {
  if (!a || !b) return 0.5;
  if (a.startsWith('Either') || b.startsWith('Either')) return 0.8;
  return a === b ? 0.2 : 1;
}

function likesFit(a?: string[], b?: string[]): number {
  if (!a?.length || !b?.length) return 0.5;
  const shared = a.filter((l) => b.includes(l)).length;
  return shared / Math.min(a.length, b.length);
}

/**
 * Compatibility score from 0 to 100, or null when the pair must not be matched.
 * Hard filters come from both users' preferences; the rest is a weighted blend.
 */
export function scorePair(a: Candidate, b: Candidate, now = Date.now()): number | null {
  const miles = distanceMiles(a, b);
  if (!accepts(a, b, miles) || !accepts(b, a, miles)) return null;
  if (saferSexClash(a.profile, b.profile)) return null;

  const maxMiles = Math.min(radiusMiles(a.prefs), radiusMiles(b.prefs));
  const proximity = 1 - Math.min(miles / maxMiles, 1);
  const position = positionFit(a.profile.position, b.profile.position);
  const likes = likesFit(a.profile.likes, b.profile.likes);
  const host = hostFit(a.profile.hostTravel, b.profile.hostTravel);
  const reputation = ((a.reputation ?? 3.5) + (b.reputation ?? 3.5)) / 10;
  const oldestWait = Math.max(now - a.waitingSince, now - b.waitingSince);
  const patience = Math.min(oldestWait / (5 * 60_000), 1);

  const score =
    0.3 * proximity + 0.2 * position + 0.15 * likes + 0.1 * host + 0.15 * reputation + 0.1 * patience;
  return Math.round(score * 1000) / 10;
}

/**
 * Pairs up as many candidates as possible, best scores first.
 * `excluded` vetoes pairs because of blocks or recent history.
 */
export function pairUp(
  pool: Candidate[],
  excluded: (a: string, b: string) => boolean,
  now = Date.now(),
): { a: Candidate; b: Candidate; score: number }[] {
  const options: { a: Candidate; b: Candidate; score: number }[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i]!;
      const b = pool[j]!;
      if (excluded(a.id, b.id)) continue;
      const score = scorePair(a, b, now);
      if (score !== null) options.push({ a, b, score });
    }
  }
  options.sort((x, y) => y.score - x.score);
  const taken = new Set<string>();
  const pairs = [];
  for (const o of options) {
    if (taken.has(o.a.id) || taken.has(o.b.id)) continue;
    taken.add(o.a.id);
    taken.add(o.b.id);
    pairs.push(o);
  }
  return pairs;
}
